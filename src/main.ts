import { renderList, runPlatformChecks, type Check } from "./checks";
import { startScene } from "./scene";
import type { SimResponse } from "./sim.worker";

// Results are also put on window for automated tests (scripts/e2e.mjs).
const report: Record<string, unknown> = {};
(window as unknown as { __snipfit: typeof report }).__snipfit = report;

const checks = runPlatformChecks();
report.checks = checks;
renderList(document.getElementById("checks")!, checks);

const canvas = document.getElementById("scene") as HTMLCanvasElement;
startScene(canvas, document.getElementById("renderer-info")!)
  .then((backend) => (report.renderer = backend))
  .catch((e) => (report.renderer = `error: ${e}`));

const wasmList = document.getElementById("wasm")!;
if (!crossOriginIsolated) {
  const items: Check[] = [{ name: "Пропущено: страница не cross-origin isolated", ok: false }];
  renderList(wasmList, items);
  report.wasm = { error: "not isolated" };
} else {
  const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<SimResponse>) => {
    const r = ev.data;
    report.wasm = r;
    if (r.type === "error") {
      renderList(wasmList, [{ name: "Ошибка WASM", ok: false, detail: r.message }]);
      return;
    }
    renderList(wasmList, [
      { name: "WASM загружен в Web Worker", ok: true },
      { name: "Потоков в пуле rayon", ok: r.threads > 1, detail: String(r.threads) },
      { name: "Реально работало потоков", ok: r.threadsUsed > 1, detail: String(r.threadsUsed) },
      { name: "Сумма квадратов (50M)", ok: true, detail: r.result.toExponential(6) },
      {
        name: "Время: 1 поток / все потоки",
        ok: r.parallelMs < r.singleMs,
        detail: `${r.singleMs.toFixed(0)} мс / ${r.parallelMs.toFixed(0)} мс (×${(r.singleMs / r.parallelMs).toFixed(1)})`,
      },
    ]);
  };
  worker.postMessage({ type: "hello", threads: navigator.hardwareConcurrency });
}
