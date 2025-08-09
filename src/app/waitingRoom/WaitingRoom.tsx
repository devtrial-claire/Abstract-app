"use client";

export function WaitingRoom() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="mx-auto max-w-6xl">
        {/* Top cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
          <div className="bg-gray-300 text-black rounded p-6 min-h-[140px] flex flex-col justify-between">
            <div className="text-2xl font-extrabold tracking-wide">YOU</div>
            <div className="text-3xl font-bold">$0</div>
          </div>

          <div className="bg-gray-300 text-black rounded p-6 min-h-[140px] flex flex-col justify-between">
            <div className="text-2xl font-extrabold tracking-wide">
              OPPONENT
            </div>
            <div className="text-3xl font-bold">$0</div>
          </div>
        </div>

        {/* Bottom banner */}
        <div className="relative mt-10">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-300 via-lime-300 to-cyan-400 opacity-40 blur-lg" />
          <div className="relative rounded-xl border border-white/10 bg-neutral-900/60 px-6 py-8 text-center">
            <div className="text-3xl md:text-4xl font-extrabold tracking-wide text-yellow-200">
              WAITING FOR OPPONENT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
