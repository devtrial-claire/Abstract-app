"use client";
import { useEffect, useMemo, useState } from "react";
import { usePartySocket } from "partysocket/react";

type GameStatus =
  | "waiting-for-players"
  | "in-progress"
  | "1st_player_won"
  | "2nd_player_won"
  | "draw";

type GameState = {
  id: string;
  status: GameStatus;
  players: string[];
  cards: string[][]; // ["pikachu#5", ...]
  balances: Record<string, number>;
  winner?: string;
};

export function BattleView({
  game,
  onLeave,
}: {
  game: GameState;
  onLeave: () => void;
}) {
  const socket = usePartySocket({
    host: "localhost:1999",
    room: "my-new-room",
  });

  const [round, setRound] = useState(0); // 0..5
  const [p1Bal, setP1Bal] = useState(25);
  const [p2Bal, setP2Bal] = useState(25);
  const [animating, setAnimating] = useState(false);

  const [p1 = [], p2 = []] = game.cards ?? [];
  const betPerRound = 5; // 25 / 5 rounds

  const parse = (c: string) => {
    const [name, val] = c.split("#");
    return { name, val: Number(val) || 0 };
  };

  const p1Vals = useMemo(() => p1.map((c) => parse(c).val), [p1]);
  const p2Vals = useMemo(() => p2.map((c) => parse(c).val), [p2]);

  // Run 5 betting rounds when status is in-progress
  useEffect(() => {
    if (game.status !== "in-progress" || round >= 5) return; // no animating here

    setAnimating(true);
    const t = setTimeout(() => {
      const i = round;
      const v1 = p1Vals[i] ?? 0;
      const v2 = p2Vals[i] ?? 0;

      // Each round both "bet" $5. Higher card wins the $10 pot.
      if (v1 > v2) {
        setP1Bal((b) => b + betPerRound); // +5 net (5 won, 5 staked)
        setP2Bal((b) => b - betPerRound);
      } else if (v2 > v1) {
        setP1Bal((b) => b - betPerRound);
        setP2Bal((b) => b + betPerRound);
      } // tie: no balance change

      setRound((r) => r + 1);
      setAnimating(false);
    }, 900);

    return () => clearTimeout(t);
  }, [round, game.status, p1Vals, p2Vals]); // <-- remove animating from deps

  // When all 5 rounds finish, ask server to reveal the winner
  useEffect(() => {
    if (game.status !== "in-progress") return;
    if (round === 5) {
      socket?.send(
        JSON.stringify({
          type: "reveal-winner",
          gameId: game.id,
        })
      );
    }
  }, [round, game.status, game.id, socket]);

  const roundActive = round < 5 ? round : 4;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Battle #{game.id.slice(0, 8)}</h2>
        <button
          onClick={onLeave}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Leave Game
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">YOU</h3>
          <p className="text-2xl">${p1Bal.toFixed(1)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">OPPONENT</h3>
          <p className="text-2xl">${p2Bal.toFixed(1)}</p>
        </div>
      </div>

      {/* 5-round "bet" animation */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">
          Round {Math.min(round + 1, 5)} / 5
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Player 1 card */}
          <div
            className={`transition-transform ${
              animating ? "animate-bounce" : ""
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">Card</div>
            <div className="px-2 py-1 rounded bg-gray-700 inline-block">
              {p1[roundActive] ? p1[roundActive] : "—"}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Bet: ${betPerRound}
            </div>
          </div>

          {/* Player 2 card */}
          <div
            className={`transition-transform ${
              animating ? "animate-bounce" : ""
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">Card</div>
            <div className="px-2 py-1 rounded bg-gray-700 inline-block">
              {p2[roundActive] ? p2[roundActive] : "—"}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Bet: ${betPerRound}
            </div>
          </div>
        </div>

        {/* Pot indicator */}
        <div className="mt-6 text-center">
          <div
            className={`inline-block px-4 py-2 rounded-full bg-yellow-400/20 border border-yellow-400/40 ${
              animating ? "animate-pulse" : ""
            }`}
          >
            Pot: ${betPerRound * 2}
          </div>
        </div>
      </div>

      {/* Result auto-updates when server broadcasts winner after animation */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Status</h3>
        <p className="capitalize">{game.status.replace(/-/g, " ")}</p>
        {game.winner && <p className="mt-1">Winner: {game.winner}</p>}
      </div>
    </div>
  );
}
