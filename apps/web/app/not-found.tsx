import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-text-muted">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-text-primary">No path here.</h1>
        <p className="mt-2 text-text-secondary">
          The <em>bivium</em> you&apos;re looking for does not exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-arb-white hover:bg-accent-hover hover:shadow-glow-cyan transition-shadow duration-base ease-out-expo"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
