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
    /<title>Moolo — 친근한 반응형 지갑 가디언<\/title>/i,
  );
  assert.match(html, /가디언을 깨우는 중/);
  assert.match(html, /<html[^>]*lang="ko"[^>]*data-locale="ko"/);
  assert.match(html, /https:\/\/moolo\.local\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the simulation-only promise visible in product UI", async () => {
  const [app, roamer, notice, wallet, security, demo, architecture, mark, rialoModel, guidedPanel, guidedModel, guidedStore, guidedFixtures, styles, languageSwitcher, localeStore, dictionary] = await Promise.all([
    readFile(new URL("../components/MooloApp.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../components/moolo/LandingMooloRoamer.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
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
    readFile(
      new URL("../components/rialo/RialoArchitecture.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/rialo/RialoMark.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/rialo.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../components/guided-demo/GuidedDemoPanel.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../lib/guided-demo.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../store/guided-demo-store.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/guided-demo-fixtures.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../components/i18n/LanguageSwitcher.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../store/locale-store.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../lib/i18n/dictionaries.ts", import.meta.url),
      "utf8",
    ),
  ]);
  const [narrationControls, narrationHook, narrator] =
    await Promise.all([
      readFile(
        new URL(
          "../components/guided-demo/GuidedDemoNarrationControls.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../hooks/useGuidedDemoNarration.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../lib/speech/guided-demo-narrator.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(app, /Enter Demo Wallet/);
  assert.match(app, /No wallet\s+extension, signature, or real assets/);
  assert.match(app, /LandingMooloRoamer/);
  assert.match(roamer, /moolo-position-layer/);
  assert.match(roamer, /moolo-direction-layer/);
  assert.match(roamer, /moolo-body-layer/);
  assert.match(roamer, /ResizeObserver/);
  assert.match(roamer, /visibilitychange/);
  assert.match(roamer, /useReducedMotion/);
  assert.match(roamer, /waypointMin:\s*5/);
  assert.match(roamer, /MAX_WAYPOINT_ATTEMPTS\s*=\s*20/);
  assert.match(roamer, /normalSpeed:\s*\[260,\s*360\]/);
  assert.match(roamer, /dashSpeed:\s*\[420,\s*520\]/);
  assert.match(roamer, /restDelay:\s*\[5_000,\s*9_000\]/);
  assert.match(roamer, /closest<HTMLElement>\(\"\.welcome-screen\"\)/);
  assert.match(roamer, /Hero headline/);
  assert.match(roamer, /Enter Demo Wallet CTA/);
  assert.match(roamer, /Rialo information card/);
  assert.match(roamer, /selector:\s*"\.welcome-nav-actions"/);
  assert.match(roamer, /resizeObserver\.observe\(element\)/);
  assert.match(roamer, /clickCooldownUntil\s*=\s*Date\.now\(\)\s*\+\s*1_500/);
  assert.match(roamer, /viewportWidth\s*<=\s*320/);
  assert.match(notice, /Simulation Mode/);
  assert.match(notice, /No Onchain Transactions/);
  assert.match(wallet, /DemoPanel/);
  assert.match(demo, /Demo Control Panel/);
  assert.match(demo, /Turn demo sound/);
  assert.match(demo, /Simulated Rialo Workflow/);
  assert.match(demo, /Start Guided Demo/);
  assert.match(
    demo,
    /Exit Guided Demo to run individual scenarios\./,
  );
  assert.match(guidedPanel, /GuidedDemoProgress/);
  assert.match(guidedPanel, /Presenter note|GuidedDemoPresenterNote/);
  assert.match(guidedPanel, /Run Step/);
  assert.match(guidedPanel, /Finish Guided Demo/);
  assert.match(guidedPanel, /aria-live="polite"/);
  assert.match(guidedPanel, /GuidedDemoNarrationControls/);
  assert.match(narrationControls, /Replay narration/);
  assert.match(narrationControls, /aria-pressed/);
  assert.match(narrationHook, /visibilitychange/);
  assert.match(narrationHook, /pagehide/);
  assert.match(narrator, /voiceschanged/);
  assert.match(narrator, /SpeechSynthesisUtterance/);
  assert.match(narrator, /replayCooldownMs/);
  assert.match(guidedModel, /normal-transfer/);
  assert.match(guidedModel, /guardian-recovery/);
  assert.match(guidedModel, /getGuidedDemoNarration/);
  assert.match(guidedModel, /Native Timer/);
  assert.match(guidedModel, /Architecture simulation only/);
  assert.match(guidedStore, /phase:\s*"running"/);
  assert.match(guidedStore, /previousGuidedDemoStep/);
  assert.match(guidedFixtures, /guided-wallet-compromise/);
  assert.match(guidedFixtures, /guided-guardian-recovery/);
  assert.match(styles, /\.guided-highlight/);
  assert.match(app, /LanguageSwitcher/);
  assert.match(demo, /LanguageSwitcher/);
  assert.match(languageSwitcher, /aria-pressed/);
  assert.match(localeStore, /moolo-storage|readStoredLocale/);
  assert.match(dictionary, /Reactive Transactions/);
  assert.match(dictionary, /Native Timers/);
  assert.match(styles, /html\[data-locale="ko"\]/);
  assert.match(
    styles,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.guided-highlight[\s\S]*?animation:\s*none\s*!important/,
  );
  assert.doesNotMatch(
    demo,
    /<RialoMark\b/,
    "Presenter Tools should use Rialo text labels without another wallet-screen mark",
  );
  assert.match(security, /SimulationNotice/);
  assert.match(app, /Designed for Rialo/);
  assert.match(wallet, /Rialo Concept Demo/);
  assert.match(architecture, /Rialo Architecture Simulation/);
  assert.match(architecture, /Simulated Rialo Workflow/);
  assert.match(rialoModel, /Simulated external signal/);
  assert.match(rialoModel, /REX concept simulation/);
  assert.match(mark, /\/brand\/rialo-mark\.png/);
  assert.match(mark, /showLabel/);
  const productSource = `${app}${wallet}${security}${architecture}${mark}${rialoModel}`;
  assert.equal(
    (wallet.match(/<RialoMark\b/g) ?? []).length,
    1,
    "Wallet should keep only the Rialo Concept Demo header mark",
  );
  assert.match(wallet, /\{token\.symbol\.slice\(0, 1\)\}/);
  assert.ok(
    (productSource.match(/<RialoMark\b/g) ?? []).length >= 5,
    "Rialo marks should remain on the landing and architecture surfaces",
  );

  assert.doesNotMatch(productSource, /MetaMask|WalletConnect/);
  assert.doesNotMatch(
    productSource,
    /Live on Rialo|Secured onchain by Rialo|Real Rialo transaction|Rialo network connected|Executed by Rialo validators|Powered by Rialo mainnet/i,
  );
});
