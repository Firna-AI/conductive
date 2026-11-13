import type { TextPart } from './workspaceLinks'

/** A run of the parts of a text: all bold, or all without bold. */
export type StrongRun = { strong: boolean; parts: TextPart[] }

/**
 * The parts of the text of an answer in runs of bold and of plain text, as
 * the app reads them. Each `**` outside code turns bold on or off, and code
 * ends bold, also code that shows as a file chip. A chip in bold text joins the bold run around it, so one
 * `<strong>` holds each run.
 */
export function strongRuns(parts: readonly TextPart[]): StrongRun[] {
  const runs: StrongRun[] = []
  let strong = false
  const add = (part: TextPart) => {
    const last = runs.at(-1)
    if (last?.strong === strong) last.parts.push(part)
    else runs.push({ strong, parts: [part] })
  }
  for (const part of parts) {
    if (part.kind === 'code' || (part.kind === 'mention' && part.code)) {
      strong = false
    }
    if (part.kind !== 'text') {
      add(part)
      continue
    }
    part.text.split('**').forEach((text, index) => {
      if (index > 0) strong = !strong
      if (text !== '') add({ kind: 'text', text })
    })
  }
  return runs
}
