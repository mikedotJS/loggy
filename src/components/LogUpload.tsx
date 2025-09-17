import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileText, X } from 'lucide-react'

interface LogUploadProps {
  onFileLoaded: (content: string, filename: string) => void
}

export function LogUpload({ onFileLoaded }: LogUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes('text') && !file.name.endsWith('.log')) {
      alert('Please select a text or log file')
      return
    }

    setIsLoading(true)
    setSelectedFile(file)

    try {
      const content = await file.text()
      onFileLoaded(content, file.name)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading file')
    } finally {
      setIsLoading(false)
    }
  }, [onFileLoaded])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const clearFile = () => {
    setSelectedFile(null)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Log File
        </CardTitle>
        <CardDescription>
          Drag and drop a log file or click to browse. Supports .log, .txt, and other text files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="mb-4">
              <p className="text-lg font-medium">Drop your log file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <Input
              type="file"
              accept=".log,.txt,text/*"
              onChange={handleFileSelect}
              className="max-w-xs mx-auto"
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFile}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Loading file...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}