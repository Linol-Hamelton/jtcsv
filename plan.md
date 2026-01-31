Current version: 3.1.0

﻿IMPROVEMENT_CHECKLIST_V3_1
- [x] Убрать дублирование TS/JS (TS-only source + единый build для JS)
- [x] Сократить entry points до 5 ключевых (/, /browser, /plugins, /cli, /schema)
- [x] Вынести framework adapters в отдельные npm packages
- [x] Объединить документацию в единый docs сайт и добавить ссылку в README
- [x] Консолидировать README/CLI/Browser/Plugins в единую структуру, оставить редиректы/ссылки
- [x] Добавить API Decision Tree (гайд выбора csvToJson/readCsvAsJson/streams)
- [x] Полные type definitions для всех export variants (plugins/browser/workers)
- [x] Структурировать ошибки (message/code/hint/docs/context) и добавить error codes
- [x] Добавить Error Reference в README/Docs
- [x] Добавить error recovery options (onError: skip|warn|throw + errorHandler)
- [x] Публиковать public benchmarks (CI job + artifacts + benchmark.md + vs-competitors)
- [x] Улучшить memory warning (safety limit + guidance + override)
- [x] Пересмотреть default csvToJson (memory-first) и/или явно задокументировать streaming recommendation
- [x] Нормализовать naming API (csvToJson/readCsvAsJson/createCsvToJsonStream)
- [x] Усилить CSV injection protection (newline/quoted fields, doc)
- [x] Обновить/дополнить SECURITY.md с OWASP info и результатами аудита
- [x] Документировать Browser API (Web Workers)
- [x] Добавить examples для каждого framework adapter
- [x] Документация по написанию собственных plugins
- [x] Документировать schema validator format
- [x] Добавить built-in validators (email/URL/date)
- [x] Оптимизировать batch processing API
- [x] Улучшить CLI help output
- [x] Добавить plugin registry для community plugins
