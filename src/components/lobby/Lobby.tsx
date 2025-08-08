// src/components/Lobby.tsx
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { useWallet } from "../providers/WalletProvider";

export function Lobby() {
  const { address } = useWallet();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("https://your-worker.workers.dev/games");
        const data = await response.json();
        setGames(data);
      } catch (error) {
        console.error("Failed to fetch games:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const createGame = async () => {
    try {
      const response = await fetch("https://your-worker.workers.dev/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ player: address }),
      });
      const data = await response.json();
      // Redirect to game screen
    } catch (error) {
      console.error("Failed to create game:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pokémon Card Battles</h1>
        <Button onClick={createGame}>Create New Battle</Button>
      </div>

      {loading ? (
        <div>Loading games...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game }) {
  const joinGame = async () => {
    // Implement join game logic
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battle #{game.id}</CardTitle>
        <CardDescription>{game.players.length}/2 players</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={joinGame}>Join Battle</Button>
      </CardContent>
    </Card>
  );
}
