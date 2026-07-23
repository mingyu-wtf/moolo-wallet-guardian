# Moolo

**Your Friendly Reactive Wallet Guardian**

Moolo is an interactive, browser-only wallet security simulator created for a
Rialo Builders Hub presentation and community experience. It demonstrates what
reactive execution, native timers, privacy-aware policy checks, and future native
web calls could feel like inside an approachable EVM-style wallet interface.

## Simulation-only promise

Moolo never connects to a wallet, RPC endpoint, smart contract, token, or price
API. It never asks for a signature and never submits an onchain transaction.
Every balance, address, risk result, block number, fee, and transaction hash is
generated or stored locally in the browser.

## Features

- Welcome and demo-wallet unlock experience
- ETH, USDC, and RLO simulated balances and portfolio value
- Guided Send flow with EVM address and amount validation
- Pure rule-based risk engine with Low, Medium, High, and Critical results
- Normal transfer confirmation and simulated balance updates
- Phishing-address blocking with malicious reputation details
- Large-transfer Time Lock with persistent end time
- Guardian approval and rejection
- Unknown-contract analysis and unlimited-approval blocking
- AI agent daily-limit denial
- Emergency wallet freeze and five-step guardian recovery
- Activity history and simulated transaction details
- Persistent security settings and activity via Zustand and localStorage
- Desktop presentation control panel and a mobile demo sheet

## Technology

- Next.js App Router through Vinext
- TypeScript strict mode
- Tailwind CSS
- Framer Motion
- Lucide React
- Zustand with localStorage persistence
- ESLint and Node test runner

No backend, database, authentication system, or external API is required.

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The risk-engine unit suite covers trusted transfers, large/new-address scoring,
phishing blocking, agent overspend, score clamping, and risk-level boundaries.
The rendered-output tests verify the Moolo metadata, social card, starter cleanup,
and persistent simulation-only disclosure.

## Demo scenarios

Use the desktop **Demo Control Panel** or the mobile **Demo** menu:

1. Normal Transfer — 100 USDC to the trusted address
2. Large Transfer — 5,000 USDC to a new address
3. Phishing Address — a known malicious recipient with 128 reports
4. Unknown Contract — an unverified unlimited token approval
5. AI Agent Overspend — 50 USDC requested against a 10 USDC daily limit
6. Wallet Compromise — freeze outgoing activity and run recovery
7. Guardian Approval — approve or reject a pending protected transfer
8. Reset Demo — restore all settings, balances, and activity

## Rialo concept mapping

Moolo uses local simulation to illustrate future Rialo-oriented product ideas:

- **Reactive Execution:** risk policies run before a transaction result is shown.
- **Native Timers:** high-risk transfers can enter a persistent security delay.
- **Privacy:** no user identity, signature, or wallet connection is required.
- **Native Web Calls:** address reputation and contract analysis are represented
  as local deterministic data, showing where native information access could fit.

This is a concept demonstration only. It is not a live Rialo integration.
