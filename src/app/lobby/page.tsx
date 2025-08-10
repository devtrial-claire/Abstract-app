"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePartySocket } from "partysocket/react";
import { GameRoom } from "./GameRoom";

interface Game {
  id: string;
  status: string;
}

interface GameLobbyProps {
  games: Game[];
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
  isConnected: boolean;
}

function GameLobby({
  games,
  onCreateGame,
  onJoinGame,
  isConnected,
}: GameLobbyProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={onCreateGame}
          disabled={!isConnected}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create New Battle
        </button>
        <button className="border border-gray-300 bg-transparent px-4 py-2 rounded hover:bg-gray-100">
          Join Random Battle
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Open Battles</h2>
        <div className="space-y-2">
          {games.length === 0 ? (
            <p className="text-gray-500">No open battles available</p>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="p-3 bg-gray-800 rounded flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">
                    Battle #{game.id.slice(0, 8)}
                  </span>
                  <span className="ml-2 text-sm text-gray-400">
                    ({game.status})
                  </span>
                </div>
                <button
                  onClick={() => onJoinGame(game.id)}
                  className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                >
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  const { address } = useAccount();
  const [games, setGames] = useState<Game[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);

  const socket = usePartySocket({
    host: "localhost:1999",
    room: "my-new-room",
  });

  useEffect(() => {
    if (!socket) return;

    const handleOpen = () => {
      console.log("Connected to PartyKit server");
      setIsConnected(true);
      setMessages((prev) => [...prev, "Connected to server"]);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);
      setMessages((prev) => [...prev, `Received: ${JSON.stringify(data)}`]);

      if (data.type === "connected" && data.id) {
        setMyId(data.id);
        return;
      }

      if (data.type === "game-created" && data.gameId) {
        console.log(
          "Lobby received game-created:",
          data.gameId,
          "setting currentGameId"
        );
        // When a game is created, set the currentGameId to show the GameRoom
        setCurrentGameId(data.gameId);
        console.log("currentGameId set to:", data.gameId);
        return;
      }

      // Handle when a player successfully joins a game
      if (data.type === "game-joined" && data.gameId) {
        console.log(
          "Lobby received game-joined:",
          data.gameId,
          "setting currentGameId"
        );
        setCurrentGameId(data.gameId);
        return;
      }

      if (
        (data.type === "game-state" || data.type === "game-updated") &&
        (data.gameState || data.game)
      ) {
        const gs = data.gameState ?? data.game; // fallback if some payloads still use `game`
        setGameState(gs);

        // If we receive a game state update and the current player is in the game,
        // make sure currentGameId is set
        if (myId && gs.players?.includes(myId) && gs.id) {
          setCurrentGameId(gs.id);
        }
      }

      if (data.type === "game-list-updated" && data.games) {
        setGames(data.games);
      }

      // Handle error messages from server
      if (data.type === "error") {
        console.error("Server error:", data.message);
        setMessages((prev) => [...prev, `Error: ${data.message}`]);
      }
    };

    const handleClose = () => {
      console.log("Disconnected from PartyKit server");
      setIsConnected(false);
      setMessages((prev) => [...prev, "Disconnected from server"]);
    };

    const handleError = (error: Event) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [...prev, "Connection error"]);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
    };
  }, [socket, myId]);

  const handleCreateGame = () => {
    if (socket?.readyState === WebSocket.OPEN && address) {
      const message = JSON.stringify({
        type: "create-game",
        senderId: address,
      });
      socket.send(message);
      setMessages((prev) => [...prev, `Sent: ${message}`]);
      // Don't set currentGameId here - wait for server response
    }
  };

  const handleJoinGame = (gameId: string) => {
    if (socket?.readyState === WebSocket.OPEN && address) {
      const message = JSON.stringify({
        type: "join-game",
        gameId,
        senderId: address,
      });
      socket.send(message);
      setMessages((prev) => [...prev, `Sent: ${message}`]);
      setCurrentGameId(gameId);
    }
  };

  const handleLeaveGame = (gameStatus?: string) => {
    // Only allow leaving if the game is finished
    if (
      gameStatus &&
      ["1st_player_won", "2nd_player_won", "draw"].includes(gameStatus)
    ) {
      setCurrentGameId(null);
    }
    // If game is still active, don't allow leaving - stay in the game
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Pokémon Betting Lobby</h1>
        <div className="text-sm">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      </header>

      {currentGameId ? (
        <GameRoom gameId={currentGameId} onLeaveGame={handleLeaveGame} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Game Lobby</h2>
            <GameLobby
              games={games}
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
              isConnected={isConnected}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Connection Log</h2>
            <div className="bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto">
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div key={index} className="text-sm text-gray-300">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
