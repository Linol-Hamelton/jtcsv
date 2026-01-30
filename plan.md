1) Функциональная корректность
Полный набор тестов проходит: unit, integration, e2e, perf, security, fuzz.
Проверка CLI поведения на Windows/Linux/macOS (кодировки, пути, stdin/stdout).
Контракты API стабильны (semver), нет breaking изменений без явного мажора.
Валидные/невалидные входные данные покрыты (пустые, большие, бинарные, смешанные кодировки).
Совместимость с Node LTS версиями подтверждена.

2) Типы и интерфейсы (TypeScript)
Внедрены type-level тесты (tsd/dtslint) для index.d.ts, browser .d.ts, exports.
Типы не зависят от внутреннего js-кода, совместимы с ESM/CJS.
Строгий tsconfig для публичных типов (noImplicitAny, exactOptionalPropertyTypes, noUncheckedIndexedAccess).
Совпадение JS API и TS типов (без расхождений).

3) Тестирование
Unit тесты для каждой функции публичного API.
Интеграционные тесты: потоковые API, worker API, плагины.
Regression tests на все найденные баги.
Тесты безопасности: CSV injection, path traversal, DOS через длинные строки.
Профилирование памяти: без утечек при больших CSV.
Стабильные perf тесты (детерминированные пороги или условные по env).

4) Покрытие тестами
Измеряется отдельно для JS и TS.
Отдельный репорт для production entrypoints.
Выделены исключения/игноры с документированным объяснением.
Порог coverage для JS-реализаций ≥ 80% (или более).

5) Производительность
Минимизация аллокаций в csv-to-json и json-to-csv.
Предикативный fast-path (precompiled schemas, cached column indices).
Блоковая обработка (chunking) для больших файлов.
Использование typed arrays/streams там, где оправдано.
Ограничения по памяти и лимиты токенов.

6) Архитектура
Единый источник (TS → JS сборка), без дублирующих .js/.ts.
Четкое разделение: core / browser / workers / plugins.
Консистентные экспорты (ESM/CJS) через build.
Строгие границы модулей (no circular deps).
Общие утилиты вынесены в src/utils с API контрактами.

7) Сборка и публикация
Полный build reproducible (lockfile, pinned toolchain).
CJS/ESM/UMD артефакты соответствуют exports.
Bundle size контролируется (size-limit).
Tree-shaking корректен: dead code не попадает в бандл.
package.json exports и typings согласованы.

8) Безопасность
Проверка npm audit + SCA (Dependabot).
Защита от CSV injection включаемая и протестированная.
Защита от path traversal в saveAsCsv.
Лимиты на размер/строки/колонки.
Проверка Unicode/BOM/encoding атак.

9) Документация
README: examples для всех entrypoints.
API reference: сигнатуры, опции, типы, крайние случаи.
Performance notes: ограничения, best practices.
Migration guides для мажорных изменений.
Документация плагинов и worker-интерфейса.

10) DX/DevOps
CI: тесты, coverage, lint, build, typecheck.
Release pipeline: changelog, git tags, npm publish dry-run.
Версионирование (semver) и release notes.
Pre-commit hooks: lint/test subsets.
Быстрые команды для локальной проверки.

11) Качество кода
ESLint/Prettier/format consistency.
Никаких any без обоснований.
Чистые ошибки (имена/коды/стек).
Логи структурированы/опциональны.

12) Интероперабельность
Совместимость с ESM/CJS в Node и браузере.
Работают bundlers (Webpack/Vite/Rollup).
Проверены browser builds и workers.

13) Плагины
Тесты для всех официальных плагинов.
Версии плагинов синхронизированы с core.
Документация плагинного API + версия интерфейса.

14) Экосистема
Примеры в examples/ валидны и проходят.
Демо проекты собираются.
Миграционные скрипты если меняется API.

STATUS_CHECKLIST
- [x] Run tests (npm test) on Windows
- [x] Run coverage (npm run test:coverage) on Windows
- [x] Run lint (npm run lint)
- [x] Run typecheck (npm run tsc:check)
- [x] Run build (npm run build)
- [x] Run tests on Linux via Docker
- [ ] Run tests on macOS (if available) (WSL only has docker-desktop, no bash distro)
- [x] Add type-level tests (tsd/dtslint)
- [x] Strict public types tsconfig (tsconfig.types.json + tsc:types)
- [x] Separate JS/TS coverage reporting
- [x] Entry coverage report with strict thresholds
- [x] Enforce JS-only coverage thresholds
- [x] Normalize sources to TS-only build output
- [x] Review exports/typings alignment
- [x] CLI behavior checks (paths/encoding/stdin/stdout)
- [x] Security audit (npm audit / SCA)
- [x] Perf baselines and deterministic thresholds
- [x] Docs review + updates
- [x] CI pipeline updates
- [x] Plugin tests parity
- [x] Browser build/workers validation
- [x] Security audit notes: remaining moderate advisory for xml2js via blessed-contrib/map-canvas.
