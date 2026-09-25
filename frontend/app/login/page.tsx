import type { Metadata } from "next";

import {
  ShieldCheck,
  Leaf,
  UsersRound,
} from "lucide-react";

import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative h-[calc(100vh-4.25rem)] w-full overflow-hidden bg-[#10283d]">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/login-landscape.jpg')",
        }}
      />

      {/* DARKNESS / CONTRAST */}
      <div className="absolute inset-0 bg-black/25" />

      {/* SUBTLE LIGHT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />

      {/* NORTHEAST MAP */}
      <div
        className="
          pointer-events-none
          absolute
          left-[43%]
          top-[2%]
          z-[1]
          h-[430px]
          w-[430px]
          bg-contain
          bg-center
          bg-no-repeat
          opacity-25
        "
        style={{
          backgroundImage: "url('/india-lights.png')",
        }}
      />

      {/* LEFT CONTENT */}
      <section
        className="
          absolute
          left-[6vw]
          top-[6%]
          z-[5]
          w-[40%]
          max-w-[600px]
        "
      >
        {/* NORTHEAST INDIA */}
        <p
          className="
            mb-3
            text-[11px]
            font-bold
            uppercase
            tracking-[0.35em]
            text-emerald-300
          "
        >
          Northeast India
        </p>

        {/* MAIN HEADING */}
        <h1
          className="
            text-[clamp(2.7rem,3.4vw,3.8rem)]
            font-bold
            leading-[0.92]
            tracking-[-0.045em]
            text-white
          "
        >
          Safer Routes.
          <br />
          Resilient Logistics.
          <br />
          <span className="text-emerald-400">
            Stronger Communities.
          </span>
        </h1>

        {/* DESCRIPTION */}
        <p
          className="
            mt-8
            max-w-[650px]
            text-[16px]
            leading-6
            text-white/90
          "
        >
          AI-powered route intelligence for a more connected,
          accessible and resilient Northeast India.
        </p>

        {/* FEATURES */}
        <div className="mt-6 flex flex-wrap items-center gap-7">

          {/* SAFER MOVEMENT */}
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-white/40
                bg-white/15
                text-emerald-300
                backdrop-blur-sm
              "
            >
              <ShieldCheck
                className="h-5 w-5"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                Safer
              </p>

              <p className="text-xs text-white/75">
                Movement
              </p>
            </div>
          </div>

          {/* MORE RESILIENT */}
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-white/40
                bg-white/15
                text-emerald-300
                backdrop-blur-sm
              "
            >
              <Leaf
                className="h-5 w-5"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                More Resilient
              </p>

              <p className="text-xs text-white/75">
                Supply Chains
              </p>
            </div>
          </div>

          {/* STRONGER COMMUNITIES */}
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border border-white/40
                bg-white/15
                text-emerald-300
                backdrop-blur-sm
              "
            >
              <UsersRound
                className="h-5 w-5"
                strokeWidth={1.8}
              />
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                Stronger
              </p>

              <p className="text-xs text-white/75">
                Communities
              </p>
            </div>
          </div>

        </div>

        {/* TAGLINE */}
        <p className="mt-4 text-sm italic text-white/80">
          "Connected terrains. Brighter tomorrows."
        </p>
      </section>

      {/* LOGIN CARD */}
      <div
        className="
          absolute
          right-[5vw]
          top-[5%]
          z-20
          w-[390px]
        "
      >
        <div
          className="
            rounded-[24px]
            border border-white/70
            bg-white/85
            px-6
            py-1
            shadow-[0_20px_60px_rgba(0,0,0,0.18)]
            backdrop-blur-md
          "
        >
          <LoginForm />
        </div>
      </div>

      {/* FOOTER */}
      {/* FOOTER */}
<footer
  className="
    absolute
    bottom-0
    left-0
    right-0
    z-30
    flex
    h-[52px]
    items-center
    justify-between
    border-t
    border-white/30
    bg-white/90
    px-8
    backdrop-blur-md
  "
>
  {/* LEFT DECORATION */}
  <div className="flex items-center gap-3">
    <img
      src="/footer-mountain.png"
      alt=""
      className="h-7 w-auto object-contain"
    />

    <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-500">
      FOR A MORE CONNECTED NORTHEAST INDIA
    </span>
  </div>

  {/* RIGHT DECORATION */}
  <div className="flex items-center gap-3">
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] leading-tight text-slate-500">
      PEOPLE
      <br />
      PLACES
      <br />
      POSSIBILITIES
    </span>

    <img
      src="/footer-plant.png"
      alt=""
      className="h-9 w-auto object-contain"
    />
  </div>
</footer>

    </main>
  );
}