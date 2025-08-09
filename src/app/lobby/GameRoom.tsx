"use client";

import React, { useEffect, useState } from "react";
import { usePartySocket } from "partysocket/react";
import { WaitingRoom } from "../waitingRoom/WaitingRoom";
import { BattleView } from "../battleView/BattleView";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
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

interface GameRoomProps {
  gameId: string;
  onLeaveGame: () => void;
}

export function GameRoom({ gameId, onLeaveGame }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [showWaiting, setShowWaiting] = useState(false);
  const router = useRouter();
  const { address: myId } = useAccount();

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

      if (data.type === "game-created" && data.gameId) {
        router.push(`/game/${data.gameId}`);
        return;
      }

      if (
        (data.type === "game-state" || data.type === "game-updated") &&
        data.gameState
      ) {
        const gs = data.gameState;
        setGameState(gs);
        if (
          myId &&
          gs.players?.includes(myId) &&
          gs.status !== "waiting-for-players"
        ) {
          router.push(`/game/${gs.id}`);
          return;
        }
      }
    };

    const request = () =>
      socket.send(JSON.stringify({ type: "game-state", gameId }));

    socket.addEventListener("message", handleMessage);
    if (socket.readyState === WebSocket.OPEN) request();
    else socket.addEventListener("open", request, { once: true });

    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, gameId]);

  if (!gameState || showWaiting || gameState.status === "waiting-for-players") {
    return <WaitingRoom />;
  }
  return <BattleView game={gameState} onLeave={onLeaveGame} />;
}
