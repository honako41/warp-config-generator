import { NextResponse } from "next/server";
import { generateConfig } from "@/lib/warp";
import { WARP_HOSTS, WARP_PORTS, DEFAULT_HOST_CHOICE, DEFAULT_PORT_CHOICE } from "@/types";
import type { ApiResponse, WarpHost, WarpHostChoice, WarpPort, WarpPortChoice } from "@/types";

// Registration calls Cloudflare per request and must never be cached; needs the
// Node runtime for node:crypto key generation and node:net endpoint probing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Некорректный запрос" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (b.format !== "amneziawg" && b.format !== "clash") {
    return NextResponse.json({ success: false, error: "Неизвестный формат" }, { status: 400 });
  }
  const format = b.format;

  // Всё, что не в пуле (в т.ч. "auto" и отсутствие поля), — это «Авто».
  const host: WarpHostChoice = WARP_HOSTS.includes(b.host as WarpHost)
    ? (b.host as WarpHost)
    : DEFAULT_HOST_CHOICE;
  const port: WarpPortChoice = WARP_PORTS.includes(b.port as WarpPort)
    ? (b.port as WarpPort)
    : DEFAULT_PORT_CHOICE;
  // Пробрасываем только явный выбор IPv6 — дефолт (выключен) задаёт generateConfig.
  const ipv6 = typeof b.ipv6 === "boolean" ? b.ipv6 : undefined;

  try {
    const data = await generateConfig({
      format,
      host,
      port,
      ipv6,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("generate error:", err);
    const error = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error }, { status: 502 });
  }
}
