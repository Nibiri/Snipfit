//! Snipfit simulation core. For now: a "hello" that proves multithreaded
//! WASM works (rayon thread pool on Web Workers over SharedArrayBuffer).

use rayon::prelude::*;
use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

/// Number of threads in the rayon pool.
#[wasm_bindgen]
pub fn thread_count() -> usize {
    rayon::current_num_threads()
}

/// Sum of i*i for i in 0..n, computed on all pool threads.
#[wasm_bindgen]
pub fn sum_of_squares(n: u32) -> f64 {
    (0..n).into_par_iter().map(|i| (i as f64) * (i as f64)).sum()
}

/// Same work on one thread, to compare timings.
#[wasm_bindgen]
pub fn sum_of_squares_single(n: u32) -> f64 {
    (0..n).map(|i| (i as f64) * (i as f64)).sum()
}

/// How many distinct threads actually took part in a parallel job.
#[wasm_bindgen]
pub fn distinct_threads_used(chunks: u32) -> usize {
    let mut ids: Vec<usize> = (0..chunks)
        .into_par_iter()
        .map(|_| {
            // Busy-wait a little so work gets spread across threads.
            let mut x = 0u64;
            for i in 0..200_000u64 {
                x = x.wrapping_add(i * i);
            }
            std::hint::black_box(x);
            rayon::current_thread_index().unwrap_or(usize::MAX)
        })
        .collect();
    ids.sort_unstable();
    ids.dedup();
    ids.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_match() {
        assert_eq!(sum_of_squares(1000), sum_of_squares_single(1000));
    }
}
