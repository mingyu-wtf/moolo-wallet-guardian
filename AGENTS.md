# Moolo project guardrails

- Moolo is a simulation-only project.
- Do not add real wallet functionality, wallet extensions, signing, RPC calls,
  smart contracts, backend services, or payment functionality.
- Keep the UI friendly, warm, professional, and polished.
- Do not directly copy MetaMask branding or visual identity.
- Every transaction result and transaction-detail surface must include a clear
  simulation-only notice.
- Keep transaction settlement atomic and idempotent. Status changes must update
  the existing Activity record by transaction ID, never prepend duplicates.
- Time Lock completion must use the persisted `endsAt` value outside modal
  lifecycle, and cancellation must make later completion impossible.
- Treat critical phishing blocking as a baseline demo-safety policy even when
  optional protection is disabled.
- Preserve simulated balances during guardian recovery; Reset Demo alone
  restores default balances, settings, address, and starter activity.
- Run lint, typecheck, tests, and the production build after meaningful changes.
- Browser-check normal, Time Lock, Guardian, phishing, agent, Freeze/Recovery,
  Activity details, and Reset flows.
- Check 320, 375, 390, 768, and desktop layouts for horizontal overflow.
- User-visible product copy should be written in English by default.
