"use client";

import { RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Moolo recovered from a UI error", error);
  }, [error]);

  const resetLocalDemo = () => {
    try {
      localStorage.removeItem("moolo-wallet");
    } finally {
      window.location.reload();
    }
  };

  return (
    <main className="error-screen">
      <section className="error-card" role="alert">
        <ShieldAlert size={32} aria-hidden="true" />
        <span className="eyebrow">Safe recovery</span>
        <h1>Moolo hit a demo-only error</h1>
        <p>
          No real wallet or assets are connected. Try the screen again, or
          clear the local demo state if the problem continues.
        </p>
        <button className="primary-button full-button" type="button" onClick={reset}>
          Try again
        </button>
        <button
          className="secondary-button full-button"
          type="button"
          onClick={resetLocalDemo}
        >
          <RotateCcw size={17} aria-hidden="true" />
          Reset local demo
        </button>
      </section>
    </main>
  );
}
