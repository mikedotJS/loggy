import { useMemo, useState, useCallback, useRef } from "react";
import type { LogEntry } from "../types/log";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  Copy,
  Clock,
  AlertCircle,
  Info,
  Bug,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface LogViewerProps {
  entries: LogEntry[];
  filename: string;
  detectedFormat: string;
}

interface LogFilters {
  search: string;
  level: string;
  dateFrom: string;
  dateTo: string;
  module: string;
  feature: string;
  user: string;
}

const getLevelIcon = (level?: string) => {
  switch (level) {
    case "ERROR":
    case "FATAL":
      return <AlertCircle className="h-3 w-3" />;
    case "WARN":
      return <Zap className="h-3 w-3" />;
    case "INFO":
      return <Info className="h-3 w-3" />;
    case "DEBUG":
    case "TRACE":
      return <Bug className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const getLevelColor = (
  level?: string
): "destructive" | "secondary" | "default" | "outline" => {
  switch (level) {
    case "ERROR":
    case "FATAL":
      return "destructive";
    case "WARN":
      return "secondary";
    case "INFO":
      return "default";
    case "DEBUG":
    case "TRACE":
      return "outline";
    default:
      return "outline";
  }
};

interface LogRowProps {
  entry: LogEntry;
}

function LogRow({ entry }: LogRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyLine = () => {
    navigator.clipboard.writeText(entry.rawLine);
  };

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Generic field parser - extracts all available fields
  const parseFields = () => {
    const fields: Array<{
      key: string;
      value: unknown;
      type: "primary" | "secondary" | "metadata";
    }> = [];

    // Always include core fields
    fields.push({ key: "line", value: entry.lineNumber, type: "primary" });

    if (entry.timestamp) {
      fields.push({
        key: "timestamp",
        value: entry.timestamp,
        type: "primary",
      });
    }

    if (entry.level) {
      fields.push({ key: "level", value: entry.level, type: "primary" });
    }

    if (entry.source) {
      fields.push({ key: "source", value: entry.source, type: "secondary" });
    }

    if (entry.thread) {
      fields.push({ key: "thread", value: entry.thread, type: "secondary" });
    }

    fields.push({ key: "message", value: entry.message, type: "primary" });

    // Parse all metadata fields
    if (entry.metadata) {
      Object.entries(entry.metadata).forEach(([key, value]) => {
        // Skip fields we've already included
        if (["level", "message", "@timestamp", "timestamp"].includes(key))
          return;

        // Categorize field importance
        const importantFields = [
          "module",
          "feature",
          "action",
          "correlationId",
          "user.login",
          "village.code",
          "version",
          "type",
          "context",
          "error",
          "statusCode",
          "method",
          "url",
          "ip",
          "userAgent",
          "duration",
          "status",
        ];

        const type = importantFields.includes(key) ? "secondary" : "metadata";
        fields.push({ key, value, type });
      });
    }

    return fields;
  };

  const fields = parseFields();
  const primaryFields = fields.filter((f) => f.type === "primary");
  const secondaryFields = fields.filter((f) => f.type === "secondary");
  const metadataFields = fields.filter((f) => f.type === "metadata");
  const hasExpandableFields =
    secondaryFields.length > 3 || metadataFields.length > 0;

  // Safely render field value
  const renderFieldValue = (
    key: string,
    value: unknown,
    context: "inline" | "expanded" = "inline"
  ) => {
    if (key === "line") return value as number;
    if (key === "timestamp" && value instanceof Date) {
      return context === "inline"
        ? value.toLocaleTimeString()
        : value.toLocaleString();
    }
    if (key === "level") {
      return (
        <Badge variant={getLevelColor(String(value))} className="h-5 text-xs">
          <span className="flex items-center gap-1">
            {getLevelIcon(String(value))}
            <span>{String(value)}</span>
          </span>
        </Badge>
      );
    }
    if (typeof value === "object" && value !== null) {
      return context === "expanded" ? (
        <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        `{${Object.keys(value as Record<string, unknown>).length} fields}`
      );
    }
    if (
      typeof value === "string" &&
      value.length > 100 &&
      context === "inline"
    ) {
      return value.substring(0, 100) + "...";
    }
    return String(value ?? "");
  };

  return (
    <div className="border-b hover:bg-muted/50 group">
      {/* Main log row */}
      <div className="flex items-start gap-2 p-3">
        <div className="w-12 text-xs text-muted-foreground font-mono shrink-0 pt-1">
          {renderFieldValue(
            "line",
            primaryFields.find((f) => f.key === "line")?.value
          )}
        </div>

        {primaryFields.find((f) => f.key === "timestamp") && (
          <div className="w-32 text-xs text-muted-foreground font-mono shrink-0 pt-1">
            {renderFieldValue(
              "timestamp",
              primaryFields.find((f) => f.key === "timestamp")?.value
            )}
          </div>
        )}

        {primaryFields.find((f) => f.key === "level") && (
          <div className="shrink-0">
            {renderFieldValue(
              "level",
              primaryFields.find((f) => f.key === "level")?.value
            )}
          </div>
        )}

        {/* Show first few secondary fields as badges */}
        {secondaryFields.slice(0, 3).map((field) => (
          <Badge
            key={field.key}
            variant="outline"
            className="h-5 text-xs shrink-0 max-w-40"
          >
            <span className="truncate">
              {field.key}: {renderFieldValue(field.key, field.value)}
            </span>
          </Badge>
        ))}

        <div className="flex-1 space-y-1">
          <div className="text-sm leading-relaxed">
            {renderFieldValue(
              "message",
              primaryFields.find((f) => f.key === "message")?.value
            )}
          </div>

          {!isExpanded && secondaryFields.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{secondaryFields.length - 3} more fields
            </div>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          {hasExpandableFields && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={handleToggleExpanded}
              title={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
            onClick={handleCopyLine}
            title="Copy line"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded field details */}
      {isExpanded && hasExpandableFields && (
        <div className="px-3 pb-3 border-t bg-muted/30">
          <div className="space-y-3 pt-3">
            {/* Secondary fields */}
            {secondaryFields.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Key Fields
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {secondaryFields.map((field) => (
                    <div key={field.key} className="text-xs">
                      <span className="font-medium text-muted-foreground w-20 inline-block">
                        {field.key}:
                      </span>
                      <span className="text-foreground">
                        {renderFieldValue(field.key, field.value, "expanded")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata fields */}
            {metadataFields.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Additional Data
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {metadataFields.map((field) => (
                    <div key={field.key} className="text-xs">
                      <span className="font-medium text-muted-foreground w-24 inline-block">
                        {field.key}:
                      </span>
                      <span className="text-foreground break-all">
                        {renderFieldValue(field.key, field.value, "expanded")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SimpleLogViewer({
  entries,
  filename,
  detectedFormat,
}: LogViewerProps) {
  const [filters, setFilters] = useState<LogFilters>({
    search: "",
    level: "all",
    dateFrom: "",
    dateTo: "",
    module: "all",
    feature: "all",
    user: "all",
  });

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (
        filters.search &&
        !entry.message.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Level filter
      if (filters.level !== "all" && entry.level !== filters.level) {
        return false;
      }

      // Module filter
      if (
        filters.module !== "all" &&
        entry.metadata?.module !== filters.module
      ) {
        return false;
      }

      // Feature filter
      if (
        filters.feature !== "all" &&
        entry.metadata?.feature !== filters.feature
      ) {
        return false;
      }

      // User filter
      if (
        filters.user !== "all" &&
        entry.metadata?.["user.login"] !== filters.user
      ) {
        return false;
      }

      // Date filters
      if (filters.dateFrom && entry.timestamp) {
        const fromDate = new Date(filters.dateFrom);
        if (entry.timestamp < fromDate) return false;
      }

      if (filters.dateTo && entry.timestamp) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entry.timestamp > toDate) return false;
      }

      return true;
    });
  }, [entries, filters]);

  const levelCounts = useMemo(() => {
    const counts = {
      total: entries.length,
      ERROR: 0,
      WARN: 0,
      INFO: 0,
      DEBUG: 0,
      TRACE: 0,
      FATAL: 0,
    };
    entries.forEach((entry) => {
      if (
        entry.level &&
        Object.prototype.hasOwnProperty.call(counts, entry.level)
      ) {
        counts[entry.level as keyof typeof counts]++;
      }
    });
    return counts;
  }, [entries]);

  // Get unique values for filter dropdowns
  const uniqueModules = useMemo(() => {
    const modules = new Set<string>();
    entries.forEach((entry) => {
      if (entry.metadata?.module) {
        modules.add(entry.metadata.module);
      }
    });
    return Array.from(modules).sort();
  }, [entries]);

  const uniqueFeatures = useMemo(() => {
    const features = new Set<string>();
    entries.forEach((entry) => {
      if (entry.metadata?.feature) {
        features.add(entry.metadata.feature);
      }
    });
    return Array.from(features).sort();
  }, [entries]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    entries.forEach((entry) => {
      if (entry.metadata?.["user.login"]) {
        users.add(entry.metadata["user.login"]);
      }
    });
    return Array.from(users).sort();
  }, [entries]);

  const handleFilterChange = useCallback(
    (key: keyof LogFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      level: "all",
      dateFrom: "",
      dateTo: "",
      module: "all",
      feature: "all",
      user: "all",
    });
  }, []);

  const exportLogs = useCallback(() => {
    const content = filteredEntries.map((entry) => entry.rawLine).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filtered-${filename}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries, filename]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{filename}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {detectedFormat} • {entries.length.toLocaleString()} lines •{" "}
                {filteredEntries.length.toLocaleString()} filtered
                {entries.length > 10000 && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Large File
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          Total: {levelCounts.total.toLocaleString()}
        </Badge>
        {levelCounts.ERROR > 0 && (
          <Badge variant="destructive" className="text-xs">
            <span className="flex items-center gap-1">
              {getLevelIcon("ERROR")}
              <span>ERROR: {levelCounts.ERROR}</span>
            </span>
          </Badge>
        )}
        {levelCounts.WARN > 0 && (
          <Badge variant="secondary" className="text-xs">
            <span className="flex items-center gap-1">
              {getLevelIcon("WARN")}
              <span>WARN: {levelCounts.WARN}</span>
            </span>
          </Badge>
        )}
        {levelCounts.INFO > 0 && (
          <Badge variant="default" className="text-xs">
            <span className="flex items-center gap-1">
              {getLevelIcon("INFO")}
              <span>INFO: {levelCounts.INFO}</span>
            </span>
          </Badge>
        )}
        {(levelCounts.DEBUG > 0 || levelCounts.TRACE > 0) && (
          <Badge variant="outline" className="text-xs">
            <span className="flex items-center gap-1">
              {getLevelIcon("DEBUG")}
              <span>DEBUG/TRACE: {levelCounts.DEBUG + levelCounts.TRACE}</span>
            </span>
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in messages..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-32">
              <label className="text-sm font-medium mb-1 block">Level</label>
              <Select
                value={filters.level}
                onValueChange={(value) => handleFilterChange("level", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="TRACE">TRACE</SelectItem>
                  <SelectItem value="FATAL">FATAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uniqueModules.length > 0 && (
              <div className="w-40">
                <label className="text-sm font-medium mb-1 block">Module</label>
                <Select
                  value={filters.module}
                  onValueChange={(value) => handleFilterChange("module", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {uniqueModules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {uniqueFeatures.length > 0 && (
              <div className="w-40">
                <label className="text-sm font-medium mb-1 block">
                  Feature
                </label>
                <Select
                  value={filters.feature}
                  onValueChange={(value) =>
                    handleFilterChange("feature", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Features</SelectItem>
                    {uniqueFeatures.map((feature) => (
                      <SelectItem key={feature} value={feature}>
                        {feature}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {uniqueUsers.length > 0 && (
              <div className="w-32">
                <label className="text-sm font-medium mb-1 block">User</label>
                <Select
                  value={filters.user}
                  onValueChange={(value) => handleFilterChange("user", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-40">
              <label className="text-sm font-medium mb-1 block">
                From Date
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className="w-40">
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card>
        <CardContent className="p-0">
          {filteredEntries.length > 0 ? (
            <VirtualizedLogList entries={filteredEntries} />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No log entries match your filters</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface VirtualizedLogListProps {
  entries: LogEntry[];
}

function VirtualizedLogList({ entries }: VirtualizedLogListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 20,
    getItemKey: (index) => entries[index]?.id ?? index,
  });

  return (
    <div ref={parentRef} className="border rounded-md h-[70vh] overflow-y-auto">
      {entries.length > 10000 ? (
        <div className="p-4 bg-yellow-50 border-b text-sm text-yellow-800">
          ⚡ Large file detected ({entries.length.toLocaleString()} entries).
          Rendering is virtualized.
        </div>
      ) : null}
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          return (
            <div
              key={entry?.id ?? virtualRow.index}
              data-index={virtualRow.index}
              ref={(el) => {
                if (el) rowVirtualizer.measureElement(el);
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {entry ? <LogRow entry={entry} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
