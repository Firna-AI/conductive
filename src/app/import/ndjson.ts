/**
 * The complete lines of a body of newline-delimited JSON, one at a time,
 * as they arrive. A last line without its newline still counts. Empty
 * lines are skipped. The bytes decode as UTF-8 across chunk boundaries.
 */
export async function* readLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let rest = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      rest += decoder.decode(value, { stream: true })
      let end = rest.indexOf('\n')
      while (end >= 0) {
        const line = rest.slice(0, end).trim()
        rest = rest.slice(end + 1)
        if (line !== '') yield line
        end = rest.indexOf('\n')
      }
    }
    const last = (rest + decoder.decode()).trim()
    if (last !== '') yield last
  } finally {
    reader.releaseLock()
  }
}
