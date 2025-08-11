"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePartySocket } from "partysocket/react";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";

interface Transaction {
  id: string;
  type: "game_played" | "game_won" | "game_lost";
  amount: number;
  gameId?: string;
  timestamp: Date;
  description: string;
}

interface Token {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  value: number;
}

export function WalletView() {
  const { address } = useAccount();
  const { logout } = useLoginWithAbstract();
  const [activeTab, setActiveTab] = useState<"tokens" | "history">("tokens");
  const [walletBalance, setWalletBalance] = useState(1000);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Initialize tokens state
  const [tokens] = useState<Token[]>([
    {
      id: "1",
      name: "Pokemon Battle Token",
      symbol: "PBT",
      balance: 150,
      value: 0.25,
    },
    {
      id: "2",
      name: "Gacha Points",
      symbol: "GP",
      balance: 75,
      value: 0.1,
    },
  ]);

  // Initialize wallet from localStorage on component mount
  useEffect(() => {
    if (address) {
      const storedBalance = localStorage.getItem(`wallet_balance_${address}`);
      const storedTransactions = localStorage.getItem(
        `wallet_transactions_${address}`
      );

      if (storedBalance) {
        setWalletBalance(parseFloat(storedBalance));
      }

      if (storedTransactions) {
        try {
          const parsedTransactions = JSON.parse(storedTransactions).map(
            (tx: any) => ({
              ...tx,
              timestamp: new Date(tx.timestamp),
            })
          );
          setTransactions(parsedTransactions);
        } catch (error) {
          console.error("Error parsing stored transactions:", error);
        }
      } else {
        // Add sample transactions for new users
        const sampleTransactions: Transaction[] = [
          {
            id: "welcome-1",
            type: "game_played",
            amount: -25,
            gameId: "demo-game-001",
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            description: "Welcome Battle - Pokemon Gacha",
          },
          {
            id: "welcome-2",
            type: "game_won",
            amount: 50,
            gameId: "demo-game-001",
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            description: "Won Welcome Battle!",
          },
        ];
        setTransactions(sampleTransactions);
      }
    }
  }, [address]);

  // Save wallet state to localStorage whenever it changes
  useEffect(() => {
    if (address) {
      localStorage.setItem(
        `wallet_balance_${address}`,
        walletBalance.toString()
      );
      localStorage.setItem(
        `wallet_transactions_${address}`,
        JSON.stringify(transactions)
      );
    }
  }, [walletBalance, transactions, address]);

  const socket = usePartySocket({
    host: "localhost:1999",
    room: "my-new-room",
  });

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Listen for game events to update wallet
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "game-created" || data.type === "game-joined") {
          // Update balance from server response
          if (data.newBalance !== undefined) {
            setWalletBalance(data.newBalance);
          }

          // Add transaction record
          const newTransaction: Transaction = {
            id: Date.now().toString(),
            type: "game_played",
            amount: -25,
            gameId: data.gameId,
            timestamp: new Date(),
            description:
              data.type === "game-created"
                ? "Created New Battle"
                : "Joined Battle",
          };

          setTransactions((prev) => [newTransaction, ...prev]);
        }

        if (data.type === "wallet-update") {
          // Update wallet from server
          setWalletBalance(data.balance);
          setTransactions(
            data.transactions.map((tx: any) => ({
              ...tx,
              timestamp: new Date(tx.timestamp),
            }))
          );
        }

        if (data.type === "game-updated" && data.gameState?.status) {
          const gameStatus = data.gameState.status;

          if (
            gameStatus === "1st_player_won" ||
            gameStatus === "2nd_player_won"
          ) {
            const isWinner = data.gameState.winner === address;

            if (isWinner) {
              // Winner gets $25 (opponent's money)
              const newBalance = walletBalance + 25;
              setWalletBalance(newBalance);

              const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: "game_won",
                amount: 25,
                gameId: data.gameState.id,
                timestamp: new Date(),
                description: "Won Battle - Earned opponent's $25",
              };

              setTransactions((prev) => [newTransaction, ...prev]);
            } else {
              // Loser - no additional transaction needed (already paid $25)
              const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: "game_lost",
                amount: 0,
                gameId: data.gameState.id,
                timestamp: new Date(),
                description: "Lost Battle - $25 already deducted",
              };

              setTransactions((prev) => [newTransaction, ...prev]);
            }
          }
        }

        if (
          data.type === "error" &&
          data.message.includes("Insufficient balance")
        ) {
          // Show error message to user
          alert("Insufficient balance! You need $25 to play.");
        }

        if (data.type === "game-updated" && data.gameState?.status) {
          const gameStatus = data.gameState.status;

          if (
            gameStatus === "1st_player_won" ||
            gameStatus === "2nd_player_won"
          ) {
            const isWinner = data.gameState.winner === address;

            if (isWinner) {
              // Winner gets $25 (opponent's money)
              const newBalance = walletBalance + 25;
              setWalletBalance(newBalance);

              const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: "game_won",
                amount: 25,
                gameId: data.gameState.id,
                timestamp: new Date(),
                description: "Won Battle - Earned opponent's $25",
              };

              setTransactions((prev) => [newTransaction, ...prev]);
            } else {
              // Loser - no additional transaction needed (already paid $25)
              const newTransaction: Transaction = {
                id: Date.now().toString(),
                type: "game_lost",
                amount: 0,
                gameId: data.gameState.id,
                timestamp: new Date(),
                description: "Lost Battle - $25 already deducted",
              };

              setTransactions((prev) => [newTransaction, ...prev]);
            }
          }
        }
      } catch (error) {
        console.error("Error processing wallet message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, address, walletBalance]);

  // Request wallet update when connecting
  useEffect(() => {
    if (socket && address) {
      socket.send(
        JSON.stringify({
          type: "get-wallet",
          senderId: address,
        })
      );
    }
  }, [socket, address]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async () => {
    try {
      await logout();
      window.location.href = "http://localhost:3000/";
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectModal(false);
  };

  const resetWallet = () => {
    setWalletBalance(1000);
    setTransactions([]);
    if (address) {
      localStorage.removeItem(`wallet_balance_${address}`);
      localStorage.removeItem(`wallet_transactions_${address}`);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Wallet and Disconnect Buttons Container */}
      <div className="relative flex items-center gap-3">
        {/* Disconnect Button */}
        <button
          onClick={handleDisconnectClick}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold shadow-lg transition-colors"
        >
          Disconnect
        </button>

        {/* Main Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-colors"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg">
              <span className="text-blue-300">◆</span>
              <span>{walletBalance >= 0 ? walletBalance : 0}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-white">★</span>
              <span>{address ? formatAddress(address) : "..."}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Expandable Wallet Panel - Positioned absolutely to prevent button movement */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 bg-gray-100 border-2 border-gray-400 rounded-lg shadow-xl w-80">
          {/* Header with Leaderboard and Chest */}
          <div className="bg-gray-200 p-3 border-b-2 border-gray-400 flex justify-between items-center">
            <button className="bg-yellow-400 text-black px-3 py-1 rounded font-bold text-sm flex items-center space-x-1">
              <span>🏆</span>
              <span>10K WEEKLY LEADERBOARD</span>
            </button>
            <button className="text-4xl">🎁</button>
          </div>

          {/* User Profile Section */}
          <div className="p-4 bg-gray-100">
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                🎮
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="text-black font-semibold">NO NAME</div>
                <div className="text-gray-600 text-sm font-mono">
                  {address ? formatAddress(address) : "Not connected"}
                </div>
                <button
                  className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                  onClick={() => {
                    if (address) {
                      navigator.clipboard.writeText(address);
                      setShowCopiedToast(true);
                      setTimeout(() => setShowCopiedToast(false), 2000);
                    }
                  }}
                >
                  📋 Copy
                </button>
              </div>

              {/* Gacha Points */}
              <div className="text-right">
                <div className="text-gray-600 text-xs">Gacha Points (GP)</div>
                <button className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                  1X GP
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-gray-400">
            <button
              onClick={() => setActiveTab("tokens")}
              className={`flex-1 px-4 py-2 font-medium transition-colors ${
                activeTab === "tokens"
                  ? "bg-gray-300 text-black border-b-2 border-blue-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-4 py-2 font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-gray-300 text-black border-b-2 border-blue-500"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              History
            </button>
          </div>

          {/* Content Area */}
          <div className="p-4 bg-white min-h-48">
            {activeTab === "tokens" ? (
              <div className="space-y-3">
                {tokens.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tokens found
                  </div>
                ) : (
                  tokens.map((token) => (
                    <div
                      key={token.id}
                      className="bg-gray-100 rounded p-3 flex items-center justify-between border border-gray-300"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold">
                          🪙
                        </div>
                        <div>
                          <div className="text-black font-semibold text-sm">
                            {token.name}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-black font-semibold text-sm">
                          {token.balance}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {formatCurrency(token.balance * token.value)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-gray-100 rounded p-3 flex items-center justify-between border border-gray-300"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            tx.type === "game_won"
                              ? "bg-green-500"
                              : tx.type === "game_lost"
                              ? "bg-red-500"
                              : "bg-blue-500"
                          }`}
                        >
                          {tx.type === "game_won"
                            ? "🎉"
                            : tx.type === "game_lost"
                            ? "😔"
                            : "🎮"}
                        </div>
                        <div>
                          <div className="text-black font-medium text-sm">
                            {tx.description}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {tx.gameId && `Game: ${tx.gameId.slice(0, 8)}...`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold text-sm ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {formatDate(tx.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-200 border-t-2 border-gray-400">
            <div className="text-center text-gray-600 text-xs mb-2">
              Balance: {formatCurrency(walletBalance)} | Game cost: $25
            </div>
            <div className="flex justify-center">
              <button
                onClick={resetWallet}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
                title="Reset wallet to $1000 (for testing)"
              >
                Reset Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-white">
              Disconnect Wallet
            </h3>
            <div className="mb-6">
              <p className="text-gray-300">
                Are you sure you want to disconnect your wallet? You will be
                redirected to the login page.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDisconnect}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Disconnect
              </button>
              <button
                onClick={handleCancelDisconnect}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-60">
          Address copied to clipboard!
        </div>
      )}
    </div>
  );
}
