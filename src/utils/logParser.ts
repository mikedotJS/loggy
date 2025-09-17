import type { LogEntry, ParsedLog } from "../types/log";

// Common log patterns
const LOG_PATTERNS = [
  // ISO timestamp with level: 2023-12-01T10:30:45.123Z [INFO] Message
  {
    name: "ISO with level",
    regex:
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s*\[?([A-Z]+)\]?\s*(.*)$/,
    groups: { timestamp: 1, level: 2, message: 3 },
  },
  // Standard format: 2023-12-01 10:30:45 INFO Message
  {
    name: "Standard format",
    regex:
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+([A-Z]+)\s+(.*)$/,
    groups: { timestamp: 1, level: 2, message: 3 },
  },
  // Syslog format: Dec 01 10:30:45 hostname program[pid]: message
  {
    name: "Syslog format",
    regex:
      /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+([^:]+):\s*(.*)$/,
    groups: { timestamp: 1, source: 2, thread: 3, message: 4 },
  },
  // Apache access log: IP - - [timestamp] "request" status size
  {
    name: "Apache access",
    regex:
      /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]*)"?\s+(\d+)\s+(\S+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/,
    groups: { source: 1, timestamp: 2, message: 3, level: 4 },
  },
  // JSON logs
  {
    name: "JSON format",
    regex: /^(\{.*\})$/,
    groups: { message: 1 },
  },
  // Simple timestamp: [10:30:45] Message
  {
    name: "Simple timestamp",
    regex: /^\[(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\]\s*(.*)$/,
    groups: { timestamp: 1, message: 2 },
  },
];

