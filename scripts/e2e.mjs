// Smoke test: serves dist/ with the same COOP/COEP headers as Cloudflare Pages
// and checks in headless Chromium that the page is cross-origin isolated and
// that the multithreaded WASM worker runs.
// Usage: npm run build && npm run test:e2e   (add --garmentcode to also run Pyodide; needs internet)
import { preview } from "vite";
import { chromium } from "playwright";

const withGarmentCode = process.argv.includes("--garmentcode");
const server = await preview({ preview: { port: 4173, strictPort: true } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
let failed = false;
try {
  const page = await browser.newPage();
  page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text()));
  await page.goto(base);
  await page.waitForFunction(() => window.__snipfit?.wasm, null, { timeout: 60_000 });
  const report = await page.evaluate(() => window.__snipfit);
  console.log(JSON.stringify(report, null, 2));
  const check = (name) => report.checks.find((c) => c.name.startsWith(name))?.ok;
  const must = {
    crossOriginIsolated: check("crossOriginIsolated"),
    sharedArrayBuffer: check("SharedArrayBuffer"),
    wasmSharedMemory: check("WebAssembly shared memory"),
    wasmRan: report.wasm.type === "hello",
    multipleThreadsUsed: report.wasm.threadsUsed > 1,
  };
  console.log(must);
  failed = Object.values(must).some((v) => !v);

  if (withGarmentCode) {
    const gc = await browser.newPage();
    gc.on("console", (m) => console.log("[gc console]", m.text()));
    await gc.goto(base + "garmentcode.html");
    await gc.click("#run");
    await gc.waitForFunction(
      () => window.__garmentcode.events.some((e) => e.type !== "progress"),
      null,
      { timeout: 300_000 },
    );
    const events = await gc.evaluate(() => window.__garmentcode.events);
    console.log(JSON.stringify(events, null, 2));
    if (!events.some((e) => e.type === "result")) failed = true;
  }
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
