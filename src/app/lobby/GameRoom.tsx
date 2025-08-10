"use client";

import React, { useEffect, useState } from "react";
import { usePartySocket } from "partysocket/react";
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
  onLeaveGame: (status: GameStatus) => void;
}

export function GameRoom({ gameId, onLeaveGame }: GameRoomProps) {
  const router = useRouter();
  const { address: myId } = useAccount();

  console.log(
    "GameRoom component rendered with gameId:",
    gameId,
    "myId:",
    myId
  );

  // Redirect immediately when GameRoom renders
  useEffect(() => {
    console.log("GameRoom redirecting immediately to:", `/game/${gameId}`);
    router.push(`/game/${gameId}`);
  }, [gameId, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Game Starting...</h2>
        <p className="text-gray-400">Redirecting to game page...</p>
      </div>
    </div>
  );
}