function parseTimestamp(timestampStr: string): Date | undefined {
  if (!timestampStr) return undefined;

  // Try different timestamp formats
  const formats = [
    // ISO format
    (ts: string) => new Date(ts),
    // Standard format
    (ts: string) => new Date(ts),
    // Syslog format (add current year)
    (ts: string) => {
      const currentYear = new Date().getFullYear();
      return new Date(`${currentYear} ${ts}`);
    },
    // Apache format
    (ts: string) =>
      new Date(ts.replace(/(\d{2})\/([A-Z][a-z]{2})\/(\d{4}):/, "$3-$2-$1 ")),
    // Time only (add current date)
    (ts: string) => {
      if (/^\d{2}:\d{2}:\d{2}/.test(ts)) {
        const today = new Date().toISOString().split("T")[0];
        return new Date(`${today}T${ts}`);
      }
      return null;
    },
  ];

  for (const format of formats) {
    try {
      const date = format(timestampStr);
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function parseJsonLog(line: string, lineNumber: number): LogEntry | null {
  try {
    const json = JSON.parse(line);

    // Handle different timestamp field names
    const timestamp =
      json.timestamp || json["@timestamp"] || json.time || json.ts;

    // Build a concise, human-friendly summary message from common fields
    const buildSummary = (obj: Record<string, unknown>): string | undefined => {
      const parts: string[] = [];
      const pick = (keys: string[]): unknown => {
        for (const k of keys) {
          const v = obj[k];
          if (v !== undefined && v !== null) return v;
        }
        return undefined;
      };
      const moduleName = pick(["module", "service", "source", "logger"]);
      const feature = pick(["feature", "action", "event", "endpoint"]);
      const type = pick(["type", "category"]);
      const status = pick(["status", "statusCode", "code"]);
      const msg = pick(["message", "msg", "text"]);

      if (moduleName) parts.push(String(moduleName));
      if (feature) parts.push(String(feature));
      if (
        type &&
        (!msg || String(type).toLowerCase() !== String(msg).toLowerCase())
      ) {
        parts.push(String(type));
      }
      if (status) parts.push(String(status));

      const head = parts.filter(Boolean).join(" • ");
      if (msg && head) return `${head} — ${String(msg)}`;
      return String(head || msg || "Log entry");
    };

    const summaryMessage = buildSummary(json);

    return {
      id: `line-${lineNumber}`,
      timestamp: timestamp ? parseTimestamp(timestamp) : undefined,
      level: json.level?.toUpperCase() as LogEntry["level"],
      message: String(summaryMessage || "Log entry"),
      rawLine: line,
      lineNumber,
      source:
        typeof (json.source || json.logger || json.module || json.service) ===
        "string"
          ? json.source || json.logger || json.module || json.service
          : undefined,
      thread:
        typeof (json.thread || json.process || json.correlationId) === "string"
          ? json.thread || json.process || json.correlationId
          : undefined,
      metadata: json,
    };
  } catch {
    return null;
  }
}

function detectLogLevel(text: string): LogEntry["level"] | undefined {
  const upperText = text.toUpperCase();
  const levels: LogEntry["level"][] = [
    "FATAL",
    "ERROR",
    "WARN",
    "INFO",
    "DEBUG",
    "TRACE",
  ];

  for (const level of levels) {
    if (level && upperText.includes(level)) {
      return level;
    }
  }
  return undefined;
}

export function parseLogFile(content: string, filename: string): ParsedLog {
  const lines = content.split("\n");
  const entries: LogEntry[] = [];
  let detectedFormat = "Unknown";

  // Try to extract the first balanced JSON object from a string
  function extractFirstJsonObject(
    text: string
  ): { json: Record<string, unknown>; start: number; end: number } | null {
    if (!text) return null;
    const startIdx = text.indexOf("{");
    if (startIdx === -1) return null;
    let inString = false;
    let escape = false;
    let depth = 0;
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      } else {
        if (ch === '"') {
          inString = true;
          continue;
        }
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            const candidate = text.slice(startIdx, i + 1);
            try {
              const json = JSON.parse(candidate) as Record<string, unknown>;
              return { json, start: startIdx, end: i };
            } catch {
              return null;
            }
          }
        }
      }
    }
    return null;
  }

  function coerceLevel(val: unknown): LogEntry["level"] | undefined {
    if (!val) return undefined;
    const s = String(val).toUpperCase();
    const allowed: LogEntry["level"][] = [
      "FATAL",
      "ERROR",
      "WARN",
      "INFO",
      "DEBUG",
      "TRACE",
    ];
    return allowed.includes(s as LogEntry["level"])
      ? (s as LogEntry["level"])
      : undefined;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lineNumber = i + 1;
    let entry: LogEntry | null = null;

    // Try JSON parsing first
    if (line.startsWith("{")) {
      entry = parseJsonLog(line, lineNumber);
      if (entry) {
        detectedFormat = "JSON format";
      }
    }

    // Try pattern matching
    if (!entry) {
      for (const pattern of LOG_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          const groups = pattern.groups;

          entry = {
            id: `line-${lineNumber}`,
            timestamp: groups.timestamp
              ? parseTimestamp(match[groups.timestamp])
              : undefined,
            level: groups.level
              ? (match[groups.level]?.toUpperCase() as LogEntry["level"])
              : detectLogLevel(line),
            message: groups.message ? match[groups.message] : line,
            rawLine: line,
            lineNumber,
            source: groups.source ? match[groups.source] : undefined,
            thread: groups.thread ? match[groups.thread] : undefined,
          };

          detectedFormat = pattern.name;
          break;
        }
      }
    }

    // Fallback: treat as plain text
    if (!entry) {
      entry = {
        id: `line-${lineNumber}`,
        level: detectLogLevel(line),
        message: line,
        rawLine: line,
        lineNumber,
      };
      detectedFormat = "Plain text";
    }

    // If message contains an embedded JSON object, parse and enrich entry
    if (entry && !entry.metadata) {
      const extracted = extractFirstJsonObject(entry.message);
      if (extracted) {
        const json = extracted.json as Record<string, unknown>;
        entry.metadata = json;

        // Helper to safely pick the first present value from keys
        const pick = (
          obj: Record<string, unknown>,
          keys: string[]
        ): unknown => {
          for (const k of keys) {
            const v = obj[k];
            if (v !== undefined && v !== null) return v;
          }
          return undefined;
        };

        // Backfill timestamp/level/source/thread from JSON when missing
        if (!entry.timestamp) {
          const ts = pick(json, ["timestamp", "@timestamp", "time", "ts"]);
          if (typeof ts === "string" || typeof ts === "number")
            entry.timestamp = parseTimestamp(String(ts));
        }
        if (!entry.level) {
          const lvl = coerceLevel(pick(json, ["level", "severity", "lvl"]));
          if (lvl) entry.level = lvl;
        }
        if (!entry.source) {
          const src = pick(json, ["source", "logger", "module", "service"]);
          if (typeof src === "string") entry.source = src as string;
        }
        if (!entry.thread) {
          const thr = pick(json, ["thread", "process", "correlationId"]);
          if (typeof thr === "string") entry.thread = thr as string;
        }

        // Derive a cleaner message reusing the same summary rules
        const derived = ((): string | undefined => {
          const messageVal = pick(json, ["message", "msg", "text"]);
          const summary = messageVal ? String(messageVal) : undefined;
          const headParts: string[] = [];
          const moduleName = pick(json, [
            "module",
            "service",
            "source",
            "logger",
          ]);
          const feature = pick(json, [
            "feature",
            "action",
            "event",
            "endpoint",
          ]);
          const type = pick(json, ["type", "category"]);
          const status = pick(json, ["status", "statusCode", "code"]);
          if (moduleName) headParts.push(String(moduleName));
          if (feature) headParts.push(String(feature));
          if (
            type &&
            (!summary ||
              String(type).toLowerCase() !== String(summary).toLowerCase())
          )
            headParts.push(String(type));
          if (status) headParts.push(String(status));
          const head = headParts.filter(Boolean).join(" • ");
          if (summary && head) return `${head} — ${summary}`;
          return head || summary;
        })();

        if (derived) {
          entry.message = String(derived);
        } else {
          // If there's non-JSON prefix/suffix text, keep that as message
          const before = entry.message.slice(0, extracted.start).trim();
          const after = entry.message.slice(extracted.end + 1).trim();
          entry.message = before || after || "Log entry";
        }
      }
    }

    entries.push(entry);
  }

  return {
    entries,
    totalLines: lines.length,
    filename,
    detectedFormat,
  };
}
