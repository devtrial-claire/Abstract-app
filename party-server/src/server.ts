// import type * as Party from "partykit/server";

// export default class Server implements Party.Server {
//   constructor(readonly room: Party.Room) {}

//   onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
//     // A websocket just connected!
//     console.log(
//       `Connected:
//   id: ${conn.id}
//   room: ${this.room.id}
//   url: ${new URL(ctx.request.url).pathname}`
//     );

//     // let's send a message to the connection
//     conn.send("hello from server");
//   }

//   onMessage(message: string, sender: Party.Connection) {
//     // let's log the message
//     console.log(`connection ${sender.id} sent message: ${message}`);
//     // as well as broadcast it to all the other connections in the room...
//     this.room.broadcast(
//       `${sender.id}: ${message}`,
//       // ...except for the connection it came from
//       [sender.id]
//     );
//   }
// }

// Server satisfies Party.Worker;
// src/server.ts
// server.ts

import type * as Party from "partykit/server";

export default class GameServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Store game state
  games = new Map<string, GameState>();
  connections = new Set<Party.Connection>();

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A new websocket connection is established
    this.connections.add(conn);
    conn.send(JSON.stringify({ type: "connected" }));
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
          this.handleCreateGame(sender);
          break;
        case "join-game":
          this.handleJoinGame(msg.gameId, sender);
          break;
        case "game-state":
          this.handleGetGameState(msg.gameId, sender);
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

  private handleCreateGame(sender: Party.Connection) {
    const gameId = this.generateGameId();
    const gameState: GameState = {
      id: gameId,
      status: "waiting-for-players",
      players: [sender.id],
      cards: [],
      balances: { [sender.id]: 25 },
    };

    this.games.set(gameId, gameState);
    sender.send(
      JSON.stringify({
        type: "game-created",
        gameId,
        status: gameState.status,
      })
    );

    // Broadcast to all connections that a new game is available
    this.broadcastGameList();
  }

  private handleJoinGame(gameId: string, sender: Party.Connection) {
    const game = this.games.get(gameId);
    if (!game) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game not found",
        })
      );
      return;
    }

    if (game.players.length >= 2) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game is full",
        })
      );
      return;
    }

    // Add player to game
    game.players.push(sender.id);
    game.balances[sender.id] = 25;

    // If we have 2 players, start the game
    if (game.players.length === 2) {
      game.status = "in-progress";
      game.cards = this.generateCards();
      this.determineWinner(game);
    }

    // Notify all players
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
    const openGames = this.getOpenGames();
    this.room.broadcast(
      JSON.stringify({
        type: "game-list-updated",
        games: openGames,
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

  private getOpenGames() {
    return Array.from(this.games.values())
      .filter((game) => game.status === "waiting-for-players")
      .map((game) => ({ id: game.id, status: game.status }));
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
