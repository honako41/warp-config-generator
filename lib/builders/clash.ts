import { readFile } from "node:fs/promises";
import path from "node:path";

// Single universal template (PC / phone / router) — the source of truth; there
// is no generator. Force-bundled into the function via next.config.mjs.
const TEMPLATE_FILE = "clash.yaml";

export interface ClashParams {
  privateKey: string;
  clientIPv6: string;
  /** Endpoint host applied to all three mask-nodes. */
  host: string;
  /** Endpoint port applied to all three mask-nodes. */
  port: number;
  /** Dual-stack: add the client IPv6, route ::/0 through WARP, drop the block. */
  ipv6: boolean;
}

/**
 * Builds a Clash config from the locally-vendored template. The three endpoints
 * differ only by handshake mask (AmneziaWG `i1`) and share one `&warp-common`
 * anchor, so the key, host and port each substitute once and cover all three.
 *
 * The template is v4-only by default; `ipv6` flips it to dual-stack with four
 * coordinated edits (see below). Everything else — both DNS providers, the
 * routing — is static in the template, which is the source of truth.
 *
 * The template lives in `config/templates/`; it is force-bundled into the
 * serverless function via `outputFileTracingIncludes` in `next.config.mjs`.
 */
export async function buildClash(p: ClashParams): Promise<string> {
  const fullPath = path.join(process.cwd(), "config", "templates", TEMPLATE_FILE);

  let template: string;
  try {
    template = await readFile(fullPath, "utf8");
  } catch {
    throw new Error(`Не удалось прочитать шаблон Clash: ${TEMPLATE_FILE}`);
  }

  // Node-level fields are indented 4 spaces; `tproxy-port:` sits at column 0 and
  // `ports:` (sniffer) has a different key, so neither is touched.
  let out = template
    .replace(/private-key:[^\n]*/, `private-key: ${p.privateKey}`)
    .replace(/^ {4}server:.*$/gm, `    server: ${p.host}`)
    .replace(/^ {4}port:.*$/gm, `    port: ${p.port}`);

  // The endpoint pin keeps the WARP server itself off the tunnel. It must follow
  // the chosen endpoint: for an IP host, pin it; for a hostname (engage), drop
  // the line — IP-CIDR can't match a name, and routing-mark (router) plus
  // mihomo dialling the endpoint directly (desktop) already prevent the loop.
  const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(p.host);
  out = isIPv4
    ? out.replace("WARP_ENDPOINT", p.host)
    : out.replace(/^ {2}- IP-CIDR,WARP_ENDPOINT\/32,DIRECT,no-resolve\n/m, "");

  if (p.ipv6) {
    out = out
      // client IPv6 on the interface, right after the IPv4 address
      .replace(/^( {2}ip: .*)$/m, `$1\n  ipv6: ${p.clientIPv6}`)
      // route IPv6 into the tunnel too
      .replace(/allowed-ips:\s*\['0\.0\.0\.0\/0'\]/, `allowed-ips: ['0.0.0.0/0', '::/0']`)
      // flip BOTH `ipv6: false` — top-level (stack/routing) and the dns block
      // (без него AAAA не резолвятся и IPv6-путь для доменов не задействуется).
      // Keeps indentation; the injected `  ipv6: <addr>` above isn't `false`.
      .replace(/^(\s*)ipv6: false$/gm, "$1ipv6: true")
      // drop the rule that would otherwise kill all IPv6 egress
      .replace(/^ {2}- IP-CIDR,::\/0,REJECT-DROP,no-resolve\n/m, "");
  }

  return out;
}
