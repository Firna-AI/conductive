import type { FileResponse } from '../../shared/files'

/** The text of a file, or a mark that the file is not text. */
export type FileText = { kind: 'text'; text: string } | { kind: 'binary' }

function decodeBase64(content: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(content), (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * The original text of a file. A file is binary when its bytes are not
 * UTF-8, or when it holds a NUL character, as git decides.
 */
export function fileText(file: FileResponse): FileText {
  let text = file.content
  if (file.encoding === 'base64') {
    const bytes = decodeBase64(file.content)
    if (!bytes) return { kind: 'binary' }
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      return { kind: 'binary' }
    }
  }
  return text.includes('\u0000') ? { kind: 'binary' } : { kind: 'text', text }
}

/** The lines of a text. A final line break does not start another line. */
export function splitLines(text: string): string[] {
  if (text === '') return []
  return text.replace(/(\r\n|\n|\r)$/, '').split(/\r\n|\n|\r/)
}

/** A size for people, such as "512 bytes", "64 KB", or "1.5 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}
