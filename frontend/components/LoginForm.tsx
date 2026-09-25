"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "create";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] =
    useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage(null);

    const nextEmailError = !email.trim()
      ? "Enter your email."
      : isValidEmail(email.trim())
        ? null
        : "Enter a valid email address.";

    const nextPasswordError = !password
      ? "Enter your password."
      : password.length < 8
        ? "Use at least 8 characters."
        : null;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account.",
      );
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[410px]">
      {/* BRAND */}

      <div className="flex flex-col items-center text-center">
        <div className="flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-[12px]">
          <img
            src="/brand-logo.png"
            alt="NER-Connect AI"
            className="h-full w-full object-contain"
          />
        </div>

        <h2 className="mt-2 text-[18px] font-bold tracking-[0.12em] text-[#092342]">
          NER-CONNECT AI
        </h2>

        <p className="mt-0.5 text-[7px] font-semibold tracking-[0.22em] text-slate-500">
          SMART LOGISTICS &amp; ACCESSIBILITY INTELLIGENCE
        </p>
      </div>

      <div className="my-3 h-px bg-slate-200" />

      {/* HEADING */}

      <div className="text-center">
        <h1 className="text-[23px] font-bold tracking-[-0.025em] text-[#092342]">
          {mode === "signin"
            ? "Welcome Back"
            : "Create Account"}
        </h1>

        <p className="mx-auto mt-1.5 max-w-[290px] text-[12px] leading-4 text-slate-500">
          {mode === "signin"
            ? "Sign in to continue your journey towards safer and smarter logistics."
            : "Create an account to access NER-Connect AI."}
        </p>
      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-4"
      >
        {/* EMAIL */}

        <div>
          <label
            htmlFor="email"
            className="text-[12px] font-bold text-[#092342]"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@organization.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
              setMessage(null);
            }}
            disabled={loading}
            className="
              mt-1.5
             h-[38px]
              w-full
              rounded-[9px]
              border
              border-slate-200
              bg-white
              px-3.5
              text-sm
              text-[#092342]
              outline-none
              placeholder:text-slate-400
              focus:border-emerald-500
              focus:ring-2
              focus:ring-emerald-500/10
            "
          />

          {emailError && (
            <p className="mt-1 text-[10px] text-red-700">
              {emailError}
            </p>
          )}
        </div>

        {/* PASSWORD */}

        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[12px] font-bold text-[#092342]"
            >
              Password
            </label>

            {mode === "signin" && (
              <button
                type="button"
                className="text-[11px] font-semibold text-emerald-700"
              >
                Forgot password?
              </button>
            )}
          </div>

          <div className="relative mt-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError(null);
                setMessage(null);
              }}
              disabled={loading}
              className="
                h-[38px]
                w-full
                rounded-[9px]
                border
                border-slate-200
                bg-white
                px-3.5
                pr-10
                text-sm
                text-[#092342]
                outline-none
                placeholder:text-slate-400
                focus:border-emerald-500
                focus:ring-2
                focus:ring-emerald-500/10
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((value) => !value)
              }
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {passwordError && (
            <p className="mt-1 text-[10px] text-red-700">
              {passwordError}
            </p>
          )}
        </div>

        {/* REMEMBER */}

        {mode === "signin" && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
            />

            <span>Remember me</span>
          </label>
        )}

        {/* BUTTON */}

        <button
          type="submit"
          disabled={loading}
          className="
            mt-4
            flex
            h-[38px]
            w-full
            items-center
            justify-center
            gap-2
            rounded-[9px]
            bg-[#092342]
            text-[13px]
            font-bold
            text-white
            shadow-sm
            transition
            hover:bg-[#0c315b]
            disabled:opacity-60
          "
        >
          {loading
            ? "Please wait..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}

          {!loading && (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
        </button>

        {message && (
          <p className="mt-2 text-center text-[10px] text-slate-600">
            {message}
          </p>
        )}
      </form>

      {/* OR */}

      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-[10px] font-medium text-slate-400">
          OR
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* GOOGLE */}

      <button
        type="button"
        className="
          flex
         h-[36px]
          w-full
          items-center
          justify-center
          gap-2.5
          rounded-[9px]
          border
          border-slate-200
          bg-white
          text-[12px]
          font-semibold
          text-[#092342]
        "
      >
        <span className="text-base font-bold text-blue-600">
          <svg
  className="h-5 w-5"
  viewBox="0 0 48 48"
  aria-hidden="true"
>
  <path
    fill="#FFC107"
    d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19-7.3 19-20 0-1.3-.1-2.3-.4-3.5z"
  />
  <path
    fill="#FF3D00"
    d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
  />
  <path
    fill="#4CAF50"
    d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.6 35.1 26.9 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"
  />
  <path
    fill="#1976D2"
    d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.8 5.6-7 6.8l6.2 5.2C38.1 36.7 43 31.1 43 24c0-1.3-.1-2.3-.4-3.5z"
  />
</svg>
        </span>

        Continue with Google
      </button>

      {/* CREATE ACCOUNT */}

      <div className="mt-3 border-t border-slate-200 pt-2 text-center">
        <span className="text-[11px] text-slate-500">
          {mode === "signin"
            ? "Need an account? "
            : "Already have an account? "}
        </span>

        <button
          type="button"
          onClick={() => {
            setMode((current) =>
              current === "signin" ? "create" : "signin",
            );

            setMessage(null);
            setEmailError(null);
            setPasswordError(null);
          }}
          className="text-[11px] font-semibold text-emerald-700"
        >
          {mode === "signin"
            ? "Create operator profile"
            : "Sign in"}
        </button>
      </div>
    </div>
  );
}