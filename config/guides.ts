import type { ConfigFormat } from "@/types";

/** Операционные системы, под которые есть инструкция подключения. */
export type OsId = "windows" | "macos" | "linux" | "android" | "ios";

export const OS_OPTIONS: readonly { id: OsId; label: string }[] = [
  { id: "windows", label: "Windows" },
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "android", label: "Android" },
  { id: "ios", label: "iOS" },
];

export interface DownloadLink {
  app: string;
  url: string;
}

/** Инструкция под конкретный клиент: свои шаги и свои ссылки на скачивание. */
export interface AppGuide {
  name: string;
  steps: string[];
  links: DownloadLink[];
}

export interface OsGuide {
  apps: AppGuide[];
}

export type FormatGuides = Record<OsId, OsGuide>;

// ── AmneziaWG ────────────────────────────────────────────────────────────────
// AmneziaVPN — основной клиент с поддержкой awg-обфускации; Incy — альтернатива
// (proxy-клиент, у которого awg заявлен на уровне протокола). Ссылки на загрузку
// различаются по платформам, шаги внутри клиента одинаковые.
const AMNEZIA_STEPS = [
  "Установите AmneziaVPN — обычные WireGuard-клиенты не поддерживают awg-обфускацию.",
  "Откройте приложение → «+» → «У меня есть данные для подключения».",
  "Импортируйте скачанный файл .conf (или вставьте текст конфига).",
  "Выберите протокол AmneziaWG и нажмите «Подключиться».",
];

// Incy официально не документирует импорт awg-.conf — шаги ориентировочные.
const INCY_STEPS = [
  "Установите Incy — proxy-клиент с поддержкой WireGuard/AmneziaWG.",
  "Откройте приложение → «+» (добавить конфигурацию).",
  "Импортируйте awg-конфиг: из файла .conf, из буфера обмена или по ссылке.",
  "Выберите добавленный профиль и нажмите «Подключиться».",
];

const INCY_LINK: DownloadLink = { app: "Incy", url: "https://incy.cc/" };

// Incy доступен не везде (нет на Windows и Linux) — добавляем только там, где есть.
function amneziaOs(amneziaVpnUrl: string, withIncy = true): OsGuide {
  const apps: AppGuide[] = [
    { name: "AmneziaVPN", steps: AMNEZIA_STEPS, links: [{ app: "AmneziaVPN", url: amneziaVpnUrl }] },
  ];
  if (withIncy) apps.push({ name: "Incy", steps: INCY_STEPS, links: [INCY_LINK] });
  return { apps };
}

const AMNEZIA_DESKTOP_URL = "https://amnezia.org/ru/downloads";

// ── Clash / Mihomo ───────────────────────────────────────────────────────────
// Единый .yaml работает на любом mihomo-клиенте: роутинг разложен по группам
// (AI, YouTube, Игры, Мессенджеры…) — что гнать через WARP, пользователь
// выбирает тумблерами прямо в клиенте.
const CLASH_VERGE_STEPS = [
  "Установите Clash Verge Rev и запустите.",
  "«Профили» → «Импорт» → выберите скачанный .yaml (или вставьте ссылку).",
  "Нажмите на профиль, чтобы активировать его.",
  "Включите TUN Mode (или системный прокси) в «Настройках».",
  "В группах прокси выберите, какие сервисы гнать через WARP, а какие — «Без VPN».",
];
const CLASH_VERGE_URL = "https://github.com/clash-verge-rev/clash-verge-rev/releases";

export const GUIDES: Record<ConfigFormat, FormatGuides> = {
  amneziawg: {
    windows: amneziaOs(AMNEZIA_DESKTOP_URL, false),
    macos: amneziaOs(AMNEZIA_DESKTOP_URL),
    linux: amneziaOs(AMNEZIA_DESKTOP_URL, false),
    android: amneziaOs("https://play.google.com/store/apps/details?id=org.amnezia.vpn"),
    ios: amneziaOs("https://apps.apple.com/app/amneziavpn/id1600529900"),
  },
  clash: {
    windows: {
      apps: [
        {
          name: "Clash Verge Rev",
          steps: CLASH_VERGE_STEPS,
          links: [{ app: "Clash Verge Rev", url: CLASH_VERGE_URL }],
        },
      ],
    },
    macos: {
      apps: [
        {
          name: "ClashFX",
          steps: [
            "Установите ClashFX и запустите — иконка появится в строке меню.",
            "Config → импортируйте .yaml (или добавьте Remote Config по ссылке).",
            "Выберите профиль в меню ClashFX.",
            "Установить как системный прокси и Включить расширенный режим.",
            "В меню Proxies выберите, что гнать через WARP, а что — напрямую.",
          ],
          links: [{ app: "ClashFX", url: "https://clashfx.com/en/download/" }],
        },
      ],
    },
    linux: {
      apps: [
        {
          name: "Clash Verge Rev",
          steps: [
            "Установите Clash Verge Rev (AppImage / deb / rpm) и запустите.",
            "«Профили» → «Импорт» → выберите скачанный .yaml.",
            "Нажмите на профиль, чтобы активировать его.",
            "Включите TUN Mode (или системный прокси).",
            "В группах прокси выберите, какие сервисы гнать через WARP, а какие — «Без VPN».",
          ],
          links: [{ app: "Clash Verge Rev", url: CLASH_VERGE_URL }],
        },
      ],
    },
    android: {
      apps: [
        {
          name: "Clash Meta for Android",
          steps: [
            "Установите Clash Meta for Android — форк Clash for Android на ядре Mihomo.",
            "«Профили» → «+» → «Из файла» и выберите скачанный .yaml.",
            "Нажмите на профиль, чтобы активировать его.",
            "Нажмите кнопку подключения и разрешите создание VPN.",
            "В группах прокси выберите, что гнать через WARP, а что — напрямую.",
          ],
          links: [
            {
              app: "Clash Meta for Android",
              url: "https://github.com/MetaCubeX/ClashMetaForAndroid/releases",
            },
          ],
        },
      ],
    },
    ios: {
      apps: [
        {
          name: "Stash / Shadowrocket",
          steps: [
            "Установите Stash или Shadowrocket из App Store (нативные клиенты, платные).",
            "Откройте .yaml через «Поделиться» → приложение (или добавьте по ссылке).",
            "Активируйте импортированный профиль.",
            "Включите VPN тумблером в приложении.",
            "В группах прокси выберите, что гнать через WARP, а что — напрямую.",
          ],
          links: [
            { app: "Stash", url: "https://apps.apple.com/app/stash/id1596063349" },
            { app: "Shadowrocket", url: "https://apps.apple.com/app/shadowrocket/id932747118" },
          ],
        },
      ],
    },
  },
};

/** Определяет ОС пользователя для дефолтной вкладки в инструкции. */
export function detectOs(): OsId {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";
  return "windows";
}
