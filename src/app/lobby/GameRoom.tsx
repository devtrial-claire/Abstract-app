"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

interface GameRoomProps {
  gameId: string;
}

export function GameRoom({ gameId }: GameRoomProps) {
  const router = useRouter();

  console.log("GameRoom component rendered with gameId:", gameId);

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
