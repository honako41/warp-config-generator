import type { GenerateRequest, GenerateResult } from "@/types";
import { WARP_HOSTS, WARP_PORTS } from "@/types";
import { generateKeyPair } from "./crypto";
import { registerWarp } from "./cloudflare";
import { buildAmneziaWG } from "./builders/amneziawg";
import { buildClash } from "./builders/clash";

// «Авто» — просто случайный выбор; разброс размазывает риск (режут один IP или
// порт — следующая генерация выдаст другой).
const IP_POOL = WARP_HOSTS.filter((h) => /^[\d.]+$/.test(h));
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

/**
 * Full pipeline: generate keys -> register with Cloudflare WARP -> pick an
 * endpoint -> build the config in the requested format.
 */
export async function generateConfig(req: GenerateRequest): Promise<GenerateResult> {
  const keyPair = generateKeyPair();
  const reg = await registerWarp(keyPair.publicKey);

  const host = !req.host || req.host === "auto" ? pick(IP_POOL) : req.host;
  const port = !req.port || req.port === "auto" ? pick(WARP_PORTS) : req.port;
  // v4-only by default: a dead IPv6 path in a client's network causes
  // happy-eyeballs stalls. The user can opt in on the site.
  const ipv6 = req.ipv6 ?? false;

  // Оба билдера принимают одинаковую форму — различаются только выходным
  // форматом (.conf против .yaml).
  const params = { privateKey: keyPair.privateKey, clientIPv6: reg.clientIPv6, host, port, ipv6 };

  let config: string;
  let fileName: string;
  switch (req.format) {
    case "amneziawg":
      config = buildAmneziaWG(params);
      fileName = `warp-awg-${stamp()}.conf`;
      break;
    case "clash":
      config = await buildClash(params);
      fileName = `warp-clash-${stamp()}.yaml`;
      break;
  }

  return {
    config,
    fileName,
    format: req.format,
    meta: {
      format: req.format,
      endpoint: `${host}:${port}`,
      ipv6,
    },
  };
}

function stamp(): string {
  return Math.floor(Math.random() * 9_000_000 + 1_000_000).toString();
}
