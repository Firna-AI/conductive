export const ATTACHMENTS_DIRECTORY = '.context/attachments'

export async function attachmentPath(file: {
  id: string
  name: string
}): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(file.id)),
  )
  const directory = Array.from(digest.slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `${ATTACHMENTS_DIRECTORY}/${directory}/${safeName(file.name)}`
}

function safeName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]+/gu, '-')
  if (!safe || /^\.+$/u.test(safe)) return 'file'
  const dot = safe.lastIndexOf('.')
  const extension = dot < 0 ? '' : safe.slice(dot).toLowerCase().slice(0, 96)
  const stem = (dot < 0 ? safe : safe.slice(0, dot)) || 'file'
  return `${stem.slice(0, 100 - extension.length)}${extension}`
}
