"use client";
import { useEffect, useMemo, useState } from "react";
import { usePartySocket } from "partysocket/react";
import { useAccount } from "wagmi";

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
  const { address: myAddress } = useAccount();
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

  // Determine which player is the current user
  const isPlayer1 = myAddress && game.players[0] === myAddress;
  const isPlayer2 = myAddress && game.players[1] === myAddress;

  // Determine if current user won
  const currentUserWon =
    (isPlayer1 && game.status === "1st_player_won") ||
    (isPlayer2 && game.status === "2nd_player_won");

  const currentUserLost =
    (isPlayer1 && game.status === "2nd_player_won") ||
    (isPlayer2 && game.status === "1st_player_won");

  // Debug logging
  console.log("BattleView - Wallet addresses:", {
    myAddress,
    player1: game.players[0],
    player2: game.players[1],
    isPlayer1,
    isPlayer2,
    gameStatus: game.status,
    currentUserWon,
    currentUserLost,
  });

  const parse = (c: string) => {
    const [name, val] = c.split("#");
    return { name, val: Number(val) || 0 };
  };

  const p1Vals = useMemo(() => p1.map((c) => parse(c).val), [p1]);
  const p2Vals = useMemo(() => p2.map((c) => parse(c).val), [p2]);

  // Run 5 betting rounds when status is in-progress
  useEffect(() => {
    if (game.status !== "in-progress" || round >= 5) return;

    setAnimating(true);
    const t = setTimeout(() => {
      const i = round;
      const v1 = p1Vals[i] ?? 0;
      const v2 = p2Vals[i] ?? 0;

      // Each round both "bet" $5. Higher card wins the $10 pot.
      if (v1 > v2) {
        setP1Bal((b) => b + betPerRound);
        setP2Bal((b) => b - betPerRound);
      } else if (v2 > v1) {
        setP1Bal((b) => b - betPerRound);
        setP2Bal((b) => b + betPerRound);
      }

      setRound((r) => r + 1);
      setAnimating(false);
    }, 900);

    return () => clearTimeout(t);
  }, [round, game.status, p1Vals, p2Vals]);

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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-yellow-400">
              Pokemon Gacha
            </h1>
          </div>
          <button
            onClick={onLeave}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Leave Game
          </button>
        </div>

        {/* Player Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">
              {isPlayer1 ? "YOU" : isPlayer2 ? "OPPONENT" : "Player 1"}
            </h3>
            <p className="text-2xl">${p1Bal.toFixed(1)}</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">
              {isPlayer2 ? "YOU" : isPlayer1 ? "OPPONENT" : "Player 2"}
            </h3>
            <p className="text-2xl">${p2Bal.toFixed(1)}</p>
          </div>
        </div>

        {/* Round Progress */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-gray-800 rounded-full px-6 py-3">
            <span className="text-lg font-semibold text-gray-300">Round</span>
            <span className="text-2xl font-bold text-yellow-400">
              {Math.min(round + 1, 5)}
            </span>
            <span className="text-lg text-gray-400">/ 5</span>
          </div>
        </div>

        {/* Winning Screen */}
        {(game.status === "1st_player_won" ||
          game.status === "2nd_player_won" ||
          game.status === "draw") && (
          <div className="text-center mb-8">
            <div className="inline-block px-8 py-6 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-green-400/20 border-2 border-yellow-400/40">
              {game.status === "draw" ? (
                <>
                  <div className="text-4xl font-bold text-yellow-300 mb-2">
                    🤝
                  </div>
                  <div className="text-2xl font-semibold text-yellow-200">
                    DRAW!
                  </div>
                  <div className="text-lg text-gray-300 mt-2">It's a tie!</div>
                </>
              ) : currentUserWon ? (
                <>
                  <div className="text-4xl font-bold text-green-300 mb-2">
                    🎉
                  </div>
                  <div className="text-3xl font-bold text-green-200 mb-2">
                    YOU WIN!!
                  </div>
                  <div className="text-lg text-gray-300 mt-2">
                    Congratulations!
                  </div>
                </>
              ) : currentUserLost ? (
                <>
                  <div className="text-4xl font-bold text-red-300 mb-2">😔</div>
                  <div className="text-3xl font-bold text-red-200 mb-2">
                    YOU LOSE
                  </div>
                  <div className="text-lg text-gray-300 mt-2">
                    Better luck next time!
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-blue-300 mb-2">
                    🏆
                  </div>
                  <div className="text-2xl font-semibold text-blue-200">
                    Game Over
                  </div>
                  <div className="text-lg text-gray-300 mt-2">
                    {game.status === "1st_player_won"
                      ? "Player 1 won!"
                      : "Player 2 won!"}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Poke Balls and Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-8">
          {/* Your Poke Ball */}
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-300 mb-4">
              {isPlayer1
                ? "Your Card"
                : isPlayer2
                ? "Opponent Card"
                : "Player 1 Card"}
            </div>
            <div className="relative">
              {/* Poke Ball */}
              <div className="w-48 h-48 mx-auto relative">
                {/* Top half (red) */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-red-500 rounded-t-full"></div>
                {/* Bottom half (white) */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white rounded-b-full"></div>
                {/* Center button */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-gray-800 rounded-full"></div>
                {/* Card inside */}
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-44 bg-gradient-to-br from-orange-400 to-yellow-600 rounded-lg border-2 border-yellow-300 shadow-lg flex items-center justify-center ${
                    animating ? "animate-bounce" : ""
                  }`}
                >
                  <div className="text-center text-black">
                    <div className="text-lg font-bold mb-2">🃏</div>
                    <div className="text-sm font-bold">
                      {p1[roundActive] ? parse(p1[roundActive]).name : "—"}
                    </div>
                    <div className="text-2xl font-bold text-yellow-800">
                      #{p1[roundActive] ? parse(p1[roundActive]).val : "?"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold text-white">
                  {p1[roundActive] ? p1[roundActive] : "—"}
                </div>
                <div className="text-yellow-400 font-bold">${betPerRound}</div>
              </div>
            </div>
          </div>

          {/* Opponent Poke Ball */}
          <div className="text-center">
            <div className="text-lg font-semibold text-red-300 mb-4">
              {isPlayer2
                ? "Your Card"
                : isPlayer1
                ? "Opponent Card"
                : "Player 2 Card"}
            </div>
            <div className="relative">
              {/* Poke Ball */}
              <div className="w-48 h-48 mx-auto relative">
                {/* Top half (red) */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-red-500 rounded-t-full"></div>
                {/* Bottom half (white) */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white rounded-b-full"></div>
                {/* Center button */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-gray-800 rounded-full"></div>
                {/* Card inside */}
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-44 bg-gradient-to-br from-orange-400 to-yellow-600 rounded-lg border-2 border-yellow-300 shadow-lg flex items-center justify-center ${
                    animating ? "animate-bounce" : ""
                  }`}
                >
                  <div className="text-center text-black">
                    <div className="text-lg font-bold mb-2">🃏</div>
                    <div className="text-sm font-bold">
                      {p2[roundActive] ? parse(p2[roundActive]).name : "—"}
                    </div>
                    <div className="text-2xl font-bold text-yellow-800">
                      #{p2[roundActive] ? parse(p2[roundActive]).val : "?"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold text-white">
                  {p2[roundActive] ? p2[roundActive] : "—"}
                </div>
                <div className="text-yellow-400 font-bold">${betPerRound}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pot */}
        <div className="text-center mb-8">
          <div
            className={`inline-block px-8 py-4 rounded-2xl bg-yellow-400/20 border-2 border-yellow-400/40 ${
              animating ? "animate-pulse" : ""
            }`}
          >
            <div className="text-2xl font-bold text-yellow-300">💰</div>
            <div className="text-xl font-semibold text-yellow-200">
              Pot: ${betPerRound}
            </div>
          </div>
        </div>

        {/* Game Status */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className="capitalize">{game.status.replace(/-/g, " ")}</p>
          {game.winner && <p className="mt-1">Winner: {game.winner}</p>}

          {/* Debug Info */}
          <div className="mt-4 p-3 bg-gray-700 rounded text-sm">
            <h4 className="font-semibold mb-2">Debug Info:</h4>
            <p>My Address: {myAddress || "Not connected"}</p>
            <p>Player 1: {game.players[0] || "None"}</p>
            <p>Player 2: {game.players[1] || "None"}</p>
            <p>Is Player 1: {isPlayer1 ? "Yes" : "No"}</p>
            <p>Is Player 2: {isPlayer2 ? "Yes" : "No"}</p>
            <p>Current User Won: {currentUserWon ? "Yes" : "No"}</p>
            <p>Current User Lost: {currentUserLost ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
