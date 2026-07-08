import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ClashDevice, DnsId } from "@/types";
import { DEFAULT_CLASH_DEVICE } from "@/types";
import { dnsList } from "@/config/dns";
import { CLASH_TEMPLATE_FILES } from "@/config/clash-templates";

export interface ClashParams {
  privateKey: string;
  clientIPv6: string;
  dnsId: DnsId;
  device?: ClashDevice;
}

/**
 * Builds a Clash config by reading the locally-vendored template for the chosen
 * device and injecting the freshly registered credentials. Both templates share
 * the same `&warp-common` YAML anchor, so we substitute the private key and the
 * WARP client IPv6 in it. The desktop template also carries inline `nameserver:
 * [...]` arrays that we swap for the selected DNS; the mobile template keeps its
 * own DoH resolvers (block form), so that replacement is a harmless no-op there.
 *
 * The templates live in `config/templates/`; they are force-bundled into the
 * serverless function via `outputFileTracingIncludes` in `next.config.mjs`.
 */
export async function buildClash(p: ClashParams): Promise<string> {
  const file = CLASH_TEMPLATE_FILES[p.device ?? DEFAULT_CLASH_DEVICE];
  const fullPath = path.join(process.cwd(), "config", "templates", file);

  let template: string;
  try {
    template = await readFile(fullPath, "utf8");
  } catch {
    throw new Error(`Не удалось прочитать шаблон Clash: ${file}`);
  }

  const dns = dnsList(p.dnsId, true).join(", ");

  return template
    .replace(/private-key:[^\n]*/, `private-key: ${p.privateKey}`)
    .replace(/ipv6:\s*2606:[0-9a-fA-F:]+/, `ipv6: ${p.clientIPv6}`)
    .replace(/nameserver:\s*\[[^\]]*\]/g, `nameserver: [${dns}]`);
}
