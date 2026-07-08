import type { ClashDevice } from "@/types";

/**
 * Локальные Clash-шаблоны по устройству. WARP-прокси в обоих генерятся
 * scripts/gen-endpoints.mjs (между маркерами BEGIN/END WARP PROXIES); роутинг
 * (rule-providers / proxy-groups / rules) правится руками. Путь относительно
 * `config/templates/`.
 *
 * - desktop — текущий шаблон с явными WARP-группами;
 * - mobile  — роутинг из roscomvpn-routing (MIHOMO/default.yaml), группы с
 *   include-all сами подхватывают WARP-прокси.
 */
export const CLASH_TEMPLATE_FILES: Record<ClashDevice, string> = {
  desktop: "clash.yaml",
  mobile: "clash-mobile.yaml",
};
