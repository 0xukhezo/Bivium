// Visible marker for UI sections still backed by mock data. Pairs with a
// red border on the surrounding container. Delete the badge + override the
// border back to `border-border` when the section flips to real data.
export function MockBadge({ children = "Mock data" }: { children?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-danger/40 bg-danger/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-danger">
      {children}
    </span>
  );
}
