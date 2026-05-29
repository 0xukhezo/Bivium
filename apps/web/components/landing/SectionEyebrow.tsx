export function SectionEyebrow({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-text-muted">
      <span className="text-accent">{label}</span>
    </div>
  );
}
