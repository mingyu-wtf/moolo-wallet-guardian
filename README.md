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
- Idempotent Guardian approval and rejection that update one activity record
- Unknown-contract analysis and unlimited-approval blocking
- AI agent daily-limit denial
- Emergency wallet freeze and five-step guardian recovery
- Activity history and simulated transaction details
- Persistent security settings and activity via Zustand and localStorage
- Corruption-safe persisted state migration and a confirmed full reset
- Keyboard-contained dialogs, focus restoration, reduced motion, and live feedback
- Desktop presentation control panel and a mobile demo sheet
- Official supplied Rialo mark in restrained welcome, network, and architecture UI
- Scenario-specific Rialo workflow summaries with four persisted execution traces

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
phishing blocking, unknown contracts, agent overspend, disabled optional
protection, score clamping, and risk-level boundaries. State-transition tests
cover single balance deduction, Time Lock completion and cancellation, Guardian
idempotency, Freeze/Recovery, insufficient simulated funds, and persisted-state
sanitization. Rialo workflow tests verify all four primitives, scenario-specific
decisions, timer transitions, safe architecture labels, and legacy migration.
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

For presentation repeatability, **Reset Demo** restores 3.42 ETH, 8,250 USDC,
1,240 RLO, the original demo address, default protection policies, and the
single starter receive activity. It also removes pending Time Locks, recovery
state, settled transaction IDs, and the `moolo-wallet` localStorage record.

Recovery intentionally preserves the current simulated balances while assigning
the protected recovery address. Critical phishing addresses remain blocked even
when optional Moolo Protection is off; the Shield screen states this baseline
safety policy explicitly.

## Presenter verification path

Before a live Builders Hub session:

1. Reset the demo and unlock with any non-empty demo password.
2. Run Normal Transfer and confirm one 100 USDC deduction.
3. Run Large Transfer and choose Time Lock or Guardian review.
4. Run Phishing Address, Unknown Contract, and AI Agent Overspend.
5. Run Wallet Compromise, complete all five recovery steps, and confirm Send is
   available again.
6. Open Activity details to show reasons, applied policies, simulated fee,
   block, timestamp, transaction hash, and the persisted Rialo execution trace.
7. Open **Why Rialo?** in Shield or the header network badge to explain the
   architecture and its explicit simulation boundary.

Scenario controls refuse conflicting pending/frozen flows and explain when a
reset is required to restore enough simulated funds.

## Rialo concept mapping

Moolo uses a local, typed workflow model to illustrate four Rialo-oriented
architecture primitives:

- **Reactive Transaction:** a predefined predicate can automatically allow,
  delay, deny, freeze, or route a request to a guardian.
- **Native Timer:** Time Lock, guardian wait, and recovery paths expose a
  simulated time-condition state.
- **Validator-attested Web Call:** deterministic local reputation, contract, and
  behavior data stands in for a **Simulated external signal**.
- **Private Policy Evaluation:** the result is visible while sensitive policy
  inputs remain summarized as a **REX concept simulation**.

Every major scenario creates a `RialoWorkflowSummary` with four
`RialoExecutionTrace` records. Their statuses transition with the simulated
transaction and persist into Activity details. This is a local front-end
architecture concept only: no Rialo SDK, RPC, validator, confidential execution,
or live network is used.
