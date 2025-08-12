"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePartySocket } from "partysocket/react";
import { useAccount } from "wagmi";
import { WaitingRoom } from "@/app/waitingRoom/WaitingRoom";
import { BattleView } from "@/app/battleView/BattleView";
import { ErrorPopup } from "@/components/ErrorScreen";

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
  rematchRequests?: string[];
  canRematch?: boolean;
}

export default function GamePage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const { address: myId } = useAccount();
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showRejoinButton, setShowRejoinButton] = useState(false);
  const [playerCurrentGameId, setPlayerCurrentGameId] = useState<string | null>(
    null
  );

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    room: "my-new-room",
  });

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log("Game page received:", data);

      if (
        (data.type === "game-state" || data.type === "game-updated") &&
        data.gameState
      ) {
        const gs = data.gameState;
        setGameState(gs);
      }

      // Handle rematch game creation
      if (
        data.type === "rematch-game-created" &&
        data.originalGameId === params.gameId
      ) {
        console.log("Rematch game created, redirecting to:", data.newGameId);
        router.push(`/game/${data.newGameId}`);
        return;
      }

      // Handle rematch failure
      if (
        data.type === "rematch-failed" &&
        data.originalGameId === params.gameId
      ) {
        console.log("Rematch failed:", data.reason);
        if (data.reason === "insufficient_balance") {
          setErrorMessage(
            `Rematch failed: One or both players don't have sufficient balance (need $25 each). Player 1: $${data.player1Balance}, Player 2: $${data.player2Balance}`
          );
        } else {
          setErrorMessage("Rematch failed for unknown reason");
        }
        setShowError(true);
        return;
      }

      // Handle game cancellation
      if (data.type === "game-cancelled" && data.gameId === params.gameId) {
        console.log("Game cancelled, redirecting to lobby");
        router.push("/lobby");
        return;
      }

      // Handle error messages from server
      if (data.type === "error") {
        console.error("Server error:", data.message);
        setErrorMessage(data.message);

        // Check if this is the "active game" error and we have a current game ID
        if (
          data.message.includes("already have an active game") &&
          params.gameId
        ) {
          setShowRejoinButton(true);
          setPlayerCurrentGameId(params.gameId);
        } else {
          setShowRejoinButton(false);
        }

        setShowError(true);
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
  }, [socket, params.gameId, myId, router]);

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

  const handleRejoinGame = () => {
    if (playerCurrentGameId) {
      // Navigate back to the current game
      router.push(`/game/${playerCurrentGameId}`);
      setShowError(false);
      setErrorMessage(null);
      setShowRejoinButton(false);
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
    return (
      <>
        <WaitingRoom gameId={params.gameId} />
        <ErrorPopup
          message={errorMessage || ""}
          isVisible={showError}
          onClose={() => {
            setShowError(false);
            setErrorMessage(null);
            setShowRejoinButton(false);
          }}
          autoClose={true}
          autoCloseDelay={5000}
          onRejoinGame={handleRejoinGame}
          showRejoinButton={showRejoinButton}
        />
      </>
    );
  }

  // Show battle view if game is in progress or finished
  console.log("Rendering BattleView - gameState:", gameState);
  return (
    <>
      <BattleView game={gameState} onLeave={handleLeaveWrapper} />
      <ErrorPopup
        message={errorMessage || ""}
        isVisible={showError}
        onClose={() => {
          setShowError(false);
          setErrorMessage(null);
          setShowRejoinButton(false);
        }}
        autoClose={true}
        autoCloseDelay={5000}
        onRejoinGame={handleRejoinGame}
        showRejoinButton={showRejoinButton}
      />
    </>
  );
}
