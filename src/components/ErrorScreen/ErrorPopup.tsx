"use client";
import { useEffect, useState } from "react";

interface ErrorPopupProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  onRejoinGame?: () => void;
  showRejoinButton?: boolean;
}

export function ErrorPopup({
  message,
  isVisible,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  onRejoinGame,
  showRejoinButton = false,
}: ErrorPopupProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      if (autoClose && !showRejoinButton) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, autoClose, autoCloseDelay, onClose, showRejoinButton]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleRejoinGame = () => {
    if (onRejoinGame) {
      onRejoinGame();
    }
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-200 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {showRejoinButton ? "Active Game Found" : "Game Creation Failed"}
          </h3>
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3">
          {showRejoinButton && onRejoinGame && (
            <button
              onClick={handleRejoinGame}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Rejoin Your Game
            </button>
          )}
          <button
            onClick={handleClose}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {showRejoinButton ? "Stay Here" : "Got it"}
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
