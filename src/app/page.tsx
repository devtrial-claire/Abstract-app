"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { BackgroundEffects } from "@/components/ui/BackgroundEffects";
import { SignInButton } from "@/components/wallet/SignInButton";

export default function Home() {
  const { address, status } = useAccount();
  const router = useRouter();

  // Redirect to lobby if already authenticated
  useEffect(() => {
    if (address && status === "connected") {
      router.push("/lobby");
    }
  }, [address, status, router]);

  // Show loading while checking connection status
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        <BackgroundEffects />
        <main className="relative flex flex-col items-center justify-center z-10 text-white text-center min-h-screen">
          <div className="flex flex-col items-center gap-8">
            <div className="animate-spin w-16 h-16 border-4 border-white border-t-transparent rounded-full"></div>
            <p className="text-lg font-[family-name:var(--font-roobert)]">
              Connecting to wallet...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!address || status !== "connected") {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        <BackgroundEffects />

        <main className="relative flex flex-col items-center justify-center z-10 text-white text-center min-h-screen">
          <div className="flex flex-col items-center gap-12 max-w-md mx-auto px-6">
            {/* Game Title */}
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-yellow-400 font-[family-name:var(--font-roobert)]">
                Pokémon Gacha
              </h1>
              <p className="text-xl text-gray-300 font-[family-name:var(--font-roobert)]">
                Battle with your Pokémon cards
              </p>
            </div>

            {/* Login Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm w-full">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold font-[family-name:var(--font-roobert)]">
                    Welcome to the Battle Arena
                  </h2>
                  <p className="text-gray-400 font-[family-name:var(--font-roobert)]">
                    Connect your wallet to start battling
                  </p>
                </div>

                <div className="flex justify-center">
                  <SignInButton />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500 font-[family-name:var(--font-roobert)]">
                Powered by Abstract Global Wallet
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // This should never be reached due to the redirect, but just in case
  return null;
}
