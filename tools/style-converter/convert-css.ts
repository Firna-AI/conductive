import { readCss } from './css-rules.ts'
import { convertDeclaration } from './declaration.ts'
import { finishStyle } from './finish-style.ts'
import { checkFoldedStyles } from './folded-styles.ts'
import {
  cascade,
  classDeclaration,
  listed,
  overrideNotes,
  projectStyle,
  type Cascade,
  type ClassDeclaration,
} from './merge.ts'
import { textKeys } from './native-properties.ts'
import type { CheckItem, ListedItem, ModuleReport } from './report.ts'
import {
  intersectTokenTypes,
  tokenTypes,
  type StyleEntry,
  type Styles,
  type TokenType,
} from './style-values.ts'

type Conversion = ModuleReport & { classes?: Styles }
type ClassRules = {
  line: number
  selector: string
  declarations: ClassDeclaration[]
}

function addTokenTypes(types: Map<string, TokenType>, entries: StyleEntry[]) {
  const fresh = new Map<string, TokenType>()
  for (const [key, value] of entries) {
    for (const [name, type] of tokenTypes(key, value)) {
      const shared = intersectTokenTypes(
        fresh.get(name) ?? types.get(name),
        type,
      )
      if (shared === undefined) return false
      fresh.set(name, shared)
    }
  }
  for (const [name, type] of fresh) types.set(name, type)
  return true
}

function checkTokenTypes(cascades: Cascade[]) {
  const uses = new Map<ClassDeclaration, StyleEntry[]>()
  for (const winners of cascades) {
    for (const [name, declaration] of winners) {
      if (listed(declaration)) continue
      const entries = declaration.values.get(name) ?? []
      if (!entries.length) continue
      const found = uses.get(declaration) ?? []
      found.push(...entries)
      uses.set(declaration, found)
    }
  }
  const ordered = [...uses].sort(
    ([a], [b]) => a.source.offset - b.source.offset,
  )
  const types = new Map<string, TokenType>()
  for (const [declaration, entries] of ordered) {
    if (!addTokenTypes(types, entries)) declaration.reasons.push('tokenType')
  }
}

export function convertCss(
  file: string,
  css: string,
  tokenValues: ReadonlyMap<string, string> = new Map(),
): Conversion {
  const { readable, rules } = readCss(file, css)
  const items: (ListedItem | ClassDeclaration)[] = []
  const byClass = new Map<string, ClassRules>()

  for (const rule of rules) {
    const { className, line, selector } = rule
    if (className === undefined) {
      const descriptors =
        rule.reasons.includes('atRule') || rule.reasons.includes('parseFile')
      items.push({
        kind: 'rule',
        line,
        selector,
        reasons: rule.reasons,
        ...(rule.detail ? { detail: rule.detail } : {}),
        declarations: rule.declarations.map((declaration) => ({
          line: declaration.line,
          text: declaration.text,
          reasons: descriptors
            ? []
            : convertDeclaration(declaration, tokenValues).reasons,
        })),
      })
      continue
    }

    const target = byClass.get(className) ?? {
      line,
      selector,
      declarations: [],
    }
    byClass.set(className, target)
    for (const declaration of rule.declarations) {
      const { entries, reasons } = convertDeclaration(
        declaration,
        tokenValues,
        true,
      )
      const item = classDeclaration(declaration, selector, entries, reasons)
      target.declarations.push(item)
      items.push(item)
    }
  }

  const resolved = [...byClass].map(([name, rules]) => {
    const winners = cascade(rules.declarations)
    return { name, ...rules, winners, shared: checkFoldedStyles(winners) }
  })
  checkTokenTypes(resolved.map(({ winners }) => winners))

  const notes = new Map<ClassDeclaration, string[]>()
  const classes: Styles = new Map()
  const textChecks: CheckItem[] = []
  let rowDefaults = 0
  for (const {
    name,
    line,
    selector,
    declarations,
    winners,
    shared,
  } of resolved) {
    const draft = projectStyle(winners, shared)
    for (const [item, text] of overrideNotes(declarations, winners, draft))
      notes.set(item, text)
    const direction = winners.get('flex-direction')
    const { style, row } = finishStyle(
      new Map([...draft].map(([key, { value }]) => [key, value])),
      direction !== undefined && listed(direction),
    )
    classes.set(name, style)
    if (row) rowDefaults++
    const text = [...style.keys()].filter((key) => textKeys.has(key))
    if (text.length) {
      textChecks.push({
        line,
        selector,
        text: `React Native applies ${text.join(', ')} only to the Text that gets the style.`,
      })
    }
  }

  const omitted: ListedItem[] = []
  const checks: CheckItem[] = []
  let converted = 0
  for (const item of items) {
    if (!('source' in item)) {
      omitted.push(item)
      continue
    }
    const { source, selector, reasons } = item
    const where = { line: source.line, selector }
    for (const text of notes.get(item) ?? []) checks.push({ ...where, text })
    if (listed(item)) {
      omitted.push({
        kind: 'declaration',
        ...where,
        text: source.text,
        reasons,
      })
      continue
    }
    converted++
    if (
      source.name === 'display' &&
      source.value.toLowerCase() === 'inline-flex'
    )
      checks.push({
        ...where,
        text: 'inline-flex became flex. Check the surrounding layout.',
      })
    if (source.important) {
      checks.push({
        ...where,
        text: `Dropped !important from ${source.name}: ${source.value}. Check the order of styles.`,
      })
    }
  }
  return {
    file,
    draft: readable,
    converted,
    rowDefaults,
    listed: omitted,
    checks: [...checks, ...textChecks],
    classes: readable ? classes : undefined,
  }
}
