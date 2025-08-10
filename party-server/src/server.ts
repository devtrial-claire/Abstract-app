import type * as Party from "partykit/server";

export default class GameServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Store game state
  games = new Map<string, GameState>();
  connections = new Set<Party.Connection>();

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A new websocket connection is established
    this.connections.add(conn);
    conn.send(JSON.stringify({ type: "connected", id: conn.id }));
    // send current open games to just-connected client
    conn.send(
      JSON.stringify({
        type: "game-list-updated",
        games: this.getGames(),
      })
    );
  }

  onClose(conn: Party.Connection) {
    // Remove connection when closed
    this.connections.delete(conn);
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      // Skip ping/pong messages
      if (message === "ping" || message === "pong") return;

      // Handle incoming messages
      const msg = JSON.parse(message);

      switch (msg.type) {
        case "create-game":
          this.handleCreateGame(sender, msg.senderId);
          break;
        case "join-game":
          this.handleJoinGame(msg.gameId, sender, msg.senderId);
          break;
        case "game-state":
          this.handleGetGameState(msg.gameId, sender);
          break;
        case "get-games":
          sender.send(
            JSON.stringify({
              type: "game-list-updated",
              games: this.getGames(),
            })
          );
          break;
        case "reveal-winner":
          this.handleRevealWinner(msg.gameId);
          break;
        default:
          console.warn("Unknown message type:", msg.type);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  }

  private handleCreateGame(sender: Party.Connection, senderId?: string) {
    const pid = senderId ?? sender.id;

    // Check if this wallet address already has an active game
    for (const game of this.games.values()) {
      if (
        game.players.includes(pid) &&
        game.status !== "1st_player_won" &&
        game.status !== "2nd_player_won" &&
        game.status !== "draw"
      ) {
        sender.send(
          JSON.stringify({
            type: "error",
            message:
              "You already have an active game. Please finish your current game first.",
          })
        );
        return;
      }
    }

    const gameId = this.generateGameId();
    const gameState: GameState = {
      id: gameId,
      status: "waiting-for-players",
      players: [pid],
      cards: [],
      balances: { [pid]: 25 },
    };

    this.games.set(gameId, gameState);
    sender.send(
      JSON.stringify({ type: "game-created", gameId, status: gameState.status })
    );
    this.broadcastGameList();
  }

  private handleJoinGame(
    gameId: string,
    sender: Party.Connection,
    senderId?: string
  ) {
    const game = this.games.get(gameId);
    if (!game)
      return sender.send(
        JSON.stringify({ type: "error", message: "Game not found" })
      );

    const pid = senderId ?? sender.id;

    // Check if this wallet address is already in this game
    if (game.players.includes(pid)) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "You are already in this game",
        })
      );
      return;
    }

    // Check if this wallet address already has another active game
    for (const otherGame of this.games.values()) {
      if (
        otherGame.id !== gameId &&
        otherGame.players.includes(pid) &&
        otherGame.status !== "1st_player_won" &&
        otherGame.status !== "2nd_player_won" &&
        otherGame.status !== "draw"
      ) {
        sender.send(
          JSON.stringify({
            type: "error",
            message:
              "You already have an active game. Please finish your current game first.",
          })
        );
        return;
      }
    }

    if (game.players.length >= 2)
      return sender.send(
        JSON.stringify({ type: "error", message: "Game is full" })
      );

    game.players.push(pid);
    game.balances[pid] = 25;

    if (game.players.length >= 2) {
      game.status = "in-progress";
      game.cards = this.generateCards();
      this.broadcastGameUpdate(gameId);
      this.broadcastGameList();
      return;
    }
    this.broadcastGameUpdate(gameId);
  }

  private handleGetGameState(gameId: string, sender: Party.Connection) {
    const game = this.games.get(gameId);
    if (game) {
      sender.send(
        JSON.stringify({
          type: "game-state",
          gameState: game,
        })
      );
    }
  }

  private handleRevealWinner(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    // compute winner from the already-generated cards
    this.determineWinner(game);
    this.broadcastGameUpdate(gameId); // clients update to X_player_won / draw
  }

  private generateGameId(): string {
    return crypto.randomUUID();
  }

  private generateCards(): PokemonCard[][] {
    // Generate random cards for both players
    const allCards = [
      { name: "pikachu", values: [1, 2, 5] },
      { name: "chemander", values: [10, 17] },
      { name: "foo", values: [11] },
    ];

    const player1Cards = [];
    const player2Cards = [];

    for (let i = 0; i < 5; i++) {
      const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
      const randomValue =
        randomCard.values[Math.floor(Math.random() * randomCard.values.length)];
      player1Cards.push(`${randomCard.name}#${randomValue}`);

      const randomCard2 = allCards[Math.floor(Math.random() * allCards.length)];
      const randomValue2 =
        randomCard2.values[
          Math.floor(Math.random() * randomCard2.values.length)
        ];
      player2Cards.push(`${randomCard2.name}#${randomValue2}`);
    }

    return [player1Cards, player2Cards];
  }

  private determineWinner(game: GameState) {
    if (!game.cards || game.cards.length === 0) return;

    const [player1Cards, player2Cards] = game.cards;
    const player1Total = player1Cards.reduce(
      (sum, card) => sum + parseInt(card.split("#")[1]),
      0
    );
    const player2Total = player2Cards.reduce(
      (sum, card) => sum + parseInt(card.split("#")[1]),
      0
    );

    if (player1Total > player2Total) {
      game.status = "1st_player_won";
      game.winner = game.players[0];
    } else if (player2Total > player1Total) {
      game.status = "2nd_player_won";
      game.winner = game.players[1];
    } else {
      game.status = "draw";
    }
  }

  private broadcastGameList() {
    const games = this.getGames();
    this.room.broadcast(
      JSON.stringify({
        type: "game-list-updated",
        games: games,
      })
    );
  }

  private broadcastGameUpdate(gameId: string) {
    const game = this.games.get(gameId);
    if (game) {
      this.room.broadcast(
        JSON.stringify({
          type: "game-updated",
          gameId,
          gameState: game,
        })
      );
    }
  }

  private getGames() {
    return Array.from(this.games.values()).map((g) => ({
      id: g.id,
      status: g.status,
    }));
  }
}

// Type definitions
interface GameState {
  id: string;
  status:
    | "waiting-for-players"
    | "in-progress"
    | "1st_player_won"
    | "2nd_player_won"
    | "draw";
  players: string[];
  cards: PokemonCard[][];
  balances: Record<string, number>;
  winner?: string;
}

type PokemonCard = string;
