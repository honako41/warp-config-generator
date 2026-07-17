const BASE_URL = "https://api.cloudflareclient.com/v0i1909051800";

const HEADERS = {
  "User-Agent": "okhttp/3.12.1",
  "Content-Type": "application/json",
} as const;

export interface WarpRegistration {
  /**
   * Client interface IPv6, the only per-registration value we need — the peer
   * public key and the IPv4 (172.16.0.2) are WARP constants baked into the
   * builders. Registration itself is still required: it's what makes the
   * freshly generated key valid at the WARP endpoint.
   */
  clientIPv6: string;
}

interface RegResponse {
  result?: { id?: string; token?: string };
}

interface WarpResponse {
  result?: {
    config?: {
      interface?: { addresses?: { v6?: string } };
    };
  };
}

/**
 * Registers a fresh WireGuard public key with the Cloudflare WARP API and
 * enables WARP, returning the peer key and assigned client addresses needed to
 * build a working config.
 */
export async function registerWarp(publicKey: string): Promise<WarpRegistration> {
  const reg = await fetch(`${BASE_URL}/reg`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      install_id: "",
      tos: new Date().toISOString(),
      key: publicKey,
      fcm_token: "",
      type: "ios",
      locale: "en_US",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!reg.ok) throw new Error(`Регистрация не удалась: HTTP ${reg.status}`);

  const regData = (await reg.json()) as RegResponse;
  const id = regData.result?.id;
  const token = regData.result?.token;
  if (!id || !token) throw new Error("Некорректный ответ регистрации Cloudflare");

  const warp = await fetch(`${BASE_URL}/reg/${id}`, {
    method: "PATCH",
    headers: { ...HEADERS, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ warp_enabled: true }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!warp.ok) throw new Error(`Активация WARP не удалась: HTTP ${warp.status}`);

  const warpData = (await warp.json()) as WarpResponse;
  const clientIPv6 = warpData.result?.config?.interface?.addresses?.v6;
  if (!clientIPv6) {
    throw new Error("Некорректный ответ конфигурации WARP");
  }

  return { clientIPv6 };
}
