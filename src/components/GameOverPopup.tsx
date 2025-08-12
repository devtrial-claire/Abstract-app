"use client";

import React from "react";

interface GameOverPopupProps {
  isOpen: boolean;
  onRequestRematch: () => void;
  onRejectRematch: () => void;
  gameResult: "won" | "lost" | "draw";
}

export function GameOverPopup({
  isOpen,
  onRequestRematch,
  onRejectRematch,
  gameResult,
}: GameOverPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-black border border-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
        {/* Retro Game Over Style */}
        <div className="space-y-6">
          {/* GAME OVER Text */}
          <div className="text-6xl font-bold text-white font-mono tracking-wider">
            GAME OVER
          </div>

          {/* Game Result */}
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {gameResult === "won" && "🏆 YOU WIN! 🏆"}
            {gameResult === "lost" && "😔 YOU LOSE 😔"}
            {gameResult === "draw" && "🤝 IT'S A DRAW 🤝"}
          </div>

          {/* PLAY AGAIN Question */}
          <div className="text-3xl font-bold text-cyan-400 font-mono">
            PLAY AGAIN ?
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-6">
            <button
              onClick={onRequestRematch}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-xl font-mono transition-colors border-2 border-green-500"
            >
              YES
            </button>
            <button
              onClick={onRejectRematch}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold text-xl font-mono transition-colors border-2 border-red-500"
            >
              NO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
