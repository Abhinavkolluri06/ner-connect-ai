import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>

      <p className="mt-4">
        {error
          ? `Connection error: ${error.message}`
          : `Supabase connected successfully. Rows found: ${data?.length ?? 0}`}
      </p>
    </main>
  );
}