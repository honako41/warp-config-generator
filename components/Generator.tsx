"use client";

import { DONATE_URL } from "@/config/donate";
import { DEFAULT_HOST_ID, ENDPOINT_HOSTS } from "@/config/endpoints";
import { GUIDES, OS_OPTIONS, detectOs, type OsId } from "@/config/guides";
import type { Sponsor } from "@/config/sponsor";
import { copyConfig, download, saveEntry } from "@/lib/history";
import type {
  ApiResponse,
  ConfigFormat,
  ConfigMeta,
  GenerateResult,
  WarpPort,
  WarpPortChoice,
} from "@/types";
import { DEFAULT_PORT_CHOICE, WARP_PORTS } from "@/types";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";

const FORMAT_OPTIONS: readonly { value: ConfigFormat; label: string }[] = [
  { value: "amneziawg", label: "Amnezia" },
  { value: "clash", label: "Clash" },
];

/** Полное имя формата для заголовков и сводки. */
function formatLabel(format: ConfigFormat): string {
  switch (format) {
    case "amneziawg":
      return "AmneziaWG";
    case "clash":
      return "Clash";
  }
}
const HOST_OPTIONS = ENDPOINT_HOSTS.map((h) => ({ value: h.id, label: h.label }));
const PORT_OPTIONS = [
  { value: "auto", label: "Авто" },
  ...WARP_PORTS.map((p) => ({ value: String(p), label: String(p) })),
];

const SOURCE_LABEL: Record<NonNullable<ConfigMeta["endpointSource"]>, string> = {
  auto: "авто",
  "manual-ip": "выбрано",
  hostname: "hostname",
  fallback: "резерв",
};

