export function fileResponseBudget(path: string, maxBytes: number): number {
  // Base64 uses four ASCII bytes for each three file bytes. The envelope allows
  // the requested JSON-escaped path, the largest safe size, and two-space formatting.
  const envelope = JSON.stringify(
    {
      ok: true,
      type: 'file.read',
      success: false,
      path,
      encoding: 'base64',
      size: Number.MAX_SAFE_INTEGER,
      content: '',
    },
    null,
    2,
  )
  return (
    4 * Math.ceil(maxBytes / 3) + new TextEncoder().encode(envelope).byteLength
  )
}
