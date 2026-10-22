import { Suspense } from "react";
import { connection } from "next/server";
import { business } from "@/lib/business";
import { myVoice } from "@/lib/voice";
import Dashboard from "@/components/Dashboard";

// Read data/business.json on every request, so edits show up on refresh.
async function LiveDashboard() {
  await connection();
  return <Dashboard data={business()} ownVoice={myVoice() !== null} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LiveDashboard />
    </Suspense>
  );
}
