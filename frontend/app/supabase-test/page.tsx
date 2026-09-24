import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  // Prevent route exposure in production environments
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  return (
    <main id="main-content" className="min-h-screen p-10 font-sans">
      <div className="max-w-xl rounded-2xl border border-[#E1E8ED] bg-white p-6 shadow-sm">
        <span className="rounded-full bg-[#FFFDF5] border border-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D97706]">
          Development Only
        </span>
        <h1 className="mt-2 text-xl font-bold text-[#0C2A40]">
          Supabase Connectivity Diagnostic
        </h1>

        <div className="mt-4 rounded-xl border border-[#E1E8ED] bg-[#F8FAF9] p-4">
          <p className="text-xs font-semibold text-[#8696A3]">Status</p>
          <p className="mt-1 text-sm font-medium text-[#0C2A40]">
            {error
              ? `Connection check failed (${error.code || "SERVICE_UNAVAILABLE"}). Check local environment variables.`
              : `Connection active. Profile table query successful (${data?.length ?? 0} sample rows).`}
          </p>
        </div>
      </div>
    </main>
  );
}