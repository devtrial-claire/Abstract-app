"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePartySocket } from "partysocket/react";
import { GameRoom } from "./GameRoom";
import { ErrorPopup } from "@/components/ErrorScreen";

interface Game {
  id: string;
  status: string;
  player1?: string;
}

interface GameLobbyProps {
  games: Game[];
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
  onJoinRandomBattle: () => void;
  isConnected: boolean;
}

function GameLobby({
  games,
  onCreateGame,
  onJoinGame,
  onJoinRandomBattle,
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
        <button
          onClick={onJoinRandomBattle}
          disabled={
            !isConnected ||
            games.filter((g) => g.status === "waiting-for-players").length === 0
          }
          className="border border-gray-300 bg-transparent px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join Random Battle
          {games.filter((g) => g.status === "waiting-for-players").length >
            0 && (
            <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
              {games.filter((g) => g.status === "waiting-for-players").length}{" "}
              available
            </span>
          )}
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showRejoinButton, setShowRejoinButton] = useState(false);
  const [playerCurrentGameId, setPlayerCurrentGameId] = useState<string | null>(
    null
  );

  // Random battle state
  const [showRandomBattleModal, setShowRandomBattleModal] = useState(false);
  const [selectedRandomGame, setSelectedRandomGame] = useState<Game | null>(
    null
  );

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
        setPlayerCurrentGameId(data.gameId); // Track the game this player created
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
        // Also set playerCurrentGameId if not already set
        if (!playerCurrentGameId) {
          setPlayerCurrentGameId(data.gameId);
          console.log("Set playerCurrentGameId from game-joined:", data.gameId);
        }
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
        setErrorMessage(data.message);

        // Check if this is the "active game" error and set rejoin button
        if (data.message.includes("already have an active game")) {
          console.log("Setting rejoin button for active game error");
          // Use currentGameId from server error if available, otherwise use playerCurrentGameId
          if (data.currentGameId) {
            setPlayerCurrentGameId(data.currentGameId);
            console.log(
              "Set playerCurrentGameId from server error:",
              data.currentGameId
            );
          }
          setShowRejoinButton(true);
        } else {
          setShowRejoinButton(false);
        }

        console.log(
          "Showing error popup with message:",
          data.message,
          "showRejoinButton:",
          data.message.includes("already have an active game"),
          "currentGameId from server:",
          data.currentGameId
        );
        setShowError(true);
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

  // Debug logging for error state changes
  useEffect(() => {
    console.log(
      "Error state changed - showError:",
      showError,
      "errorMessage:",
      errorMessage,
      "showRejoinButton:",
      showRejoinButton,
      "playerCurrentGameId:",
      playerCurrentGameId
    );
  }, [showError, errorMessage, showRejoinButton, playerCurrentGameId]);

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
      // Don't set currentGameId here - wait for server response
    }
  };

  const handleLeaveGame = (gameStatus?: string) => {
    // Only allow leaving if the game is finished
    if (
      gameStatus &&
      ["1st_player_won", "2nd_player_won", "draw"].includes(gameStatus)
    ) {
      setCurrentGameId(null);
      setPlayerCurrentGameId(null); // Clear the tracked game when leaving
    }
    // If game is still active, don't allow leaving - stay in the game
  };

  const handleRejoinGame = () => {
    console.log(
      "handleRejoinGame called with playerCurrentGameId:",
      playerCurrentGameId
    );
    if (playerCurrentGameId) {
      console.log("Rejoining game:", playerCurrentGameId);
      setCurrentGameId(playerCurrentGameId);
      setShowError(false);
      setErrorMessage(null);
      setShowRejoinButton(false);

      // Request current game state when rejoining
      if (socket?.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type: "game-state",
          gameId: playerCurrentGameId,
          senderId: address,
        });
        socket.send(message);
        setMessages((prev) => [
          ...prev,
          `Requesting game state for: ${playerCurrentGameId}`,
        ]);
        console.log("Sent game state request for:", playerCurrentGameId);
      }
    } else {
      console.log("No playerCurrentGameId available for rejoin");
    }
  };

  const handleJoinRandomBattle = () => {
    // Filter games that are waiting for players
    const availableGames = games.filter(
      (game) => game.status === "waiting-for-players"
    );

    if (availableGames.length === 0) {
      setErrorMessage("No available battles to join");
      setShowError(true);
      return;
    }

    // Randomly select a game
    const randomIndex = Math.floor(Math.random() * availableGames.length);
    const randomGame = availableGames[randomIndex];

    setSelectedRandomGame(randomGame);
    setShowRandomBattleModal(true);
  };

  const handleConfirmRandomBattle = () => {
    if (selectedRandomGame) {
      setShowRandomBattleModal(false);
      setSelectedRandomGame(null);
      handleJoinGame(selectedRandomGame.id);
    }
  };

  const handleCancelRandomBattle = () => {
    setShowRandomBattleModal(false);
    setSelectedRandomGame(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Error Popup - Always visible regardless of game state */}
      <ErrorPopup
        message={errorMessage || ""}
        isVisible={showError}
        onClose={() => {
          setShowError(false);
          setErrorMessage(null);
          setShowRejoinButton(false);
        }}
        autoClose={true}
        autoCloseDelay={5000}
        onRejoinGame={handleRejoinGame}
        showRejoinButton={showRejoinButton}
      />

      {/* Random Battle Confirmation Modal */}
      {showRandomBattleModal && selectedRandomGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-white">
              Join Random Battle
            </h3>
            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                You're about to join a battle with:
              </p>
              <div className="bg-gray-700 rounded p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Status:</span>
                  <span className="text-green-400 text-sm font-medium capitalize">
                    {selectedRandomGame.status.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Player 1:</span>
                  <span className="text-white font-medium">
                    {selectedRandomGame.player1
                      ? `${selectedRandomGame.player1.slice(
                          0,
                          6
                        )}...${selectedRandomGame.player1.slice(-4)}`
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Battle ID:</span>
                  <span className="text-gray-300 text-sm font-mono">
                    {selectedRandomGame.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmRandomBattle}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Confirm Join
              </button>
              <button
                onClick={handleCancelRandomBattle}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
              onJoinRandomBattle={handleJoinRandomBattle}
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
