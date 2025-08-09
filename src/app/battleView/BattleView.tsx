"use client";

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
  const [p1 = [], p2 = []] = game.cards ?? [];

  const parse = (c: string) => {
    const [name, val] = c.split("#");
    return { name, val: Number(val) || 0 };
  };

  const sum = (cards: string[]) => cards.reduce((s, c) => s + parse(c).val, 0);

  const p1Total = sum(p1);
  const p2Total = sum(p2);

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

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className="capitalize">{game.status.replace(/-/g, " ")}</p>
          {game.winner && (
            <p className="mt-1">
              <span className="font-medium">Winner:</span> {game.winner}
            </p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Balances</h3>
          <div className="space-y-1">
            {Object.entries(game.balances).map(([id, bal]) => (
              <p key={id}>
                <span className="font-medium">Player {id.slice(0, 6)}:</span>{" "}
                {bal} tokens
              </p>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Totals</h3>
          <p>Player 1: {p1Total}</p>
          <p>Player 2: {p2Total}</p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Player 1 Cards</h3>
          <div className="flex flex-wrap gap-2">
            {p1.length === 0 ? (
              <span className="text-gray-400">No cards</span>
            ) : (
              p1.map((c, i) => {
                const { name, val } = parse(c);
                return (
                  <span
                    key={i}
                    className="px-2 py-1 rounded bg-gray-700 text-sm"
                  >
                    {name} #{val}
                  </span>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Player 2 Cards</h3>
          <div className="flex flex-wrap gap-2">
            {p2.length === 0 ? (
              <span className="text-gray-400">No cards</span>
            ) : (
              p2.map((c, i) => {
                const { name, val } = parse(c);
                return (
                  <span
                    key={i}
                    className="px-2 py-1 rounded bg-gray-700 text-sm"
                  >
                    {name} #{val}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
