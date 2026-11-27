/** The first word of the fence info in lower case, up to whitespace or a comma. */
export function fenceLabel(info: string): string | null {
  const label = /^[^\s,]+/u.exec(info.trimStart())?.[0]
  return label?.toLowerCase() ?? null
}
