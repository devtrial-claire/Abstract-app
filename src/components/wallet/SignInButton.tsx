import React, { useState } from "react";
import Image from "next/image";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";

export function SignInButton() {
  const { login } = useLoginWithAbstract();
  const { status } = useAccount();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };

  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="flex items-center justify-center w-10 h-10">
        <div className="animate-spin">
          <Image src="/abs.svg" alt="Loading" width={24} height={24} />
        </div>
      </div>
    );
  }

  return (
    <button
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-yellow-400 text-black gap-3 hover:bg-yellow-300 hover:cursor-pointer text-lg font-bold h-14 px-8 font-[family-name:var(--font-roobert)] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleLogin}
      disabled={isLoggingIn}
    >
      {isLoggingIn ? (
        <>
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full"></div>
          Connecting...
        </>
      ) : (
        <>
          <Image
            src="/abs.svg"
            alt="Abstract logomark"
            width={24}
            height={24}
            style={{ filter: "brightness(0)" }}
          />
          Login to Play
        </>
      )}
    </button>
  );
}
