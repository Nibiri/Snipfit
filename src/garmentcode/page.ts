import type { GcResponse } from "./gc.worker";

const log = document.getElementById("log")!;
const runBtn = document.getElementById("run") as HTMLButtonElement;
const design = document.getElementById("design") as HTMLSelectElement;
const body = document.getElementById("body") as HTMLSelectElement;
const report: { events: GcResponse[] } = { events: [] };
(window as unknown as { __garmentcode: typeof report }).__garmentcode = report;

const worker = new Worker(new URL("./gc.worker.ts", import.meta.url), { type: "module" });

function addLog(cls: string, text: string) {
  const li = document.createElement("li");
  li.className = cls;
  li.textContent = text;
  log.append(li);
}

worker.onmessage = (ev: MessageEvent<GcResponse>) => {
  const m = ev.data;
  report.events.push(m.type === "result" ? { ...m, data: { ...m.data, spec: null, svg: "" } } : m);
  if (m.type === "progress") addLog("pending", `${m.step} (${m.ms} мс)`);
  else if (m.type === "error") {
    addLog("bad", m.message);
    runBtn.disabled = false;
  } else {
    const d = m.data;
    addLog(
      "ok",
      `Готово: ${d.panels.length} деталей, ${d.stitches} швов, генерация ${d.generateMs} мс, всего ${m.ms} мс` +
        (d.selfIntersecting ? " (есть самопересечения)" : ""),
    );
    addLog("info", `Детали: ${d.panels.join(", ")}`);
    document.getElementById("svg")!.innerHTML = d.svg;
    document.getElementById("json")!.textContent = JSON.stringify(d.spec, null, 2);
    runBtn.disabled = false;
  }
};

runBtn.onclick = () => {
  runBtn.disabled = true;
  log.replaceChildren();
  worker.postMessage({ design: design.value, body: body.value });
};
