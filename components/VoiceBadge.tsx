// Names the voice engine at the top of the orb panel. Lives in the layout, so every step shows it.
export default function VoiceBadge() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[104px] z-10 hidden -translate-x-1/2 items-center gap-2.5 rounded-full border border-[rgba(212,176,76,0.45)] bg-panel px-4 py-1.5 text-[13px] lg:flex">
      <span className="label">Voice</span>
      <span className="font-semibold text-accent">Fish Audio Drama 3</span>
    </div>
  );
}
