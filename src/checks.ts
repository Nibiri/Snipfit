export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

/** Browser features the app depends on. */
export function runPlatformChecks(): Check[] {
  const checks: Check[] = [];
  checks.push({
    name: "crossOriginIsolated (заголовки COOP/COEP)",
    ok: self.crossOriginIsolated === true,
    detail: self.crossOriginIsolated ? undefined : "нет заголовков COOP/COEP: проверьте _headers",
  });

  let sab = false;
  let sabDetail: string | undefined;
  try {
    const buf = new SharedArrayBuffer(16);
    const view = new Int32Array(buf);
    Atomics.add(view, 0, 1);
    sab = Atomics.load(view, 0) === 1;
  } catch (e) {
    sabDetail = String(e);
  }
  checks.push({ name: "SharedArrayBuffer + Atomics", ok: sab, detail: sabDetail });

  let sharedMemory = false;
  try {
    const mem = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true });
    sharedMemory = mem.buffer instanceof SharedArrayBuffer;
  } catch {
    /* not supported */
  }
  checks.push({ name: "WebAssembly shared memory (потоки)", ok: sharedMemory });

  checks.push({
    name: "Ядер CPU",
    ok: navigator.hardwareConcurrency > 1,
    detail: String(navigator.hardwareConcurrency),
  });
  checks.push({ name: "WebGPU", ok: "gpu" in navigator, detail: "gpu" in navigator ? undefined : "будет WebGL2" });
  return checks;
}

export function renderList(el: HTMLElement, items: Check[]): void {
  el.replaceChildren(
    ...items.map((c) => {
      const li = document.createElement("li");
      li.className = c.ok ? "ok" : "bad";
      li.textContent = c.detail ? `${c.name}: ${c.detail}` : c.name;
      return li;
    }),
  );
}
