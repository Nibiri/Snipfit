// Runs GarmentCode (Python) in Pyodide inside a worker so the UI stays responsive.
import runnerSource from "./gc_run.py?raw";

// Pyodide is loaded from its CDN (CORS-enabled, so it works under COEP require-corp).
// Override with VITE_PYODIDE_URL to self-host the files.
const PYODIDE_URL: string =
  import.meta.env.VITE_PYODIDE_URL ?? "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
const BUNDLE_URL = new URL("/garmentcode/garmentcode.zip", self.location.origin).href;

export type GcRequest = { design: string; body: string };
export type GcResponse =
  | { type: "progress"; step: string; ms: number }
  | { type: "result"; ms: number; data: GcResult }
  | { type: "error"; message: string };
export interface GcResult {
  importMs: number;
  generateMs: number;
  panels: string[];
  stitches: number;
  selfIntersecting: boolean;
  spec: unknown;
  svg: string;
}

interface Pyodide {
  loadPackage(names: string[]): Promise<void>;
  pyimport(name: string): { install(pkg: string): Promise<void> } & Record<string, unknown>;
  runPython(code: string): unknown;
  unpackArchive(buf: ArrayBuffer, format: string, opts?: { extractDir?: string }): void;
  FS: { writeFile(path: string, data: string): void; mkdirTree(path: string): void };
}

const t0 = performance.now();
const progress = (step: string) =>
  self.postMessage({ type: "progress", step, ms: Math.round(performance.now() - t0) } satisfies GcResponse);

let ready: Promise<Pyodide> | null = null;

async function setup(): Promise<Pyodide> {
  progress("Загрузка Pyodide");
  const mod = await import(/* @vite-ignore */ PYODIDE_URL + "pyodide.mjs");
  const py: Pyodide = await mod.loadPyodide({ indexURL: PYODIDE_URL });
  progress("Загрузка numpy, scipy, pyyaml, svgwrite");
  await py.loadPackage(["numpy", "scipy", "pyyaml", "svgwrite", "micropip"]);
  progress("Установка svgpathtools (PyPI)");
  await py.pyimport("micropip").install("svgpathtools");
  progress("Распаковка GarmentCode");
  const zip = await (await fetch(BUNDLE_URL)).arrayBuffer();
  py.FS.mkdirTree("/gc");
  py.unpackArchive(zip, "zip", { extractDir: "/gc" });
  py.FS.writeFile("/gc/gc_run.py", runnerSource);
  py.runPython(`import sys, os; sys.path.insert(0, "/gc"); os.chdir("/gc")`);
  progress("Импорт GarmentCode");
  py.runPython("import gc_run");
  return py;
}

self.onmessage = async (ev: MessageEvent<GcRequest>) => {
  try {
    ready ??= setup();
    const py = await ready;
    progress(`Генерация: ${ev.data.design} / ${ev.data.body}`);
    const json = py.runPython(
      `gc_run.generate(${JSON.stringify(ev.data.design)}, ${JSON.stringify(ev.data.body)})`,
    ) as string;
    self.postMessage({
      type: "result",
      ms: Math.round(performance.now() - t0),
      data: JSON.parse(json),
    } satisfies GcResponse);
  } catch (e) {
    ready = null;
    self.postMessage({ type: "error", message: String(e) } satisfies GcResponse);
  }
};
