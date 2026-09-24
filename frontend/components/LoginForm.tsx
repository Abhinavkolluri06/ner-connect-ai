"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ShieldCheck,
  Truck,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Mountain,
  Lock,
  CloudRain,
  Activity,
  Zap,
  Server,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  isValidEmail,
  getSafeRedirectUrl,
  sanitizeAuthError,
} from "@/lib/auth-utils";

export { isValidEmail, getSafeRedirectUrl, sanitizeAuthError };

type Mode = "signin" | "create" | "forgot";

type OperatorPreset = {
  role: string;
  hub: string;
  email: string;
  pass: string;
  icon: typeof Truck;
  description: string;
};

const OPERATOR_PRESETS: OperatorPreset[] = [
  {
    role: "Fleet Dispatcher",
    hub: "Guwahati Hub",
    email: "dispatcher.guwahati@nerconnect.ai",
    pass: "Dispatch2026!",
    icon: Truck,
    description: "Arterial freight & heavy cargo coordination",
  },
  {
    role: "Relief Coordinator",
    hub: "SDMA Shillong",
    email: "relief.shillong@nerconnect.ai",
    pass: "Relief2026!",
    icon: ShieldCheck,
    description: "Emergency medical & monsoon relief routing",
  },
  {
    role: "Corridor Specialist",
    hub: "Silchar Transit",
    email: "corridor.silchar@nerconnect.ai",
    pass: "Corridor2026!",
    icon: Mountain,
    description: "Barak Valley landslide & slope risk analysis",
  },
];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTarget = getSafeRedirectUrl(
    searchParams.get("returnUrl") || searchParams.get("redirect"),
  );

  function handleSelectPreset(preset: OperatorPreset) {
    setEmail(preset.email);
    setPassword(preset.pass);
    setEmailError(null);
    setPasswordError(null);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(null);

    const nextEmailError = !email.trim()
      ? "Enter your email address."
      : isValidEmail(email.trim())
        ? null
        : "Enter a valid email address.";

    setEmailError(nextEmailError);

    if (mode === "forgot") {
      if (nextEmailError) return;

      setLoading(true);
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/login?mode=reset`,
        });
        setMessage(
          "If an account with that email exists, password recovery instructions have been sent. Please check your inbox and spam folder.",
        );
      } catch {
        setMessage(
          "If an account with that email exists, password recovery instructions have been sent. Please check your inbox and spam folder.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const nextPasswordError = !password
      ? "Enter your password."
      : password.length < 8
        ? "Password must be at least 8 characters."
        : null;

    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setMessage(sanitizeAuthError(error.message));
          return;
        }

        router.push(redirectTarget);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}${redirectTarget}`
                : undefined,
          },
        });

        if (error) {
          setMessage(sanitizeAuthError(error.message));
          return;
        }

        setMessage("Account created. Please check your email for confirmation link.");
      }
    } catch {
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch py-6 lg:py-12">
      {/* LEFT STORY / REGION PANEL (Visible on lg, simplified on mobile) */}
      <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl border border-white/20 bg-black/40 backdrop-blur-md p-8 lg:p-10 relative overflow-hidden shadow-2xl">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-950/60 backdrop-blur-md px-3.5 py-1 text-[11px] font-bold tracking-wider text-emerald-300 uppercase shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Northeast India</span>
            </div>
            {/* Live Telemetry Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-black/50 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-emerald-300 shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Telemetry Active: Go :8080 &bull; 8 States Synced</span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-sm">
              Safer Routes.<br />
              Resilient Logistics.<br />
              <span className="text-emerald-400">Stronger Communities.</span>
            </h1>
            <p className="pt-2 text-sm leading-relaxed text-slate-200 max-w-md drop-shadow-sm">
              Risk-aware route intelligence for a more connected, accessible, and resilient Northeast India.
            </p>
          </div>

          {/* 3 Core Value Items */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-3.5 shadow-lg transition hover:bg-white/15">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Safer Movement</p>
                <p className="text-slate-200 leading-relaxed mt-0.5">
                  Evaluates mountain road hazards, monsoon rains, and terrain slopes before departure.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-3.5 shadow-lg transition hover:bg-white/15">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                <Truck className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">More Resilient Supply Chains</p>
                <p className="text-slate-200 leading-relaxed mt-0.5">
                  Discovers reliable alternate highway corridors when key mountain passes bottleneck.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-3.5 shadow-lg transition hover:bg-white/15">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Stronger Communities</p>
                <p className="text-slate-200 leading-relaxed mt-0.5">
                  Ensures relief supplies and essential cargo reach isolated hill settlements safely.
                </p>
              </div>
            </div>
          </div>

          {/* Regional Weather & Monsoon Advisory Notice */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-950/40 backdrop-blur-md p-3.5 shadow-lg text-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/25 border border-amber-400/30 text-amber-300">
                <CloudRain className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-amber-200">Active Regional Monsoon Advisory</p>
                  <span className="rounded bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                    Live Alert
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed text-[11px]">
                  High precipitation detected along <strong className="text-amber-200">NH-6 (Jowai-Ratacherra)</strong> and <strong className="text-amber-200">NH-29 (Dimapur-Kohima)</strong>. Hazard engines actively adjusting arterial weights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Highland Regional Status Pill */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-3.5 text-xs shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/25 border border-emerald-400/30 text-emerald-300">
              <Mountain className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white">Highland Corridors Network</p>
              <p className="text-[11px] text-slate-300">Meghalaya, Assam &amp; Himalayan Foothills</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-950/60 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Active Terrain
          </span>
        </div>
      </div>

      {/* RIGHT AUTH CARD */}
      <div className="lg:col-span-6 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto rounded-3xl border border-white/80 bg-white p-7 lg:p-9 shadow-2xl">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#E1E8ED]">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6] p-1.5 shadow-soft">
              <Image
                src="/ner-connect-logo.png.jpeg"
                alt="NER-Connect AI Logo"
                fill
                sizes="44px"
                className="object-cover rounded-xl"
              />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#081F31]">
                NER-CONNECT AI
              </h2>
              <p className="text-[11px] font-medium text-[#5C6F80]">
                Smart Logistics &amp; Accessibility Intelligence
              </p>
            </div>
          </div>

          {/* Form Title & Mode Switcher */}
          <div className="pt-5">
            <h3 className="text-2xl font-bold tracking-tight text-[#081F31]">
              {mode === "signin"
                ? "Welcome Back"
                : mode === "create"
                  ? "Create Operator Account"
                  : "Reset Password"}
            </h3>
            <p className="mt-1 text-xs text-[#5C6F80]">
              {mode === "signin"
                ? "Sign in to access route planning and saved assessments."
                : mode === "create"
                  ? "Register to save corridors and track regional logistics."
                  : "Enter your verified email to receive reset instructions."}
            </p>
          </div>

          {/* Quick Demo Operator Presets (1-Click Fill) */}
          {mode === "signin" && (
            <div className="mt-4 rounded-2xl border border-[#DEF8ED] bg-[#EFFBF6]/90 p-3">
              <div className="flex items-center justify-between pb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#087657]">
                  <Zap className="h-3.5 w-3.5 text-[#0A9169]" />
                  Quick Demo Profiles
                </span>
                <span className="text-[10px] font-medium text-[#5C6F80]">1-Click Autofill</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {OPERATOR_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = email === preset.email;
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                        isSelected
                          ? "border-[#0A9169] bg-[#0A9169] text-white shadow-soft"
                          : "border-[#D0E7DC] bg-white text-[#0C2A40] hover:border-[#0A9169] hover:bg-[#F2FAF6]"
                      }`}
                      title={`${preset.role} (${preset.hub}) - ${preset.description}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-[#087657]"}`} />
                      <span className="mt-1 text-[10px] font-bold leading-tight line-clamp-1">{preset.role.split(" ")[0]}</span>
                      <span className={`text-[9px] leading-tight ${isSelected ? "text-emerald-100" : "text-[#5C6F80]"}`}>{preset.hub.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alert Message */}
          {message && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs ${
                message.includes("sent") || message.includes("created")
                  ? "border-[#DEF8ED] bg-[#EFFBF6] text-[#087657]"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.includes("sent") || message.includes("created") ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A9169] mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <p className="leading-relaxed">{message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[#0C2A40]"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="operator@ner-connect.gov.in"
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#0C2A40] placeholder-[#8696A3] shadow-soft focus:border-[#0A9169] focus:outline-none focus:ring-2 focus:ring-[#DEF8ED] transition-colors ${
                  emailError ? "border-red-400 bg-red-50/20" : "border-[#E1E8ED]"
                }`}
                aria-invalid={emailError ? "true" : "false"}
                aria-describedby={emailError ? "auth-email-error" : undefined}
              />
              {emailError && (
                <p id="auth-email-error" className="mt-1 text-xs text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-[#0C2A40]"
                  >
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setMessage(null);
                      }}
                      className="text-xs font-medium text-[#087657] hover:text-[#0A9169] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Enter at least 8 characters"
                    className={`block w-full rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#0C2A40] placeholder-[#8696A3] shadow-soft focus:border-[#0A9169] focus:outline-none focus:ring-2 focus:ring-[#DEF8ED] transition-colors ${
                      passwordError ? "border-red-400 bg-red-50/20" : "border-[#E1E8ED]"
                    }`}
                    aria-invalid={passwordError ? "true" : "false"}
                    aria-describedby={passwordError ? "auth-password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8696A3] hover:text-[#0C2A40]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p id="auth-password-error" className="mt-1 text-xs text-red-600">
                    {passwordError}
                  </p>
                )}
              </div>
            )}

            {mode === "signin" && (
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  id="auth-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#E1E8ED] text-[#087657] focus:ring-[#DEF8ED]"
                />
                <label htmlFor="auth-remember" className="text-xs text-[#5C6F80]">
                  Remember this device for 30 days
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#081F31] px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-[#0C2A40] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Processing...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>
                    {mode === "signin"
                      ? "Sign In to Dispatch"
                      : mode === "create"
                        ? "Create Account"
                        : "Send Reset Link"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          {/* Alternate Modes Switcher */}
          <div className="mt-5 border-t border-[#E1E8ED] pt-4 text-center text-xs text-[#5C6F80]">
            {mode === "signin" ? (
              <p>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setMessage(null);
                  }}
                  className="font-semibold text-[#087657] hover:underline"
                >
                  Create operator profile
                </button>
              </p>
            ) : (
              <p>
                Remembered your credentials?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setMessage(null);
                  }}
                  className="font-semibold text-[#087657] hover:underline"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>

          {/* Enterprise Security & Trust Strip */}
          <div className="mt-4 border-t border-[#E1E8ED] pt-3.5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-[#F8FAF9] border border-[#E1E8ED]/70 p-2">
                <Lock className="h-3.5 w-3.5 text-[#087657]" />
                <span className="text-[10px] font-bold text-[#0C2A40]">RLS Protected</span>
                <span className="text-[9px] text-[#5C6F80]">Supabase Auth</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-[#F8FAF9] border border-[#E1E8ED]/70 p-2">
                <Server className="h-3.5 w-3.5 text-[#087657]" />
                <span className="text-[10px] font-bold text-[#0C2A40]">256-Bit Guard</span>
                <span className="text-[9px] text-[#5C6F80]">Go Engine</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-[#F8FAF9] border border-[#E1E8ED]/70 p-2">
                <Activity className="h-3.5 w-3.5 text-[#087657]" />
                <span className="text-[10px] font-bold text-[#0C2A40]">OSRM &amp; IMD</span>
                <span className="text-[9px] text-[#5C6F80]">Ground Truth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}