import { generateConfig } from "./warp";
import { SPONSOR, isSponsorEnabled } from "@/config/sponsor";
import { DONATE_URL } from "@/config/donate";
import { WARP_HOSTS, WARP_PORTS } from "@/types";
import type { ConfigFormat, WarpHostChoice, WarpPort, WarpPortChoice } from "@/types";

/** Подпись для выбора эндпоинта: «Авто» или сам хост. */
const hostLabel = (choice: string): string => (choice === "auto" ? "Авто" : choice);
/** Подпись для выбора порта: «Авто» или номер. */
const portLabel = (choice: WarpPortChoice): string => (choice === "auto" ? "Авто" : String(choice));

/** callback-параметр в порт; всё, кроме известных портов, — «Авто». */
function portOf(p: string | undefined): WarpPortChoice {
  const n = Number(p);
  return (WARP_PORTS as readonly number[]).includes(n) ? (n as WarpPort) : "auto";
}

// Shared Telegram-bot logic, used by the webhook route (app/api/telegram).
// Reuses generateConfig as-is; the UI is a small inline-keyboard wizard.
export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

type Btn = { text: string; callback_data: string } | { text: string; url: string };
type Menu = { text: string; rows: Btn[][] };
interface TgChat {
  id: number;
}
interface TgMessage {
  message_id: number;
  chat: TgChat;
  text?: string;
}
interface TgCallback {
  id: string;
  data?: string;
  message?: TgMessage;
}
export interface TgUpdate {
  update_id?: number;
  message?: TgMessage;
  callback_query?: TgCallback;
}

const FORMAT = {
  amneziawg: { emoji: "⚡", label: "AmneziaWG" },
  clash: { emoji: "🧩", label: "Clash" },
} as const;

const kb = (rows: Btn[][]) => ({ inline_keyboard: rows });
const btn = (text: string, callback_data: string): Btn => ({ text, callback_data });
const link = (text: string, url: string): Btn => ({ text, url });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


// ── Telegram API helpers ──────────────────────────────────────────────────
async function tg(method: string, body: unknown): Promise<void> {
  await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function answer(callbackId: string, text?: string): Promise<void> {
  await tg("answerCallbackQuery", { callback_query_id: callbackId, text });
}

async function send(chatId: number, text: string, rows?: Btn[][]): Promise<void> {
  await tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: rows ? kb(rows) : undefined,
  });
}

async function edit(chatId: number, messageId: number, text: string, rows: Btn[][]): Promise<void> {
  await tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: rows.length ? kb(rows) : undefined,
  });
}

async function sendDocument(
  chatId: number,
  fileName: string,
  content: string,
  caption: string,
  rows?: Btn[][],
): Promise<void> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  if (rows) form.append("reply_markup", JSON.stringify(kb(rows)));
  form.append("document", new Blob([content], { type: "text/plain" }), fileName);
  await fetch(`${API}/sendDocument`, { method: "POST", body: form });
}

async function deleteMessage(chatId: number, messageId: number): Promise<void> {
  await tg("deleteMessage", { chat_id: chatId, message_id: messageId });
}

// ── Wizard menus ──────────────────────────────────────────────────────────

function formatMenu(): Menu {
  return {
    text:
      "👋 <b>WARP Config RU</b>\n\n" +
      "Сгенерирую рабочий конфиг Cloudflare WARP со свежими ключами.\n\n" +
      "Формат:",
    // Оба формата ведут к выбору эндпоинта → порта. IPv6 выключен (включить
    // можно на сайте).
    rows: [
      [btn(`${FORMAT.amneziawg.emoji} AmneziaWG`, "f:amneziawg"), btn(`${FORMAT.clash.emoji} Clash`, "f:clash")],
    ],
  };
}

const HOST_CHOICES: WarpHostChoice[] = ["auto", ...WARP_HOSTS];
const PORT_CHOICES: WarpPortChoice[] = ["auto", ...WARP_PORTS];

// Хост выбран → шаг порта (h:format:host). Порт выбран → генерация.
function endpointMenu(format: ConfigFormat): Menu {
  const f = FORMAT[format];
  return {
    text: `${f.emoji} <b>${f.label}</b>\n\nЭндпоинт:`,
    rows: [
      ...HOST_CHOICES.map((h) => [btn(hostLabel(h), `h:${format}:${h}`)]),
      [btn("‹ Назад", "back:format")],
    ],
  };
}

function portMenu(format: ConfigFormat, host: string): Menu {
  const f = FORMAT[format];
  return {
    text: `${f.emoji} <b>${f.label}</b> · ${hostLabel(host)}\n\nПорт:`,
    rows: [
      ...PORT_CHOICES.map((p) => [btn(portLabel(p), `g:${format}:${host}:${p}`)]),
      [btn("‹ Назад", `f:${format}`)],
    ],
  };
}

