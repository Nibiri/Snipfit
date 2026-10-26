# Snipfit

Браузерное приложение: 3D-тело по описанию или фото → дизайн одежды → выкройки.
Всё тяжёлое считается на устройстве пользователя; хостинг только бесплатный (Cloudflare Pages).

Сейчас это каркас (шаг 1 прототипа):

- **Vite + TypeScript + Three.js** (WebGPU, автоматически WebGL2, если WebGPU нет).
- **`public/_headers`** для Cloudflare Pages: COOP/COEP, чтобы страница была
  `crossOriginIsolated` и работал `SharedArrayBuffer`.
- **Главная страница** проверяет браузер: изоляцию, `SharedArrayBuffer`, общую память WASM, WebGPU.
- **`crates/sim-core`** — Rust → многопоточный WASM (rayon + `wasm-bindgen-rayon`) в Web Worker.
  Будущее ядро симуляции ткани. Сейчас считает тестовую сумму на всех ядрах и сравнивает с одним потоком.
- **`garmentcode.html`** — запуск [GarmentCode](https://github.com/maria-korosteleva/GarmentCode)
  в браузере через Pyodide: мерки + дизайн → выкройка (JSON + SVG). См. [docs/garmentcode-pyodide.md](docs/garmentcode-pyodide.md).

## Запуск локально

Нужны Node 22+, [rustup](https://rustup.rs) (нужный nightly поставится сам из `rust-toolchain.toml`).

```sh
npm ci
npm run build:wasm   # Rust → src/wasm/sim-core (первый раз ставит wasm-bindgen-cli, ~2 мин)
npm run dev          # http://localhost:5173, с теми же COOP/COEP заголовками
```

Проверка сборки как в CI:

```sh
npm run build && npm run test:e2e   # headless Chromium: изоляция + потоки WASM
```

## Деплой (Cloudflare Pages, бесплатно)

CI (GitHub Actions) собирает Rust, сайт и гоняет smoke-тест на каждый PR.
При пуше в `main` он же деплоит `dist/` в Cloudflare Pages, если в настройках репозитория
заданы секреты `CLOUDFLARE_API_TOKEN` (права «Cloudflare Pages: Edit») и `CLOUDFLARE_ACCOUNT_ID`,
а в Cloudflare создан Pages-проект `snipfit` (Direct Upload).

Сборку делаем в GitHub Actions, а не в Cloudflare, потому что нужен nightly Rust.

## Структура

```
index.html, garmentcode.html   страницы
src/main.ts                    проверки + 3D сцена + запуск воркера
src/sim.worker.ts              WASM-симуляция в отдельном потоке
src/garmentcode/               Pyodide-воркер и страница GarmentCode
crates/sim-core/               Rust-ядро
public/_headers                заголовки для Cloudflare Pages
public/garmentcode/            урезанный GarmentCode (MIT), см. scripts/build-garmentcode-bundle.sh
scripts/                       сборка WASM, сборка бандла GarmentCode, e2e
```
