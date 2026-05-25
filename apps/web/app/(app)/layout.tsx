import { AppHeader } from "@/components/layout/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-screen-2xl px-6 py-10 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
