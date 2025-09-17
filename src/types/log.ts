export interface LogEntry {
  id: string
  timestamp?: Date
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'TRACE'
  message: string
  rawLine: string
  lineNumber: number
  source?: string
  thread?: string
  metadata?: Record<string, any>
}

export interface ParsedLog {
  entries: LogEntry[]
  totalLines: number
  filename: string
  detectedFormat: string
}