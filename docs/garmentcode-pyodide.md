# GarmentCode в браузере через Pyodide: что известно

Дата: 2026-10-26. Pyodide 314.0.7 (Python 3.14), GarmentCode `d449629` (MIT).

## Вывод

Генерация выкроек GarmentCode **должна работать в браузере**: нужная часть — чистый Python
на numpy/scipy/svgpathtools/svgwrite/pyyaml, и всё это есть в Pyodide.
**Реальный запуск пока не подтверждён**: в облачной песочнице, где делался каркас, запуск
стороннего кода (Pyodide + GarmentCode) был запрещён политикой, а CDN Pyodide недоступен из сети песочницы.
Проверка — открыть `garmentcode.html` в браузере (локально `npm run dev` или после деплоя)
и нажать «Сгенерировать». Тест: `npm run build && node scripts/e2e.mjs --garmentcode`.

## Что нужно GarmentCode для генерации выкройки

Нужны только `pygarment/garmentcode`, `pygarment/pattern` и программы из `assets/garment_programs`
(~100 КБ в zip, `public/garmentcode/garmentcode.zip`). Симуляция (NVIDIA Warp), Maya, libigl, CGAL,
trimesh, pyrender, nicegui — не нужны, они в других модулях.

| Зависимость | Где используется | В Pyodide |
|---|---|---|
| numpy | везде | есть (2.4.6) |
| scipy | `spatial.transform.Rotation`, `optimize.minimize` | есть (1.18), но тяжёлый: 14 МБ |
| svgpathtools | кривые рёбер (35 мест) | чистый Python, ставится через micropip с PyPI |
| svgwrite | SVG выкройки | есть |
| pyyaml | мерки и параметры дизайна | есть |
| cairosvg | только PNG/PDF экспорт | нет (нужна нативная cairo) → заглушка, PNG/PDF не делаем |
| matplotlib | только 3D-картинка | есть, но не нужен → заглушка |
| psutil | `data_config` | нет → заглушка |

Риски:
- Wheel `pygarment` на PyPI требует `numpy<2`, а в Pyodide numpy 2.x. Поэтому ставим не wheel,
  а сами исходники из zip (без проверки зависимостей). Устаревших numpy-API (`np.float`, `np.NaN` и т.п.)
  в нужных модулях не нашлось, но подтвердит только запуск.
- Wheel `pygarment` 2.0.2 на PyPI собран криво (пакеты лежат без папки `pygarment/`), это ещё одна причина брать исходники.

## Размер загрузки (первый раз, потом кэш браузера)

Pyodide core ≈ 13 МБ (wasm 9.6 + stdlib 2.5 + js 1.2), numpy 3 МБ, scipy 14 МБ + openblas 2 МБ,
остальное < 0,5 МБ. Итого ≈ 32 МБ (по сети меньше за счёт сжатия wasm).
Главный кандидат на экономию — scipy: GarmentCode берёт из него только повороты и одну оптимизацию,
их можно заменить своим кодом на numpy (≈ −16 МБ).

## Лицензии

- GarmentCode: MIT — можно в коммерческом продукте (сохраняем LICENSE, он лежит в zip).
- Тела `f_smpl_*`/`m_smpl_*` из репозитория GarmentCode основаны на SMPL (некоммерческая лицензия) —
  **не включены**. Используем только `mean_all/mean_female/mean_male.yaml` (мерки GarmentCode).
- Pyodide и пакеты: MPL-2.0 / BSD / MIT — ок.

## Хостинг Pyodide

Сейчас грузится с CDN jsDelivr (`cdn.jsdelivr.net/pyodide/v314.0.7/full/`), он отдаёт CORS-заголовки,
поэтому совместим с COEP `require-corp`. Если CDN подведёт — положить нужные файлы в Cloudflare Pages
(лимит 25 МБ на файл, scipy 14 МБ проходит) и задать `VITE_PYODIDE_URL`.

## Запасной вариант

Если Pyodide окажется медленным или сломается: заранее сгенерировать выкройки GarmentCode в JSON
(на своей машине или в GitHub Actions) для сетки размеров/параметров и класть их как статические файлы.
Формат JSON тот же (`spec` на странице), так что остальной код от выбора не зависит.
