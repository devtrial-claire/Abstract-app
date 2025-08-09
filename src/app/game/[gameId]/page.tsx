"use client";
import { useRouter } from "next/navigation";
import { GameRoom } from "@/app/lobby/GameRoom";

export default function GamePage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  return <GameRoom gameId={params.gameId} onLeaveGame={() => router.push("/lobby")} />;
}
