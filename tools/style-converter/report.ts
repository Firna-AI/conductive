import type { ClassJoin } from './class-joins.ts'
import { reasons, type Reason } from './reasons.ts'

type Location = { line: number; selector: string }
type ListedDeclaration = { line: number; text: string; reasons: Reason[] }
export type ListedItem =
  | (Location & ListedDeclaration & { kind: 'declaration' })
  | (Location & {
      kind: 'rule'
      reasons: Reason[]
      declarations: ListedDeclaration[]
      detail?: string
    })

export type CheckItem = Location & { text: string }

export type ModuleReport = {
  file: string
  draft: boolean
  converted: number
  rowDefaults: number
  listed: ListedItem[]
  checks: CheckItem[]
}

function inline(text: string) {
  const oneLine = text.replace(/[\r\n]+/g, ' ')
  const length = Math.max(
    0,
    ...[...oneLine.matchAll(/`+/g)].map((match) => match[0].length),
  )
  const fence = '`'.repeat(length + 1)
  const pad = length > 0 || oneLine !== oneLine.trim() ? ' ' : ''
  return fence + pad + oneLine + pad + fence
}

function countReasons(
  counts: Map<Reason, number>,
  keys: Reason[],
  count: number,
) {
  for (const key of new Set(keys))
    counts.set(key, (counts.get(key) ?? 0) + count)
}

function labels(keys: Reason[]) {
  return keys.map((key) => reasons[key][0]).join(', ')
}

function listedLines(item: ListedItem): string[] {
  const where = `Line ${item.line} · ${inline(item.selector)}`
  if (item.kind === 'declaration') {
    return [`- ${where} · ${inline(item.text)} · ${labels(item.reasons)}`]
  }
  return [
    `- ${where} · ${labels(item.reasons)}` +
      (item.detail ? ` · ${inline(item.detail)}` : ''),
    ...item.declarations.map(
      ({ line, text, reasons }) =>
        `  - Line ${line} · ${inline(text)}` +
        (reasons.length ? ` · ${labels(reasons)}` : ''),
    ),
  ]
}

export function renderReport(
  area: string,
  modules: ModuleReport[],
  joins: ClassJoin[],
): { text: string; summary: string[] } {
  let listed = 0
  let converted = 0
  let drafts = 0
  let rows = 0
  let checks = 0
  const counts = new Map<Reason, number>()
  for (const module of modules) {
    if (module.draft) drafts++
    converted += module.converted
    rows += module.rowDefaults
    checks += module.checks.length
    for (const item of module.listed) {
      if (item.kind === 'declaration') {
        listed++
        countReasons(counts, item.reasons, 1)
      } else {
        listed += item.declarations.length
        countReasons(counts, item.reasons, 0)
        for (const declaration of item.declarations) {
          countReasons(counts, [...item.reasons, ...declaration.reasons], 1)
        }
      }
    }
  }
  const files = new Set(joins.map((join) => join.file)).size
  const summary = [
    `CSS Modules ${modules.length}`,
    `Drafts ${drafts}`,
    `Declarations converted ${converted}`,
    `Declarations listed ${listed}`,
    `Classes with the row default ${rows}`,
    `Check by hand ${checks}`,
    `Joins ${joins.length} in ${files} ${files === 1 ? 'file' : 'files'}`,
  ]
  const table = Object.entries(reasons).flatMap(([key, [title, action]]) => {
    const entry = [...counts].find(([reason]) => reason === key)
    return entry ? [`| ${title} | ${entry[1]} | ${action} |`] : []
  })
  const lines = [
    '# Style conversion report',
    '',
    `- Area ${inline(area)}`,
    ...summary.map((line) => `- ${line}`),
    '',
    '## Listed declarations by reason',
    '',
    'One declaration can count under more than one reason.',
    '',
    '| Reason | Declarations | What to do |',
    '| --- | ---: | --- |',
    ...table,
  ]
  if (table.length === 0) lines.push('| None | 0 | |')
  for (const module of modules) {
    lines.push('', `## ${inline(module.file)}`, '', '### Not in the draft', '')
    lines.push(
      ...(module.listed.length
        ? module.listed.flatMap(listedLines)
        : ['None.']),
    )
    lines.push('', '### Check by hand', '')
    lines.push(
      ...(module.checks.length
        ? module.checks.map(
            ({ line, selector, text }) =>
              `- Line ${line} · ${inline(selector)} · ${text}`,
          )
        : ['None.']),
    )
  }
  lines.push('', '## Views that join classes', '')
  for (const { file, line, values } of joins) {
    lines.push(
      `- ${inline(file)} · Line ${line} · ${values.map(inline).join(', ')}`,
    )
  }
  if (joins.length === 0) lines.push('None.')
  return { text: lines.join('\n') + '\n', summary }
}
