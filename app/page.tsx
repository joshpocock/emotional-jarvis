import { Suspense } from "react";
import { connection } from "next/server";
import { business } from "@/lib/business";
import { memories } from "@/lib/memory";
import Dashboard from "@/components/Dashboard";

// Read data/business.json and data/memory.json on every request, so edits show up on refresh.
async function LiveDashboard() {
  await connection();
  return <Dashboard data={business()} memory={memories()} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LiveDashboard />
    </Suspense>
  );
}
