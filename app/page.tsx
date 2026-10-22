import { Suspense } from "react";
import { connection } from "next/server";
import { business } from "@/lib/business";
import Dashboard from "@/components/Dashboard";

// Read data/business.json on every request, so edits show up on refresh.
async function LiveDashboard() {
  await connection();
  return <Dashboard data={business()} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LiveDashboard />
    </Suspense>
  );
}
