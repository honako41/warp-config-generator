<p align="center">
  <img src="assets/logo.svg" alt="WARP Config RU" width="460">
</p>

<p align="center">
  <b>Рабочие конфиги Cloudflare WARP за пару секунд — AmneziaWG и Clash, со свежими ключами.</b>
</p>

<p align="center">
  <a href="https://github.com/AppsGanin/warp-config-generator/stargazers"><img src="https://img.shields.io/github/stars/AppsGanin/warp-config-generator?style=for-the-badge&logo=github&color=FFD33D&labelColor=24292e" alt="Stars"></a>
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <a href="https://t.me/warpgenrubot"><img src="https://img.shields.io/badge/Telegram-%40warpgenrubot-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram bot"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/AppsGanin/warp-config-generator?style=for-the-badge&color=22c55e" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://warp-ru.vercel.app/">🌐 Открыть генератор</a> &nbsp;·&nbsp; <a href="https://t.me/warpgenrubot">🤖 Telegram-бот</a>
</p>

<p align="center">
  ⭐ <b>Если проект пригодился — поставьте звезду! Это бесплатно и реально мотивирует развивать его дальше.</b>
</p>

Минималистичный генератор конфигов Cloudflare WARP в форматах **AmneziaWG 1.5** и
**Clash**. Для каждой генерации создаётся свежая пара ключей X25519 и регистрируется
через официальный WARP API, поэтому конфиги рабочие «из коробки».

Вдохновлён [nellimonix/warp-config-generator-vercel](https://github.com/nellimonix/warp-config-generator-vercel),
но намеренно упрощён: два формата, два DNS, два эндпоинта.

## 🪞 Зеркала

Проект доступен по нескольким адресам — выбирайте любой:

- 🌐 https://warp-ru.duckdns.org/
- ▲ https://warp-ru.vercel.app/
- 🔷 https://warp-ru.netlify.app/
- 🤖 Telegram-бот: [@warpgenrubot](https://t.me/warpgenrubot)

## ✨ Что внутри

- **Форматы:** AmneziaWG (`.conf`, awg1.5) и Clash (`.yaml`)
- **DNS:** `dns.geohide.ru` и `xbox-dns.ru`
- **Эндпоинты (для AmneziaWG):** `162.159.195.1:500` и `engage.cloudflareclient.com:2408`
- **Clash-роутинг:** переключатель **Компьютер / Телефон** — два шаблона:
  - *Компьютер* — [`config/templates/clash.yaml`](config/templates/clash.yaml), правила из
    [rekryt/iplist](https://github.com/rekryt/iplist)
  - *Телефон* — [`config/templates/clash-mobile.yaml`](config/templates/clash-mobile.yaml),
    роутинг из [hydraponique/roscomvpn-routing](https://github.com/hydraponique/roscomvpn-routing)

  Заблокированные сервисы разложены по группам-тумблерам (AI, YouTube, Discord, Игры…) → через
  WARP, а российский сегмент → напрямую. Что куда гнать, пользователь решает прямо в клиенте.
- 🤖 **Telegram-бот** с тем же генератором — на случай, когда сайт недоступен
- Результат открывается в модальном окне: копирование и скачивание файла

## 🧰 Стек

- Next.js 15 (App Router) + React 19 + TypeScript
- Генерация ключей — нативный `node:crypto` (X25519), без внешних крипто-зависимостей
- Без UI-фреймворков: чистый CSS по дизайн-системе из `DESIGN.md`

## 💻 Локальный запуск

```bash
npm install
npm run dev      # http://localhost:3000
```

Прод-сборка:

```bash
npm run build
npm start
```

## 🚀 Деплой


### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AppsGanin/warp-config-generator)

1. Импортируйте репозиторий на [vercel.com/new](https://vercel.com/new).
2. Framework определится как **Next.js** автоматически — настройки менять не нужно.
3. Deploy. API-роут `/api/generate` поедет как serverless-функция (Node runtime).

Или через CLI:

```bash
npm i -g vercel
vercel
```

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/AppsGanin/warp-config-generator)

В репозитории есть [`netlify.toml`](netlify.toml) с плагином
`@netlify/plugin-nextjs` — Netlify подхватит Next.js автоматически.

1. На [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Build command: `npm run build` (уже в `netlify.toml`), publish — по умолчанию.
3. Deploy.

Или через CLI:

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

## 🗂️ Где что менять

| Нужно изменить | Файл |
|---|---|
| DNS-провайдеры | [`config/dns.ts`](config/dns.ts) |
| Эндпоинты AmneziaWG | [`config/endpoints.ts`](config/endpoints.ts) |
| Clash-роутинг (компьютер) | [`config/templates/clash.yaml`](config/templates/clash.yaml) |
| Clash-роутинг (телефон) | [`config/templates/clash-mobile.yaml`](config/templates/clash-mobile.yaml) |
| WARP-эндпоинты (оба шаблона) | [`scripts/gen-endpoints.mjs`](scripts/gen-endpoints.mjs) → `npm run gen:endpoints` |
| Параметры awg1.5 | [`lib/builders/amneziawg.ts`](lib/builders/amneziawg.ts) |
| I1-маски (awg1.5-сигнатура) | [`lib/i1-masks.ts`](lib/i1-masks.ts) |
| Логика Telegram-бота | [`lib/telegram.ts`](lib/telegram.ts) |

## 🤖 Telegram-бот

Тот же генератор доступен как Telegram-бот — вебхук [`app/api/telegram/route.ts`](app/api/telegram/route.ts)
(общая логика в [`lib/telegram.ts`](lib/telegram.ts)), переиспользует ту же `generateConfig`.
Работает бесплатно на Vercel/Netlify — это обычная serverless-функция, которую дёргает Telegram.

Бот пошагово спрашивает формат → эндпоинт (AmneziaWG) / устройство Компьютер·Телефон (Clash) → DNS
и присылает готовый `.conf`/`.yaml` файлом.

Настройка:

1. Создайте бота у [@BotFather](https://t.me/BotFather) → получите токен.
2. В переменных окружения деплоя задайте `TELEGRAM_BOT_TOKEN` (опц. `TELEGRAM_WEBHOOK_SECRET` —
   защита вебхука от посторонних запросов). Передеплойте.
3. Привяжите вебхук — откройте один раз в браузере (адрес и секрет подставятся сами):

   ```
   https://<ваш-деплой>/api/telegram?token=<TELEGRAM_BOT_TOKEN>
   ```

   Должно вернуть `{"ok":true,...}`. Передеплой вебхук не сбрасывает — повторять не нужно.

Готово — напишите боту `/start`.

## ☁️ Замечание про serverless

WARP API (`api.cloudflareclient.com`) иногда ограничивает регистрацию с IP облачных
провайдеров. Если на Vercel/Netlify регистрация начнёт отдавать ошибки HTTP 429/403 —
это лимит со стороны Cloudflare, а не баг генератора. Запросы к WARP идут с таймаутом
и понятной ошибкой в ответе API.

## ⭐ Поддержать

Понравился проект? **Поставьте звезду** — это секунда, бесплатно и сильно помогает.
Нашли баг или есть идея — открывайте [issue](https://github.com/AppsGanin/warp-config-generator/issues)
или PR.

<p align="center">
  <a href="https://github.com/AppsGanin/warp-config-generator/stargazers"><img src="https://img.shields.io/github/stars/AppsGanin/warp-config-generator?style=social" alt="Star on GitHub"></a>
</p>

## 📄 Лицензия

[MIT](LICENSE) © 2026 Dmitry Ganin
