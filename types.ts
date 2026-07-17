export type ConfigFormat = "amneziawg" | "clash";

/** UDP ports Cloudflare WARP is known to accept. */
export const WARP_PORTS = [4500, 2408, 500, 1701] as const;
export type WarpPort = (typeof WARP_PORTS)[number];
/** Выбор порта: конкретный или «Авто» — случайный из WARP_PORTS. */
export type WarpPortChoice = WarpPort | "auto";
export const DEFAULT_PORT_CHOICE: WarpPortChoice = "auto";

/**
 * Эндпоинты WARP: официальный хостнейм + anycast-IP из разных /24 — если один
 * диапазон режут у провайдера, работают другие. «Авто» пробивает пул по TCP и
 * берёт быстрейший живой.
 */
export const WARP_HOSTS = [
  "engage.cloudflareclient.com",
  "162.159.192.1",
  "162.159.193.1",
  "162.159.195.1",
] as const;
export type WarpHost = (typeof WARP_HOSTS)[number];
export type WarpHostChoice = WarpHost | "auto";
export const DEFAULT_HOST_CHOICE: WarpHostChoice = "auto";

export interface GenerateRequest {
  format: ConfigFormat;
  /** Конкретный хост или «auto» (быстрейший живой из пула). */
  host?: WarpHostChoice;
  /** Конкретный порт или «auto» (случайный из пула). */
  port?: WarpPortChoice;
  /** Include IPv6. Default off (v4-only); opt in on the site. */
  ipv6?: boolean;
}

/** Diagnostics surfaced in the result modal and stored in history. */
export interface ConfigMeta {
  format: ConfigFormat;
  /** host:port that landed in the config. */
  endpoint?: string;
  ipv6?: boolean;
}

export interface GenerateResult {
  config: string;
  fileName: string;
  format: ConfigFormat;
  meta: ConfigMeta;
}

export type ApiResponse =
  | { success: true; data: GenerateResult }
  | { success: false; error: string };