function summary(format: ConfigFormat, host: string, port: WarpPortChoice): string {
  const f = FORMAT[format];
  return `${f.emoji} <b>${f.label}</b> · ${hostLabel(host)} · ${portLabel(port)}`;
}

/** callback-параметр (p1) в формат; всё, кроме "clash", считаем AmneziaWG. */
function formatOf(p1: string): ConfigFormat {
  switch (p1) {
    case "clash":
      return "clash";
    default:
      return "amneziawg";
  }
}

function captionFor(format: ConfigFormat): string {
  switch (format) {
    case "amneziawg":
      return "📥 <b>Импорт:</b> откройте файл в AmneziaVPN (нужен клиент с поддержкой awg).";
    case "clash":
      return "📥 <b>Импорт:</b> добавьте как профиль в Mihomo Party / FlClash / Nikki.";
  }
}

/** Спонсорская строка для подписи к файлу (пусто, если блок выключен). */
function sponsorLine(): string {
  if (!isSponsorEnabled()) return "";
  return `\n\n💎 <b>${esc(SPONSOR.title)}:</b> ${esc(SPONSOR.text)}\n<a href="${esc(SPONSOR.url)}">${esc(SPONSOR.cta)}</a>`;
}

// ── Handlers ──────────────────────────────────────────────────────────────
async function onMessage(m: TgMessage): Promise<void> {
  if (m.text === "/help") {
    await send(
      m.chat.id,
      "Я генерирую рабочие конфиги <b>Cloudflare WARP</b> со свежими ключами.\n\n" +
        "• <b>AmneziaWG</b> (.conf) — для AmneziaVPN\n" +
        "• <b>Clash</b> (.yaml) — для Mihomo Party / FlClash / Nikki\n\n" +
        "Нажмите /start, чтобы начать.\n\n" +
        "❤️ Проект бесплатный — поддержать можно по кнопке ниже.",
      [[link("❤️ Поддержать проект", DONATE_URL)]],
    );
    return;
  }
  const menu = formatMenu();
  await send(m.chat.id, menu.text, menu.rows);
}

async function onCallback(cq: TgCallback): Promise<void> {
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;
  const data = cq.data;
  if (chatId === undefined || messageId === undefined || !data) {
    await answer(cq.id);
    return;
  }
  const [kind, p1, p2, p3] = data.split(":");
  const show = (menu: Menu) => edit(chatId, messageId, menu.text, menu.rows);

  // "Ещё конфиг" обычно приходит с сообщения-файла (его текст editMessageText
  // не правит), поэтому начинаем заново новым сообщением.
  if (kind === "restart") {
    await answer(cq.id);
    const menu = formatMenu();
    await send(chatId, menu.text, menu.rows);
    return;
  }

  if (kind === "g") {
    await answer(cq.id);
    await edit(chatId, messageId, "⏳ Генерирую конфиг…", []);
    const format = formatOf(p1);
    const port = portOf(p3);
    try {
      const result = await generateConfig({
        format,
        host: p2 as WarpHostChoice,
        port,
        // IPv6 не передаём: дефолт — выключен (v4-only).
      });
      // Результат — одно сообщение: сам файл, со сводкой и подсказкой в подписи
      // и кнопкой «Ещё конфиг». Служебное «Генерирую…» удаляем.
      const caption = `✅ <b>Готово!</b>\n\n${summary(format, p2, port)}\n\n${captionFor(format)}${sponsorLine()}`;
      await sendDocument(chatId, result.fileName, result.config, caption, [
        [btn("🔄 Ещё конфиг", "restart")],
        [link("❤️ Поддержать проект", DONATE_URL)],
      ]);
      await deleteMessage(chatId, messageId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      await edit(chatId, messageId, `⚠️ Не получилось: ${esc(msg)}`, [[btn("🔄 Заново", "restart")]]);
    }
    return;
  }

  switch (kind) {
    case "back":
      await show(formatMenu());
      break;
    case "f":
      await show(endpointMenu(formatOf(p1)));
      break;
    case "h":
      // Хост выбран (p2) → шаг порта.
      await show(portMenu(formatOf(p1), p2));
      break;
  }
  await answer(cq.id);
}

/** Route one Telegram update through the bot wizard. */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.message?.text) await onMessage(update.message);
  else if (update.callback_query) await onCallback(update.callback_query);
}

/** Register the webhook (used by the GET self-setup). */
async function setWebhook(url: string): Promise<{ ok?: boolean; description?: string }> {
  const body: Record<string, unknown> = {
    url,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  };
  if (WEBHOOK_SECRET) body.secret_token = WEBHOOK_SECRET;
  const res = await fetch(`${API}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** One-shot bot setup: command menu (/start, /help) + webhook. */
export async function registerBot(webhookUrl: string): Promise<{ ok?: boolean; description?: string }> {
  await tg("setMyCommands", {
    commands: [
      { command: "start", description: "Сгенерировать конфиг" },
      { command: "help", description: "Что это и как пользоваться" },
    ],
  });
  return setWebhook(webhookUrl);
}
