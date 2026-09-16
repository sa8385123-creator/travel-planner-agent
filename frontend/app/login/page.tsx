"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fraunces } from "next/font/google";
import { setToken } from "@/lib/auth";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        mode === "login"
          ? `${process.env.NEXT_PUBLIC_API_URL}/auth/login`
          : `${process.env.NEXT_PUBLIC_API_URL}/auth/signup`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail ?? "Something went wrong, please try again.");
      }

      setToken(data.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="relative min-h-screen bg-[#F7F3EC] flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            {/* Flight path */}
            <path d="M100 200 Q600 0 1100 200" stroke="#1B3A4B" strokeWidth="2" fill="none" opacity="0.1" strokeDasharray="8,4" className="login-flight-path" />
            <circle cx="1100" cy="200" r="8" fill="#1B3A4B" opacity="0.1" />
            {/* Sun */}
            <circle cx="600" cy="150" r="80" fill="#E8641C" opacity="0.05" />
            {/* Far mountains */}
            <path d="M0 600 L300 400 L600 500 L900 350 L1200 450 L1200 800 L0 800 Z" fill="#1B3A4B" opacity="0.08" />
            {/* Near mountains */}
            <path d="M0 650 L200 450 L500 550 L800 400 L1100 500 L1200 600 L1200 800 L0 800 Z" fill="#4A7C82" opacity="0.06" />
          </svg>
        </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1B3A4B] text-white drop-shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-1 .1-1.3.5l-.7.7c-.6.6-.5 1.6.3 2l5.9 2.5L6 15H2l-1 1 3 2 2 3 1-1v-4l3.5-3.5 2.5 5.9c.4.8 1.4.9 2 .3l.7-.7c.4-.3.6-.8.5-1.3z" />
            </svg>
          </div>
          <h1 className={`${fraunces.className} text-2xl text-[#1B3A4B] mt-2`}>Travel Planner</h1>
          <p className="text-sm text-[#4A7C82]">Plan your next adventure</p>
        </div>

        <div className="flex rounded-xl bg-[#F7F3EC] p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "login" ? "bg-[#1B3A4B] text-white" : "text-[#4A7C82]"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-[#1B3A4B] text-white" : "text-[#4A7C82]"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[#1B3A4B]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E0DCCC] px-4 py-2 text-[#1B3A4B] outline-none focus:ring-2 focus:ring-[#E8641C]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#1B3A4B]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E0DCCC] px-4 py-2 text-[#1B3A4B] outline-none focus:ring-2 focus:ring-[#E8641C]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-[#E8641C] bg-[#FFF4F0] px-4 py-2 text-sm text-[#E8641C]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1B3A4B] px-4 py-2 font-medium text-white transition-colors hover:bg-[#162e3c] disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}