const LINK_CLASS =
  "mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 block text-sm font-semibold text-ink">{label}</legend>
      <div className="flex w-full flex-wrap gap-1 rounded-full border border-hairline bg-surface-soft p-1">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={[
                "min-w-0 flex-1 cursor-pointer truncate rounded-full px-4 py-2 text-sm font-medium leading-none transition-colors",
                active
                  ? "bg-surface text-ink shadow-sm ring-1 ring-brand/40"
                  : "text-body hover:text-ink",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 block text-sm font-semibold text-ink">{label}</legend>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-full border border-hairline bg-surface-soft px-4 py-2.5 pr-9 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mute"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </fieldset>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 flex-none rounded-full transition-colors",
          checked ? "bg-brand" : "bg-hairline-strong",
        ].join(" ")}
      >
        <span
          className={[
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

/**
 * Сводка по конфигу. Формат не показываем: его юзер только что выбрал сам, и он
 * же в имени файла. Оба формата резолвят эндпоинт/порт и знают про IPv6.
 */
function Diagnostics({ meta }: { meta: ConfigMeta }) {
  const rows: [string, string][] = [];
  if (meta.endpoint) {
    const src = meta.endpointSource ? ` · ${SOURCE_LABEL[meta.endpointSource]}` : "";
    rows.push(["Endpoint", `${meta.endpoint}${src}`]);
  }
  rows.push(["IPv6", meta.ipv6 ? "включён" : "выключен"]);
  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-hairline bg-surface-soft px-4 py-3 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-mute">{k}</dt>
          <dd className="m-0 break-all font-mono text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const OS_TAB_OPTIONS = OS_OPTIONS.map((o) => ({ value: o.id, label: o.label }));

function ConnectGuide({
  format,
  os,
  onOsChange,
}: {
  format: ConfigFormat;
  os: OsId;
  onOsChange: (os: OsId) => void;
}) {
  const g = GUIDES[format][os];
  const multi = g.apps.length > 1;
  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Устройство" value={os} options={OS_TAB_OPTIONS} onChange={onOsChange} />
      {g.apps.map((app, ai) => (
        <section key={app.name} className={ai > 0 ? "border-t border-hairline pt-4" : ""}>
          {multi && (
            <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-brand">
              {app.name}
            </h4>
          )}
          <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[13.5px] leading-relaxed text-body marker:tabular-nums marker:text-mute">
            {app.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {app.links.map((c) => (
              <a
                key={c.url}
                className={LINK_CLASS}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("client_download", { app: c.app, format, os })}
              >
                Скачать {c.app} ↗
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SponsorBlock({
  sponsor,
  divider = false,
}: {
  sponsor: Sponsor;
  divider?: boolean;
}) {
  return (
    <aside className={divider ? "mt-5 border-t border-hairline pt-5" : ""}>
      <span className="mb-2 inline-block text-[10.5px] font-bold uppercase tracking-wider text-brand">
        {sponsor.title}
      </span>
      <p className="m-0 text-[13.5px] leading-relaxed text-body">{sponsor.text}</p>
      <a
        className={LINK_CLASS}
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("sponsor", { title: sponsor.title })}
      >
        {sponsor.cta} ↗
      </a>
    </aside>
  );
}

export default function Generator({ sponsor }: { sponsor: Sponsor | null }) {
  const [format, setFormat] = useState<ConfigFormat>("amneziawg");
  const [endpointHostId, setEndpointHostId] = useState<string>(DEFAULT_HOST_ID);
  const [port, setPort] = useState<WarpPortChoice>(DEFAULT_PORT_CHOICE);
  // v4-only по умолчанию: IPv6 без рабочего v6-пути в сети даёт подвисания.
  const [ipv6, setIpv6] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [os, setOs] = useState<OsId>("windows");
  const [guideFormat, setGuideFormat] = useState<ConfigFormat>("amneziawg");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const guideRef = useRef<HTMLDialogElement>(null);

  // Подставляем вкладку под ОС пользователя (только на клиенте, чтобы не ломать гидрацию).
  useEffect(() => setOs(detectOs()), []);

  function openGuide(f: ConfigFormat) {
    setGuideFormat(f);
    guideRef.current?.showModal();
    track("guide_open", { format: f, os });
  }
  function closeGuide() {
    guideRef.current?.close();
  }
  function onGuideBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === guideRef.current) closeGuide();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, endpointHostId, port, ipv6 }),
      });
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        setError(json.error);
        track("generate_error", { format, reason: "api", message: json.error });
        return;
      }
      setResult(json.data);
      saveEntry(json.data);
      setCopied(false);
      dialogRef.current?.showModal();
      track("generate", { format, ipv6, port });
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
      track("generate_error", { format, reason: "network" });
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) closeModal();
  }

  async function onCopy() {
    if (!result) return;
    if (await copyConfig(result.config)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      track("copy", { format: result.format });
    } else {
      setError("Не удалось скопировать в буфер обмена.");
    }
  }

  const secondaryBtn =
    "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-hairline-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-soft";

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-hairline bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_44px_-26px_rgba(246,130,31,0.35)]"
      >
        <Segmented label="Формат" value={format} options={FORMAT_OPTIONS} onChange={setFormat} />

        <Select
          label="Endpoint"
          value={endpointHostId}
          options={HOST_OPTIONS}
          onChange={setEndpointHostId}
        />
        <Select
          label="Порт"
          value={String(port)}
          options={PORT_OPTIONS}
          onChange={(v) => setPort(v === "auto" ? "auto" : (Number(v) as WarpPort))}
        />

        <Toggle label="IPv6" checked={ipv6} onChange={setIpv6} />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand shadow-[0_10px_24px_-10px_rgba(246,130,31,0.75)] transition-all hover:-translate-y-px hover:bg-brand-hover active:translate-y-0 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-mute disabled:shadow-none"
        >
          {loading ? (
            <>
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:[animation-duration:1.5s]"
                aria-hidden="true"
              />
              Генерация…
            </>
          ) : (
            <>
              <svg
                className="flex-none"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Сгенерировать
            </>
          )}
        </button>
      </form>

      <div aria-live="polite">
        {error && (
          <p
            className="mt-4 rounded-xl border border-hairline bg-surface-soft px-4 py-3 text-sm text-body"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>

      {sponsor && (
        <div className="mt-4 rounded-2xl border border-hairline bg-surface-soft p-6">
          <SponsorBlock sponsor={sponsor} />
        </div>
      )}

      <button
        type="button"
        onClick={() => openGuide(format)}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-hairline bg-surface-soft px-5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Как подключиться
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-xl overflow-hidden rounded-2xl border border-hairline bg-surface p-0 text-body shadow-[0_24px_60px_-16px_rgba(0,0,0,0.45)] backdrop:bg-black/50"
        aria-labelledby="result-title"
        onClick={onBackdropClick}
        onClose={() => setCopied(false)}
      >
        {result && (
          <div className="flex max-h-[calc(100dvh-48px)] flex-col gap-4 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="result-title" className="text-lg font-bold text-ink">
                  {formatLabel(result.format)}
                </h2>
                <span className="mt-1 block break-all font-mono text-xs text-mute">
                  {result.fileName}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-hairline-strong bg-surface text-[13px] text-ink transition-colors hover:bg-surface-soft"
                aria-label="Закрыть"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            <Diagnostics meta={result.meta} />

            {/* Превью прячем на узких и низких экранах: там от <pre> остаётся
                полоска в пару строк, в которой всё равно ничего не разобрать, —
                а «Копировать» и «Скачать» работают и без него. */}
            <div className="overflow-hidden rounded-xl border border-hairline bg-canvas max-sm:hidden [@media(max-height:600px)]:hidden">
              <div className="flex items-center gap-2 border-b border-hairline px-4 py-3" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-term-red" />
                <span className="h-3 w-3 rounded-full bg-term-yellow" />
                <span className="h-3 w-3 rounded-full bg-term-green" />
              </div>
              <pre className="m-0 max-h-[min(360px,52dvh)] overflow-auto p-4 font-mono text-[13px] leading-relaxed whitespace-pre text-ink [tab-size:2]">
                <code>{result.config}</code>
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryBtn} onClick={onCopy}>
                {copied ? "Скопировано" : "Копировать"}
              </button>
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => {
                  download(result.fileName, result.config);
                  track("download", { format: result.format });
                }}
              >
                Скачать
              </button>
            </div>

            {sponsor && <SponsorBlock sponsor={sponsor} divider />}

            <div className="mt-5 border-t border-hairline pt-5">
              <button
                type="button"
                onClick={() => openGuide(result.format)}
                className={secondaryBtn + " w-full"}
              >
                Как подключиться
              </button>
            </div>

            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("donate", { from: "result" })}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-6 py-2 text-[15px] font-semibold text-brand transition-colors hover:bg-brand/20"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Поддержать
            </a>
          </div>
        )}
      </dialog>

      <dialog
        ref={guideRef}
        className="m-auto max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-lg overflow-hidden rounded-2xl border border-hairline bg-surface p-0 text-body shadow-[0_24px_60px_-16px_rgba(0,0,0,0.45)] backdrop:bg-black/50"
        aria-labelledby="guide-title"
        onClick={onGuideBackdropClick}
      >
        <div className="flex max-h-[calc(100dvh-48px)] flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="guide-title" className="text-lg font-bold text-ink">
                Как подключиться
              </h2>
              <span className="mt-1 block text-xs text-mute">
                {formatLabel(guideFormat)} · выберите устройство
              </span>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-hairline-strong bg-surface text-[13px] text-ink transition-colors hover:bg-surface-soft"
              aria-label="Закрыть"
              onClick={closeGuide}
            >
              ✕
            </button>
          </div>

          <ConnectGuide format={guideFormat} os={os} onOsChange={setOs} />
        </div>
      </dialog>
    </>
  );
}
