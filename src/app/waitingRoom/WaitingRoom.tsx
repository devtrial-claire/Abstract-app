"use client";

import { usePartySocket } from "partysocket/react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

interface WaitingRoomProps {
  gameId: string;
  onCancel?: () => void;
}

interface GameState {
  id: string;
  status: string;
  players: string[];
  cards: string[][];
  balances: Record<string, number>;
  winner?: string;
}

export function WaitingRoom({ gameId, onCancel }: WaitingRoomProps) {
  const router = useRouter();
  const { address: myId } = useAccount();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const socket = usePartySocket({
    host: "c577bc3f4edb.ngrok-free.app",
    room: "my-new-room",
  });

  // Listen for game state updates and cancel game response
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      // Update game state when received
      if (
        (data.type === "game-state" || data.type === "game-updated") &&
        data.gameState
      ) {
        setGameState(data.gameState);
      }

      // Handle game cancellation success
      if (data.type === "game-cancelled" && data.gameId === gameId) {
        console.log("Game cancelled successfully, redirecting to lobby");
        router.push("/lobby");
        return;
      }

      // Handle any errors from cancel attempt
      if (data.type === "error" && data.message.includes("cancel")) {
        console.error("Cancel game error:", data.message);
        // You could show an error message here if needed
      }
    };

    socket.addEventListener("message", handleMessage);

    // Request current game state
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "game-state",
          gameId: gameId,
          senderId: myId,
        })
      );
    } else {
      socket.addEventListener(
        "open",
        () => {
          socket.send(
            JSON.stringify({
              type: "game-state",
              gameId: gameId,
              senderId: myId,
            })
          );
        },
        { once: true }
      );
    }

    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, gameId, router, myId]);

  const handleCancelGame = () => {
    if (socket && myId) {
      socket.send(
        JSON.stringify({
          type: "cancel-game",
          gameId: gameId,
          senderId: myId,
        })
      );
    }
  };

  // Only show cancel button if there's only one player (waiting for opponent)
  const canCancel = gameState && gameState.players.length === 1;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        {/* Top cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
          <div className="bg-gray-300 text-black rounded p-6 min-h-[140px] flex flex-col justify-between">
            <div className="text-2xl font-extrabold tracking-wide">YOU</div>
            <div className="text-3xl font-bold">$0</div>
          </div>

          <div className="bg-gray-300 text-black rounded p-6 min-h-[140px] flex flex-col justify-between">
            <div className="text-2xl font-extrabold tracking-wide">
              OPPONENT
            </div>
            <div className="text-3xl font-bold">$0</div>
          </div>
        </div>

        {/* Bottom banner with enhanced animation */}
        <div className="relative mt-10">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-300 via-lime-300 to-cyan-400 opacity-40 blur-lg animate-pulse waiting-glow" />
          <div className="relative rounded-xl border border-white/10 bg-neutral-900/60 px-6 py-8 text-center">
            <div className="text-3xl md:text-4xl font-extrabold tracking-wide text-yellow-200 pulse-glow-text float-animation">
              WAITING FOR OPPONENT
            </div>
            {/* Enhanced scanning line animation */}
            <div className="mt-6 relative h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse opacity-60"></div>
              <div className="h-full bg-gradient-to-r from-yellow-400 via-lime-400 to-cyan-400 animate-pulse"></div>
              {/* Custom scanning line */}
              <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-80 scan-line"></div>
            </div>

            {/* Cancel Button - Only show when waiting for opponent */}
            {canCancel && (
              <div className="mt-8">
                <button
                  onClick={handleCancelGame}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Cancel Game
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
