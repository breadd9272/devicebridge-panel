"use client";

/**
 * Global Error Boundary.
 * Catches any uncaught error during render so the user sees a clean
 * "Something went wrong" card with recovery actions instead of the
 * raw white "Application error: a client-side exception" overlay.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            color: "#e5e7eb",
            fontFamily: "system-ui, sans-serif",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              borderRadius: "0.75rem",
              border: "1px solid #2a2a3a",
              background: "rgba(18,18,26,0.8)",
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{ color: "#ef4444", fontSize: "1.25rem" }}>⚠</span>
              <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#fff" }}>
                Something went wrong
              </h1>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "1rem" }}>
              The page hit an unexpected error. Your data is safe — try reloading, or go back to the
              dashboard.
            </p>
            {error?.message && (
              <pre
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a3a",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  marginBottom: "1rem",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {error.message}
              </pre>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => reset()}
                style={{
                  flex: 1,
                  background: "rgba(0,240,255,0.15)",
                  color: "#00f0ff",
                  border: "1px solid rgba(0,240,255,0.4)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1rem",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "rgba(26,26,36,1)",
                  color: "#d1d5db",
                  border: "1px solid #2a2a3a",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1rem",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                }}
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
