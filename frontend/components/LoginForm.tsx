"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        const { error } = await supabase.auth.signInWithPassword({
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
        setMessage("Account created successfully. Opening the route planner...");
        router.push("/");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account, then sign in.",
      );
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy-800/15";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-md"
    >
      <h1 className="text-2xl font-semibold text-navy-900">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        {mode === "signin"
          ? "Use your work email to access NER-Connect AI."
          : "Create an account to access NER-Connect AI."}
      </p>

      <div className="mt-8">
        <label
          htmlFor="email"
          className="text-sm font-medium text-navy-900"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null);
            setMessage(null);
          }}
          className={inputClass}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
          disabled={loading}
        />

        {emailError ? (
          <p
            id="email-error"
            className="mt-1 text-xs text-red-800"
            role="alert"
          >
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-navy-900"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete={
            mode === "signin" ? "current-password" : "new-password"
          }
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(null);
            setMessage(null);
          }}
          className={inputClass}
          aria-invalid={Boolean(passwordError)}
          aria-describedby={
            passwordError ? "password-error" : undefined
          }
          disabled={loading}
        />

        {passwordError ? (
          <p
            id="password-error"
            className="mt-1 text-xs text-red-800"
            role="alert"
          >
            {passwordError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-8 w-full rounded bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Please wait..."
          : mode === "signin"
            ? "Sign In"
            : "Create Account"}
      </button>

      {message ? (
        <p
          className="mt-4 text-sm text-slate-700"
          role="status"
        >
          {message}

          {mode === "signin" ? (
            <>
              {" "}
              <Link
                href="/"
                className="font-medium text-navy-800 underline"
              >
                Open planner
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        {mode === "signin" ? (
          <>
            Need an account?{" "}
            <button
              type="button"
              className="font-medium text-navy-800 underline"
              onClick={() => {
                setMode("create");
                setMessage(null);
                setEmailError(null);
                setPasswordError(null);
              }}
              disabled={loading}
            >
              Create Account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-navy-800 underline"
              onClick={() => {
                setMode("signin");
                setMessage(null);
                setEmailError(null);
                setPasswordError(null);
              }}
              disabled={loading}
            >
              Sign In
            </button>
          </>
        )}
      </p>
    </form>
  );
}