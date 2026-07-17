export type ConfigFormat = "amneziawg" | "clash";

/** UDP ports Cloudflare WARP is known to accept. */
export const WARP_PORTS = [4500, 2408, 500, 1701, 880, 8854] as const;
export type WarpPort = (typeof WARP_PORTS)[number];
/** Выбор порта: конкретный или «Авто» — случайный из WARP_PORTS. */
export type WarpPortChoice = WarpPort | "auto";
export const DEFAULT_PORT_CHOICE: WarpPortChoice = "auto";

/** How the endpoint host in the final config was chosen. */
export type EndpointSource = "auto" | "manual-ip" | "hostname" | "fallback";

export interface GenerateRequest {
  format: ConfigFormat;
  /** id from config/endpoints ENDPOINT_HOSTS. */
  endpointHostId?: string;
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
  endpointSource?: EndpointSource;
  port?: number;
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
