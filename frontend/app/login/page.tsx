import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-start justify-center px-4 py-16 sm:px-6">
      <LoginForm />
    </div>
  );
}
