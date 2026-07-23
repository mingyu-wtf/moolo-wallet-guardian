import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://moolo.local/", {
      headers: { accept: "text/html", host: "moolo.local" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders Moolo metadata and simulation shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>Moolo — Your Friendly Reactive Wallet Guardian<\/title>/i,
  );
  assert.match(html, /Waking up your guardian/);
  assert.match(html, /https:\/\/moolo\.local\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the simulation-only promise visible in product UI", async () => {
  const [app, notice, wallet, security, demo] = await Promise.all([
    readFile(new URL("../components/MooloApp.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/security/SimulationNotice.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/wallet/WalletShell.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/security/SecurityExperience.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../components/demo/DemoPanel.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(app, /Enter Demo Wallet/);
  assert.match(app, /No wallet\s+extension, signature, or real assets/);
  assert.match(notice, /Simulation Mode/);
  assert.match(notice, /No Onchain Transactions/);
  assert.match(wallet, /DemoPanel/);
  assert.match(demo, /Demo Control Panel/);
  assert.match(security, /SimulationNotice/);
  assert.doesNotMatch(`${app}${wallet}${security}`, /MetaMask|WalletConnect/);
});
