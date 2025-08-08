"use client";

import React, { useEffect, useState } from "react";
import { usePartySocket } from "partysocket/react";

interface GameState {
  id: string;
  status: string;
  players: string[];
  cards: string[][];
  balances: Record<string, number>;
  winner?: string;
}

interface GameRoomProps {
  gameId: string;
  onLeaveGame: () => void;
}

export function GameRoom({ gameId, onLeaveGame }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  const socket = usePartySocket({
    host: "localhost:1999",
    room: "my-new-room",
  });

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log("Game room received:", data);
      setMessages((prev) => [...prev, `Received: ${JSON.stringify(data)}`]);

      if (data.type === "game-state" && data.game) {
        setGameState(data.game);
      }
    };

    socket.addEventListener("message", handleMessage);

    // Request current game state
    if (socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "game-state", gameId });
      socket.send(message);
      setMessages((prev) => [...prev, `Requested game state for: ${gameId}`]);
    }

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, gameId]);

  const handleBet = (amount: number) => {
    if (socket?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "place-bet", gameId, amount });
      socket.send(message);
      setMessages((prev) => [...prev, `Placed bet: ${amount}`]);
    }
  };

  const handlePlayCard = (cardIndex: number) => {
    if (socket?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "play-card", gameId, cardIndex });
      socket.send(message);
      setMessages((prev) => [...prev, `Played card: ${cardIndex}`]);
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Battle #{gameId.slice(0, 8)}</h2>
        <button
          onClick={onLeaveGame}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Leave Game
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Game Status */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Game Status</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Status:</span> {gameState.status}
            </p>
            <p>
              <span className="font-medium">Players:</span>{" "}
              {gameState.players.length}/2
            </p>
            {gameState.winner && (
              <p>
                <span className="font-medium">Winner:</span> {gameState.winner}
              </p>
            )}
          </div>
        </div>

        {/* Player Balances */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Balances</h3>
          <div className="space-y-2">
            {Object.entries(gameState.balances).map(([playerId, balance]) => (
              <p key={playerId}>
                <span className="font-medium">
                  Player {playerId.slice(0, 6)}:
                </span>{" "}
                {balance} tokens
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Game Actions */}
      {gameState.status === "waiting-for-players" && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Waiting for Players</h3>
          <p className="text-gray-400">Waiting for another player to join...</p>
        </div>
      )}

      {gameState.status === "in-progress" && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Game Actions</h3>
          <div className="flex gap-4">
            <button
              onClick={() => handleBet(5)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Bet 5 Tokens
            </button>
            <button
              onClick={() => handleBet(10)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Bet 10 Tokens
            </button>
          </div>
        </div>
      )}

      {/* Connection Log */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Game Log</h3>
        <div className="h-48 overflow-y-auto space-y-2">
          {messages.map((message, index) => (
            <div key={index} className="text-sm text-gray-300">
              {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
