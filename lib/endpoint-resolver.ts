import net from "node:net";
import type { WarpHost, WarpHostChoice, WarpPort, WarpPortChoice } from "@/types";
import { DEFAULT_HOST_CHOICE, DEFAULT_PORT_CHOICE, WARP_HOSTS, WARP_PORTS } from "@/types";

// Server-only endpoint resolution (uses node:net). Keep this out of any client
// component.

// Пул для авто-проб — только IP (хостнейм резолвится в один из них). Проверяем
// TCP-доступность, поэтому «engage» тут лишний.
const IP_POOL: WarpHost[] = WARP_HOSTS.filter((h) => /^[\d.]+$/.test(h));

/**
 * TCP-connect probe. WARP data uses UDP, but these anycast IPs are Cloudflare
 * and answer on TCP 443, so a fast connect is a decent liveness signal for
 * "this range is reachable from our region". Returns latency ms or null.
 */
function tcpLatency(host: string, port: number, timeoutMs: number): Promise<number | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    const finish = (ok: boolean) => {
      socket.destroy();
      resolve(ok ? Date.now() - started : null);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

/** Probe the IP pool in parallel; pick the fastest reachable, else a random one. */
async function pickReachableIp(): Promise<string> {
  const probes = await Promise.all(
    IP_POOL.map(async (host) => ({ host, latency: await tcpLatency(host, 443, 700) })),
  );
  const alive = probes.filter((p) => p.latency !== null).sort((a, b) => a.latency! - b.latency!);
  if (alive.length > 0) return alive[0].host;
  return IP_POOL[Math.floor(Math.random() * IP_POOL.length)];
}

/**
 * «Авто» — случайный порт из пула. WARP слушает их все, но фильтруются они
 * по-разному, поэтому один порт, зашитый на всех пользователей, — общая точка
 * отказа: стоит провайдеру прикрыть его, и конфиги перестают работать у всех
 * сразу. Разброс размазывает риск.
 */
function resolvePort(choice: WarpPortChoice): WarpPort {
  if (choice !== "auto") return choice;
  return WARP_PORTS[Math.floor(Math.random() * WARP_PORTS.length)];
}

export interface ResolvedEndpoint {
  /** `host:port` — ready to drop into an AmneziaWG `Endpoint =` line. */
  endpoint: string;
  /** Host alone — Clash needs it apart from the port for `server:`. */
  host: string;
  port: WarpPort;
}

/** Resolve a host choice + port into a concrete `host:port`. */
export async function resolveEndpoint(
  hostChoice: WarpHostChoice = DEFAULT_HOST_CHOICE,
  portChoice: WarpPortChoice = DEFAULT_PORT_CHOICE,
): Promise<ResolvedEndpoint> {
  const port = resolvePort(portChoice);
  const host = hostChoice === "auto" ? await pickReachableIp() : hostChoice;
  return { endpoint: `${host}:${port}`, host, port };
}
