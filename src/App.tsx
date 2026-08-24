// Phase 1 shell only — the prompt box, parse breakdown and results grid land in
// later phases. Single view by design: no router.
export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        House Hunter — demo
      </h1>
      <p className="text-slate-600">
        Natural-language property search over a synthetic dataset of Irish
        listings.
      </p>
    </main>
  );
}
