"use client";
import { useState } from "react";
import { ErrorPopup } from "./ErrorPopup";

export function ErrorPopupDemo() {
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showRejoinButton, setShowRejoinButton] = useState(false);

  const showTestError = (message: string, hasRejoin: boolean = false) => {
    setErrorMessage(message);
    setShowRejoinButton(hasRejoin);
    setShowError(true);
  };

  const handleRejoinGame = () => {
    console.log("Rejoining game...");
    // In a real app, this would navigate to the player's current game
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Error Popup Demo</h2>

      <div className="space-x-4">
        <button
          onClick={() =>
            showTestError(
              "You already have an active game. Please finish your current game first.",
              true
            )
          }
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Show Active Game Error (with Rejoin)
        </button>

        <button
          onClick={() => showTestError("You are already in this game")}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
        >
          Show Join Game Error
        </button>

        <button
          onClick={() => showTestError("Game not found")}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Show Game Not Found Error
        </button>
      </div>

      <ErrorPopup
        message={errorMessage}
        isVisible={showError}
        onClose={() => {
          setShowError(false);
          setShowRejoinButton(false);
        }}
        autoClose={true}
        autoCloseDelay={5000}
        onRejoinGame={handleRejoinGame}
        showRejoinButton={showRejoinButton}
      />
    </div>
  );
}
