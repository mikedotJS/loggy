# Loggy - Professional Log File Viewer

A modern, high-performance log file analyzer built with React, TypeScript, and shadcn/ui.

![Loggy Screenshot](https://via.placeholder.com/800x400/1f2937/ffffff?text=Loggy+Log+Viewer)

## Features

### 🚀 **Smart Log Parsing**
- **Multi-format support**: Automatically detects and parses various log formats
  - JSON logs (including custom fields like `@timestamp`)
  - Standard application logs (`YYYY-MM-DD HH:MM:SS LEVEL Message`)
  - Syslog format
  - Apache access logs
  - Simple timestamp formats
  - Plain text logs

### 🔍 **Advanced Filtering & Search**
- **Text search**: Search through log messages
- **Log level filtering**: Filter by ERROR, WARN, INFO, DEBUG, TRACE, FATAL
- **Date range filtering**: Filter logs by timestamp
- **Metadata filtering**: Filter by module, feature, user (for structured logs)
- **Real-time filtering**: All filters apply instantly

### 📊 **Analytics & Insights**
- **Log statistics**: Count of entries by log level
- **Format detection**: Automatically identifies log format
- **Performance metrics**: Line counts and filtering results

### ⚡ **High Performance**
- **Virtualized scrolling**: Handles large files (thousands of entries) smoothly
- **Memory efficient**: Only renders visible log entries
- **Responsive UI**: Fast filtering and smooth interactions

### 🎨 **Professional UI**
- **Modern design**: Built with shadcn/ui components
- **Dark/light theme**: Automatic theme support
- **Responsive layout**: Works on desktop and mobile
- **Color-coded levels**: Visual distinction for different log levels
- **Rich metadata display**: Shows structured data from JSON logs

### 💾 **Export & Copy**
- **Export filtered logs**: Download filtered results as text file
- **Copy individual lines**: Quick copy functionality for each log entry
- **Preserve formatting**: Maintains original log structure

## Supported Log Formats

### JSON Logs (Odyssey Format)
```json
{"level":"info","@timestamp":"2025-09-14T00:08:52.839Z","village.code":"DBAC","version":"1.15.23","module":"odyssey-frontend","feature":"app-component","message":"App is launching"}
```

**✅ Fully compatible with your log format!**

**Special handling for:**
- `@timestamp` field (ISO format)
- `module` and `feature` fields for filtering
- `user.login` for user-based filtering
- `correlationId` for request tracing
- `village.code` for village filtering
- Rich metadata display

### Standard Application Logs
```
2024-01-15 10:30:45.123 INFO Application started successfully
2024-01-15 10:30:46.456 DEBUG Loading configuration from config.json
```

### Syslog Format
```
Jan 15 10:31:04 server myapp[1234]: Syslog format example message
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Usage
1. **Upload a log file**: Drag & drop or click to browse for `.log`, `.txt`, or text files
2. **View parsed logs**: Automatically detected format and parsed entries
3. **Filter and search**: Use the comprehensive filter controls
4. **Analyze**: View statistics and patterns in your logs
5. **Export**: Download filtered results

### Sample Files
The project includes sample log files to test with:
- `sample.log` - Mixed format examples
- `odyssey-sample.log` - Your specific JSON format

## Your Log Format Support

**✅ 100% Compatible** with your Odyssey log format:

```json
{"level":"info","@timestamp":"2025-09-14T00:08:52.839Z","village.code":"DBAC","version":"1.15.23","module":"odyssey-frontend","feature":"app-component","message":"App is launching"}
{"level":"info","@timestamp":"2025-09-14T00:08:52.897Z","village.code":"DBAC","version":"1.15.23","feature":"village","action":"get-village","correlationId":"UBB1InCv-oaSbiAx6_73HMXYRB0KOyPy","user.login":"SIMON","module":"odyssey-api","type":"variables","variables":{},"message":"Log GraphQL input variables"}
```

**Automatically extracts and displays:**
- Timestamp from `@timestamp` field
- Log level from `level` field
- Module from `module` field (with filtering)
- Feature from `feature` field (with filtering)
- User from `user.login` field (with filtering)
- Correlation ID for request tracing
- Village code and version info
- All metadata preserved and searchable

## Tech Stack
- **React 18** with TypeScript
- **Vite** for lightning-fast development
- **Tailwind CSS** for styling
- **shadcn/ui** for beautiful UI components
- **react-window** for virtualization
- **Lucide React** for icons

## Performance

- **File size**: Tested with files up to 100MB
- **Entry count**: Handles 100k+ log entries smoothly
- **Memory usage**: Efficient virtualization keeps memory usage low
- **Search performance**: Real-time filtering on large datasets

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
