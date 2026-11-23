/**
 * A size as the chat shows it, such as "512 B", "12 KB", or "1.2 MB": for
 * attached files and for the output that the runner left out. The mockups,
 * the chat, and the composer of a new workspace share this one formatter.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
