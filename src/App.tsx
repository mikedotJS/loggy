import { useState } from 'react'
import { LogUpload } from './components/LogUpload'
import { SimpleLogViewer } from './components/SimpleLogViewer'
import { parseLogFile } from './utils/logParser'
import type { ParsedLog } from './types/log'
import { FileText, Github } from 'lucide-react'
import { Button } from './components/ui/button'

function App() {
  const [parsedLog, setParsedLog] = useState<ParsedLog | null>(null)

  const handleFileLoaded = (content: string, filename: string) => {
    const parsed = parseLogFile(content, filename)
    setParsedLog(parsed)
  }

  const handleReset = () => {
    setParsedLog(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Loggy</h1>
                <p className="text-sm text-muted-foreground">
                  Professional log file viewer and analyzer
                </p>
              </div>
            </div>

            {parsedLog && (
              <Button variant="outline" onClick={handleReset}>
                Upload New File
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!parsedLog ? (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Upload and Analyze Your Log Files</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Loggy supports multiple log formats including JSON, syslog, Apache access logs,
                and custom application logs. Upload a file to get started.
              </p>
            </div>

            <LogUpload onFileLoaded={handleFileLoaded} />

            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium">Smart Parsing</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically detects and parses various log formats
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium">Advanced Filtering</h4>
                  <p className="text-sm text-muted-foreground">
                    Filter by log level, timestamp, and custom search terms
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium">High Performance</h4>
                  <p className="text-sm text-muted-foreground">
                    Handles large files with virtualized scrolling
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SimpleLogViewer
            entries={parsedLog.entries}
            filename={parsedLog.filename}
            detectedFormat={parsedLog.detectedFormat}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Built with React, TypeScript, and shadcn/ui
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
