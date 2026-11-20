const REDACTION_MARKER = '[redacted]'

/** Stream exact-copy masking without retaining the filtered source. */
function scanSecretText(
  text: string,
  final: boolean,
  values: readonly string[],
  emit: (text: string) => void,
  continuations: readonly string[] = [],
  holdMarker = true,
): string {
  const secrets = [...values]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  const initial = [...secrets, ...continuations].sort(
    (a, b) => b.length - a.length,
  )
  let index = 0
  while (index < text.length) {
    const candidates = index === 0 ? initial : secrets
    const rest = text.slice(index)
    if (
      !final &&
      ((holdMarker && REDACTION_MARKER.startsWith(rest)) ||
        candidates.some(
          (secret) => secret.length > rest.length && secret.startsWith(rest),
        ))
    )
      return rest
    const secret = candidates.find((secret) => text.startsWith(secret, index))
    if (
      text.startsWith(REDACTION_MARKER, index) &&
      (!secret || secret.length <= REDACTION_MARKER.length)
    ) {
      emit(REDACTION_MARKER)
      index += REDACTION_MARKER.length
    } else if (secret) {
      emit(REDACTION_MARKER)
      index += secret.length
    } else {
      const point = String.fromCodePoint(text.codePointAt(index) ?? 0xfffd)
      emit(point)
      index += point.length
    }
  }
  return ''
}

/** Keep the assistant scanner's existing partial-marker release behaviour. */
export function filterSecretText(
  text: string,
  final: boolean,
  values: readonly string[],
  continuations: readonly string[] = [],
): { text: string; held: string } {
  let output = ''
  const held = scanSecretText(
    text,
    final,
    values,
    (text) => {
      output += text
    },
    continuations,
    false,
  )
  return { text: output, held }
}
