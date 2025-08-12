import type * as Party from "partykit/server";

export default class GameServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Store game state
  games = new Map<string, GameState>();
  connections = new Set<Party.Connection>();

  // Store wallet balances and transaction history
  walletBalances = new Map<string, number>();
  transactionHistory = new Map<string, any[]>();

  // Store rematch requests
  rematchRequests = new Map<string, Set<string>>();

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

    // Clean up any rematch requests from this player
    for (const [gameId, rematchSet] of this.rematchRequests.entries()) {
      if (rematchSet.has(conn.id)) {
        rematchSet.delete(conn.id);

        // If no more rematch requests for this game, remove the entry
        if (rematchSet.size === 0) {
          this.rematchRequests.delete(gameId);
        }

        // Broadcast updated game state
        this.broadcastGameUpdate(gameId);
      }
    }
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
        case "get-active-games":
          sender.send(
            JSON.stringify({
              type: "active-games-updated",
              games: this.getActiveGames(),
            })
          );
          break;
        case "get-finished-games":
          sender.send(
            JSON.stringify({
              type: "finished-games-updated",
              games: this.getFinishedGames(),
            })
          );
          break;
        case "get-wallet":
          this.handleGetWalletBalance(sender, msg.senderId);
          break;
        case "reveal-winner":
          this.handleRevealWinner(msg.gameId);
          break;
        case "request-rematch":
          this.handleRematchRequest(msg.gameId, sender, msg.senderId);
          break;
        case "accept-rematch":
          this.handleAcceptRematch(msg.gameId, sender, msg.senderId);
          break;
        case "cancel-game":
          this.handleCancelGame(msg.gameId, sender, msg.senderId);
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

    // Initialize wallet if this is a new user
    this.initializeWallet(pid);

    // Check if player has enough balance
    const currentBalance = this.walletBalances.get(pid) || 1000;
    if (currentBalance < 25) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Insufficient balance. You need $25 to create a game.",
        })
      );
      return;
    }

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
            currentGameId: game.id,
            currentGameStatus: game.status,
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
      createdAt: new Date(),
    };

    // Deduct $25 from wallet
    this.walletBalances.set(pid, currentBalance - 25);

    // Add transaction record
    const transaction = {
      id: Date.now().toString(),
      type: "game_played",
      amount: -25,
      gameId: gameId,
      timestamp: new Date(),
      description: "Created New Battle",
    };

    if (!this.transactionHistory.has(pid)) {
      this.transactionHistory.set(pid, []);
    }
    this.transactionHistory.get(pid)!.unshift(transaction);

    this.games.set(gameId, gameState);

    // Send success message with updated balance
    sender.send(
      JSON.stringify({
        type: "game-created",
        gameId,
        status: gameState.status,
        newBalance: this.walletBalances.get(pid),
      })
    );

    // Broadcast updated game lists to all clients
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

    // Check if game is already finished
    if (
      game.status === "1st_player_won" ||
      game.status === "2nd_player_won" ||
      game.status === "draw"
    ) {
      return sender.send(
        JSON.stringify({
          type: "error",
          message: "Cannot join finished game. Game status: " + game.status,
        })
      );
    }

    const pid = senderId ?? sender.id;

    // Initialize wallet if this is a new user
    this.initializeWallet(pid);

    // Check if player has enough balance
    const currentBalance = this.walletBalances.get(pid) || 1000;
    if (currentBalance < 25) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Insufficient balance. You need $25 to join a game.",
        })
      );
      return;
    }

    // Check if this wallet address is already in this game
    if (game.players.includes(pid)) {
      sender.send(
        JSON.stringify({
          type: "game-joined",
          gameId: gameId,
          status: game.status,
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
            currentGameId: otherGame.id,
            currentGameStatus: otherGame.status,
          })
        );
        return;
      }
    }

    if (game.players.length >= 2)
      return sender.send(
        JSON.stringify({ type: "error", message: "Game is full" })
      );

    // Deduct $25 from wallet
    this.walletBalances.set(pid, currentBalance - 25);

    // Add transaction record
    const transaction = {
      id: Date.now().toString(),
      type: "game_played",
      amount: -25,
      gameId: gameId,
      timestamp: new Date(),
      description: "Joined Battle",
    };

    if (!this.transactionHistory.has(pid)) {
      this.transactionHistory.set(pid, []);
    }
    this.transactionHistory.get(pid)!.unshift(transaction);

    game.players.push(pid);
    game.balances[pid] = 25;

    // Send success message with updated balance
    sender.send(
      JSON.stringify({
        type: "game-joined",
        gameId: gameId,
        status: game.status,
        newBalance: this.walletBalances.get(pid),
      })
    );

    if (game.players.length >= 2) {
      game.status = "in-progress";
      game.cards = this.generateCards();
      this.broadcastGameUpdate(gameId);
      return;
    }

    // Broadcast updated game lists to all clients
    this.broadcastGameList();
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
      { name: "chemander", values: [3, 4] },
      { name: "foo", values: [6] },
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
      game.loser = game.players[1];
      // Handle wallet transfers for winner
      this.handleGameResult(game.winner, game.loser);
    } else if (player2Total > player1Total) {
      game.status = "2nd_player_won";
      game.winner = game.players[1];
      game.loser = game.players[0];
      // Handle wallet transfers for winner
      this.handleGameResult(game.winner, game.loser);
    } else {
      game.status = "draw";
      // Handle draw - both players get their $25 back
      this.handleDrawResult(game.players[0], game.players[1]);
    }
  }

  private handleGameResult(winner: string, loser: string) {
    // Winner gets the opponent's $25 (total gain: $25)
    const winnerBalance = this.walletBalances.get(winner) || 1000;
    this.walletBalances.set(winner, winnerBalance + 50);

    // Loser keeps their $25 (they already paid it when joining)
    // No additional deduction needed

    // Add transaction records
    const winnerTransaction = {
      id: Date.now().toString(),
      type: "game_won",
      amount: 25 + 25,
      gameId: "game-result",
      timestamp: new Date(),
      description: "Won Battle - Earned opponent's $25",
    };

    const loserTransaction = {
      id: Date.now().toString(),
      type: "game_lost",
      amount: 0, // No additional loss, they already paid $25
      gameId: "game-result",
      timestamp: new Date(),
      description: "Lost Battle - $25 already deducted",
    };

    // Add to transaction history
    if (!this.transactionHistory.has(winner)) {
      this.transactionHistory.set(winner, []);
    }
    if (!this.transactionHistory.has(loser)) {
      this.transactionHistory.set(loser, []);
    }

    this.transactionHistory.get(winner)!.unshift(winnerTransaction);
    this.transactionHistory.get(loser)!.unshift(loserTransaction);

    // Broadcast wallet updates to both players
    this.broadcastWalletUpdate(winner);
    this.broadcastWalletUpdate(loser);
  }

  private handleDrawResult(player1: string, player2: string) {
    // Both players get their $25 back since it's a draw
    const player1Balance = this.walletBalances.get(player1) || 1000;
    const player2Balance = this.walletBalances.get(player2) || 1000;

    this.walletBalances.set(player1, player1Balance + 25);
    this.walletBalances.set(player2, player2Balance + 25);

    // Add transaction records for both players
    const player1Transaction = {
      id: Date.now().toString(),
      type: "game_draw",
      amount: 25,
      gameId: "game-result",
      timestamp: new Date(),
      description: "Draw Battle - $25 refunded",
    };

    const player2Transaction = {
      id: Date.now().toString(),
      type: "game_draw",
      amount: 25,
      gameId: "game-result",
      timestamp: new Date(),
      description: "Draw Battle - $25 refunded",
    };

    // Add to transaction history
    if (!this.transactionHistory.has(player1)) {
      this.transactionHistory.set(player1, []);
    }
    if (!this.transactionHistory.has(player2)) {
      this.transactionHistory.set(player2, []);
    }

    this.transactionHistory.get(player1)!.unshift(player1Transaction);
    this.transactionHistory.get(player2)!.unshift(player2Transaction);

    // Broadcast wallet updates to both players
    this.broadcastWalletUpdate(player1);
    this.broadcastWalletUpdate(player2);
  }

  private handleRematchRequest(
    gameId: string,
    sender: Party.Connection,
    senderId?: string
  ) {
    const game = this.games.get(gameId);
    if (!game) return;

    const playerId = senderId ?? sender.id;

    // Check if the player is part of this game
    if (!game.players.includes(playerId)) return;

    // Initialize rematch requests for this game if not exists
    if (!this.rematchRequests.has(gameId)) {
      this.rematchRequests.set(gameId, new Set());
    }

    // Add this player's rematch request
    this.rematchRequests.get(gameId)!.add(playerId);

    // Notify all players in the game about the rematch request
    this.broadcastGameUpdate(gameId);

    // Check if both players have requested rematch
    const rematchSet = this.rematchRequests.get(gameId)!;
    if (rematchSet.size === 2) {
      // Both players agreed to rematch, create new game
      this.createRematchGame(game);
    }
  }

  private handleAcceptRematch(
    gameId: string,
    sender: Party.Connection,
    senderId?: string
  ) {
    // For now, treat accept-rematch the same as request-rematch
    // Both players need to request/accept for a rematch to happen
    this.handleRematchRequest(gameId, sender, senderId);
  }

  private createRematchGame(originalGame: GameState) {
    // Check if both players have sufficient balance for rematch
    const player1Balance =
      this.walletBalances.get(originalGame.players[0]) || 1000;
    const player2Balance =
      this.walletBalances.get(originalGame.players[1]) || 1000;

    if (player1Balance < 25 || player2Balance < 25) {
      // One or both players don't have sufficient balance
      this.room.broadcast(
        JSON.stringify({
          type: "rematch-failed",
          originalGameId: originalGame.id,
          reason: "insufficient_balance",
          player1Balance,
          player2Balance,
        })
      );

      // Clear the rematch requests
      this.rematchRequests.delete(originalGame.id);
      return;
    }

    // Deduct $25 from both players' wallets for the rematch
    this.walletBalances.set(originalGame.players[0], player1Balance - 25);
    this.walletBalances.set(originalGame.players[1], player2Balance - 25);

    // Add transaction records for both players
    const player1Transaction = {
      id: Date.now().toString(),
      type: "rematch_played",
      amount: -25,
      gameId: "rematch-game",
      timestamp: new Date(),
      description: "Rematch Battle - $25 deducted",
    };

    const player2Transaction = {
      id: Date.now().toString(),
      type: "rematch_played",
      amount: -25,
      gameId: "rematch-game",
      timestamp: new Date(),
      description: "Rematch Battle - $25 deducted",
    };

    // Add to transaction history
    if (!this.transactionHistory.has(originalGame.players[0])) {
      this.transactionHistory.set(originalGame.players[0], []);
    }
    if (!this.transactionHistory.has(originalGame.players[1])) {
      this.transactionHistory.set(originalGame.players[1], []);
    }

    this.transactionHistory
      .get(originalGame.players[0])!
      .unshift(player1Transaction);
    this.transactionHistory
      .get(originalGame.players[1])!
      .unshift(player2Transaction);
    // Create a new game with the same players
    const newGameId = this.generateGameId();
    const newCards = this.generateCards();

    const newGame: GameState = {
      id: newGameId,
      status: "in-progress", // Start immediately since both players are ready
      players: [...originalGame.players], // Copy the players
      cards: newCards,
      balances: {
        [originalGame.players[0]]: 25,
        [originalGame.players[1]]: 25,
      }, // Set new balances for the rematch game
      createdAt: new Date(),
    };

    // Add the new game to the games map
    this.games.set(newGameId, newGame);

    // Clear the rematch requests for the original game
    this.rematchRequests.delete(originalGame.id);

    // Broadcast the new game to all players
    this.room.broadcast(
      JSON.stringify({
        type: "rematch-game-created",
        originalGameId: originalGame.id,
        newGameId: newGameId,
        gameState: newGame,
      })
    );

    // Broadcast wallet updates to both players
    this.broadcastWalletUpdate(originalGame.players[0]);
    this.broadcastWalletUpdate(originalGame.players[1]);

    // Also broadcast updated game lists
    this.broadcastGameList();
  }

  private handleCancelGame(
    gameId: string,
    sender: Party.Connection,
    senderId?: string
  ) {
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

    const pid = senderId ?? sender.id;

    // Only the game creator can cancel the game
    if (game.players[0] !== pid) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Only the game creator can cancel the game",
        })
      );
      return;
    }

    // Only allow cancellation if the game is still waiting for players
    if (game.status !== "waiting-for-players") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Cannot cancel game that has already started",
        })
      );
      return;
    }

    // Only allow cancellation if there's only one player
    if (game.players.length > 1) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Cannot cancel game after opponent has joined",
        })
      );
      return;
    }

    // Refund the $25 to the game creator
    const currentBalance = this.walletBalances.get(pid) || 0;
    this.walletBalances.set(pid, currentBalance + 25);

    // Add refund transaction record
    const transaction = {
      id: Date.now().toString(),
      type: "game_cancelled",
      amount: 25,
      gameId: gameId,
      timestamp: new Date(),
      description: "Game Cancelled - Refund",
    };

    if (!this.transactionHistory.has(pid)) {
      this.transactionHistory.set(pid, []);
    }
    this.transactionHistory.get(pid)!.unshift(transaction);

    // Remove the game
    this.games.delete(gameId);

    // Send success message with updated balance
    sender.send(
      JSON.stringify({
        type: "game-cancelled",
        gameId,
        newBalance: this.walletBalances.get(pid),
        message:
          "Game cancelled successfully. $25 has been refunded to your account.",
      })
    );

    // Broadcast updated game lists to all clients
    this.broadcastGameList();
  }

  private broadcastGameList() {
    const allGames = this.getGames();
    const activeGames = this.getActiveGames();
    const finishedGames = this.getFinishedGames();

    this.room.broadcast(
      JSON.stringify({
        type: "game-list-updated",
        games: allGames,
      })
    );

    this.room.broadcast(
      JSON.stringify({
        type: "active-games-updated",
        games: activeGames,
      })
    );

    this.room.broadcast(
      JSON.stringify({
        type: "finished-games-updated",
        games: finishedGames,
      })
    );
  }

  private broadcastGameUpdate(gameId: string) {
    const game = this.games.get(gameId);
    if (game) {
      // Check if there are rematch requests for this game
      const rematchRequests = this.rematchRequests.get(gameId);
      const rematchData = rematchRequests
        ? {
            rematchRequests: Array.from(rematchRequests),
            canRematch: rematchRequests.size === 2,
          }
        : null;

      this.room.broadcast(
        JSON.stringify({
          type: "game-updated",
          gameId,
          gameState: game,
          rematchData,
        })
      );

      // Also broadcast updated game lists
      this.broadcastGameList();
    }
  }

  private getGames() {
    // Return all games (both active and finished)
    return Array.from(this.games.values()).map((g) => ({
      id: g.id,
      status: g.status,
      player1: g.players[0] || null,
      createdAt: g.createdAt,
    }));
  }

  // Add new method to get only active games
  private getActiveGames() {
    return Array.from(this.games.values())
      .filter(
        (game) =>
          game.status !== "1st_player_won" &&
          game.status !== "2nd_player_won" &&
          game.status !== "draw"
      )
      .map((g) => ({
        id: g.id,
        status: g.status,
        player1: g.players[0] || null,
        createdAt: g.createdAt,
      }));
  }

  // Add new method to get only finished games
  private getFinishedGames() {
    return Array.from(this.games.values())
      .filter(
        (game) =>
          game.status === "1st_player_won" ||
          game.status === "2nd_player_won" ||
          game.status === "draw"
      )
      .map((g) => ({
        id: g.id,
        status: g.status,
        player1: g.players[0] || null,
        createdAt: g.createdAt,
        winner: g.winner,
        players: g.players,
      }));
  }

  // Add method to get wallet balance
  private handleGetWalletBalance(sender: Party.Connection, senderId?: string) {
    const pid = senderId ?? sender.id;

    // Initialize wallet if this is a new user
    this.initializeWallet(pid);

    const balance = this.walletBalances.get(pid) || 1000;
    const transactions = this.transactionHistory.get(pid) || [];

    sender.send(
      JSON.stringify({
        type: "wallet-update",
        balance: balance,
        transactions: transactions,
      })
    );
  }

  // Add method to initialize wallet for new users
  private initializeWallet(pid: string) {
    if (!this.walletBalances.has(pid)) {
      this.walletBalances.set(pid, 1000);
      this.transactionHistory.set(pid, []);
    }
  }

  private broadcastWalletUpdate(playerId: string) {
    const balance = this.walletBalances.get(playerId) || 1000;
    const transactions = this.transactionHistory.get(playerId) || [];

    // Find the player's connection and send update
    for (const conn of this.connections) {
      if (conn.id === playerId || conn.id.includes(playerId)) {
        conn.send(
          JSON.stringify({
            type: "wallet-update",
            balance: balance,
            transactions: transactions,
          })
        );
        break;
      }
    }
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
  loser?: string; // Add this field
  createdAt: Date;
}

type PokemonCard = string;
