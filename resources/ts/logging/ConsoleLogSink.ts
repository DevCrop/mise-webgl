import type { LogEntry, LogSeverity, LogSink } from "./Logger.js";

export type ConsoleTarget = Pick<Console, "debug" | "info" | "warn" | "error">;

type ConsoleMethod = keyof ConsoleTarget;

interface Tone {
  readonly label: string;
  readonly method: ConsoleMethod;
  readonly foreground: string;
  readonly background: string;
  readonly border: string;
}

const TONES: Readonly<Record<LogSeverity, Tone>> = {
  debug: {
    label: "DEBUG",
    method: "debug",
    foreground: "#cbd5e1",
    background: "#334155",
    border: "#64748b",
  },
  info: {
    label: "INFO",
    method: "info",
    foreground: "#dbeafe",
    background: "#1d4ed8",
    border: "#3b82f6",
  },
  success: {
    label: "SUCCESS",
    method: "info",
    foreground: "#dcfce7",
    background: "#15803d",
    border: "#22c55e",
  },
  warning: {
    label: "WARN",
    method: "warn",
    foreground: "#422006",
    background: "#fbbf24",
    border: "#f59e0b",
  },
  error: {
    label: "ERROR",
    method: "error",
    foreground: "#fff1f2",
    background: "#be123c",
    border: "#fb7185",
  },
};

const BRAND_STYLE = [
  "background:#0f172a",
  "border:1px solid #334155",
  "border-radius:4px",
  "color:#f8fafc",
  "font-weight:700",
  "letter-spacing:.08em",
  "padding:2px 6px",
].join(";");

const TIME_STYLE = "color:#64748b;font-variant-numeric:tabular-nums;font-weight:400";
const SCOPE_STYLE = "color:#8b5cf6;font-weight:600";
const MESSAGE_STYLE = "color:inherit;font-weight:600";

export class ConsoleLogSink implements LogSink {
  constructor(private readonly target: ConsoleTarget = console) {}

  write(entry: LogEntry): void {
    const tone = TONES[entry.level];
    const format = `%c PORTFOLIO %c ${tone.label.padEnd(7)} %c${formatTime(entry.timestamp)} %c${entry.scope}%c ${entry.message}`;
    const args: unknown[] = [
      format,
      BRAND_STYLE,
      toneStyle(tone),
      TIME_STYLE,
      SCOPE_STYLE,
      MESSAGE_STYLE,
    ];

    if (entry.context && Object.keys(entry.context).length > 0) args.push(entry.context);
    this.target[tone.method](...args);
  }
}

function toneStyle(tone: Tone): string {
  return [
    `background:${tone.background}`,
    `border:1px solid ${tone.border}`,
    "border-radius:4px",
    `color:${tone.foreground}`,
    "font-weight:700",
    "padding:2px 6px",
  ].join(";");
}

function formatTime(timestamp: string): string {
  return `${timestamp.slice(11, 23)}Z`;
}
