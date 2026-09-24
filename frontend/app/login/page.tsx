import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In · NER-Connect AI",
  description: "Sign in or create an operator profile for the NER-Connect AI route intelligence platform.",
};

export default function LoginPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-x-hidden"
    >
      {/* Immersive Scenic Photography Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/imagery/login-landscape.jpg"
          alt="Mist-covered mountain highways of Meghalaya and Assam"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Soft, rich atmospheric overlay preserving the landscape colors while ensuring crisp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/50" />
      </div>

      <div className="w-full max-w-6xl mx-auto relative z-10 py-6 sm:py-10">
        <Suspense
          fallback={
            <div className="w-full max-w-md mx-auto animate-pulse space-y-4 rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl">
              <div className="h-8 w-40 rounded-xl bg-slate-200" />
              <div className="h-4 w-60 rounded bg-slate-100" />
              <div className="h-12 w-full rounded-xl bg-slate-100 mt-6" />
              <div className="h-12 w-full rounded-xl bg-slate-100 mt-4" />
              <div className="h-12 w-full rounded-xl bg-[#081F31]/30 mt-6" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
