// Simulation worker. Owns the WASM module and its rayon thread pool,
// so the main thread (UI + rendering) never blocks.
import init, {
  initThreadPool,
  thread_count,
  sum_of_squares,
  sum_of_squares_single,
  distinct_threads_used,
} from "./wasm/sim-core/sim_core.js";

export type SimRequest = { type: "hello"; threads: number };
export type SimResponse =
  | {
      type: "hello";
      threads: number;
      threadsUsed: number;
      result: number;
      parallelMs: number;
      singleMs: number;
    }
  | { type: "error"; message: string };

let ready: Promise<void> | null = null;

async function setup(threads: number): Promise<void> {
  await init();
  await initThreadPool(threads);
}

self.onmessage = async (ev: MessageEvent<SimRequest>) => {
  try {
    ready ??= setup(ev.data.threads);
    await ready;
    const n = 50_000_000;
    let t = performance.now();
    const single = sum_of_squares_single(n);
    const singleMs = performance.now() - t;
    t = performance.now();
    const result = sum_of_squares(n);
    const parallelMs = performance.now() - t;
    // Float addition order differs between threads, so compare with a tolerance.
    if (Math.abs(result - single) / single > 1e-9) throw new Error(`mismatch: ${result} != ${single}`);
    const msg: SimResponse = {
      type: "hello",
      threads: thread_count(),
      threadsUsed: distinct_threads_used(64),
      result,
      parallelMs,
      singleMs,
    };
    self.postMessage(msg);
  } catch (e) {
    self.postMessage({ type: "error", message: String(e) } satisfies SimResponse);
  }
};
