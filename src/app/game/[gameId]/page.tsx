"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePartySocket } from "partysocket/react";
import { useAccount } from "wagmi";
import { WaitingRoom } from "@/app/waitingRoom/WaitingRoom";
import { BattleView } from "@/app/battleView/BattleView";

type GameStatus =
  | "waiting-for-players"
  | "in-progress"
  | "1st_player_won"
  | "2nd_player_won"
  | "draw";

interface GameState {
  id: string;
  status: GameStatus;
  players: string[];
  cards: string[][];
  balances: Record<string, number>;
  winner?: string;
}

export default function GamePage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const { address: myId } = useAccount();
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
      console.log("Game page received:", data);
      setMessages((prev) => [...prev, `Received: ${JSON.stringify(data)}`]);

      if (
        (data.type === "game-state" || data.type === "game-updated") &&
        data.gameState
      ) {
        const gs = data.gameState;
        setGameState(gs);
      }
    };

    const request = () => {
      socket.send(
        JSON.stringify({
          type: "game-state",
          gameId: params.gameId,
          senderId: myId,
        })
      );
    };

    socket.addEventListener("message", handleMessage);
    if (socket.readyState === WebSocket.OPEN) request();
    else socket.addEventListener("open", request, { once: true });

    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, params.gameId]);

  const handleLeaveGame = (gameStatus: GameStatus) => {
    // Only allow leaving if the game is finished
    if (["1st_player_won", "2nd_player_won", "draw"].includes(gameStatus)) {
      router.push("/lobby");
    }
    // If game is still active, don't allow leaving - stay on the game page
  };

  // Create a wrapper function that BattleView can call
  const handleLeaveWrapper = () => {
    if (gameState) {
      handleLeaveGame(gameState.status);
    }
  };

  console.log(
    "Game page render - gameState:",
    gameState,
    "gameId:",
    params.gameId
  );

  // Show waiting room if game is not loaded yet or if waiting for players
  if (!gameState || gameState.status === "waiting-for-players") {
    console.log("Rendering WaitingRoom - gameState:", gameState);
    return <WaitingRoom />;
  }

  // Show battle view if game is in progress or finished
  console.log("Rendering BattleView - gameState:", gameState);
  return <BattleView game={gameState} onLeave={handleLeaveWrapper} />;
}
