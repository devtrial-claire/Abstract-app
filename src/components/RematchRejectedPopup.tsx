"use client";

import React from "react";

interface RematchRejectedPopupProps {
  isOpen: boolean;
  onJoinRandomBattle: () => void;
  onGoToLobby: () => void;
}

export function RematchRejectedPopup({
  isOpen,
  onJoinRandomBattle,
  onGoToLobby,
}: RematchRejectedPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-3xl font-bold text-red-400 mb-4">
            Rematch Declined
          </div>

          <div className="text-lg text-gray-300 mb-6">
            Your opponent declined the rematch request.
          </div>

          {/* Options */}
          <div className="space-y-4">
            <button
              onClick={onJoinRandomBattle}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🚀 Join Random Battle
            </button>
            
            <button
              onClick={onGoToLobby}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🏠 Go Back to Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
