import { readCss } from './css-rules.ts'
import { convertDeclaration } from './declaration.ts'
import {
  finishStyle,
  merge,
  removeOverridden,
  sideBorderConflict,
  type MergedStyle,
} from './merge.ts'
import { textKeys } from './native-properties.ts'
import type { CheckItem, ListedItem, ModuleReport } from './report.ts'
import {
  tokenTypes,
  type StyleEntry,
  type Styles,
  type TokenType,
} from './style-values.ts'

type Conversion = ModuleReport & { classes?: Styles }

function addTokenTypes(types: Map<string, TokenType>, entries: StyleEntry[]) {
  const fresh = new Map<string, TokenType>()
  for (const [key, value] of entries) {
    for (const [name, type] of tokenTypes(key, value)) {
      const known = types.get(name) ?? fresh.get(name)
      if (known && known !== type) return false
      fresh.set(name, type)
    }
  }
  for (const [name, type] of fresh) types.set(name, type)
  return true
}

export function convertCss(file: string, css: string): Conversion {
  const { readable, rules } = readCss(file, css)
  const listed: ListedItem[] = []
  const checks: CheckItem[] = []
  const types = new Map<string, TokenType>()
  const merged = new Map<
    string,
    { line: number; selector: string; style: MergedStyle }
  >()
  let converted = 0

  for (const rule of rules) {
    const { className, line, selector } = rule
    if (className === undefined) {
      const descriptors =
        rule.reasons.includes('atRule') || rule.reasons.includes('parseFile')
      listed.push({
        kind: 'rule',
        line,
        selector,
        reasons: rule.reasons,
        ...(rule.detail ? { detail: rule.detail } : {}),
        declarations: rule.declarations.map((declaration) => ({
          line: declaration.line,
          text: declaration.text,
          reasons: descriptors ? [] : convertDeclaration(declaration).reasons,
        })),
      })
      continue
    }

    const target = merged.get(className) ?? { line, selector, style: new Map() }
    merged.set(className, target)
    for (const declaration of rule.declarations) {
      const { entries, reasons } = convertDeclaration(declaration)
      const location = { line: declaration.line, selector }
      let blockers = reasons
      if (entries) {
        if (sideBorderConflict(target.style, declaration.name, entries))
          blockers = ['sideBorderStyle']
        else if (!addTokenTypes(types, entries)) blockers = ['tokenType']
      }
      if (!entries || blockers.length > 0) {
        listed.push({
          kind: 'declaration',
          ...location,
          text: declaration.text,
          reasons: blockers,
        })
        const overridden = removeOverridden(target.style, declaration.name)
        if (overridden !== undefined) {
          const text = declaration.text.replace(/\s*\n\s*/g, ' ')
          checks.push({
            ...location,
            text: `${text} overrides ${declaration.name} from line ${overridden}. The draft leaves both out.`,
          })
        }
        continue
      }
      merge(target.style, declaration, entries)
      converted++
      if (
        entries.some(
          ([key, value]) => key === 'display' && value === 'inline-flex',
        )
      ) {
        checks.push({
          ...location,
          text: 'inline-flex became flex. Check the surrounding layout.',
        })
      }
      if (declaration.important) {
        checks.push({
          ...location,
          text: `Dropped !important from ${declaration.name}: ${declaration.value}. Check the order of styles.`,
        })
      }
    }
  }

  const classes: Styles = new Map()
  let rowDefaults = 0
  for (const [name, { line, selector, style: mergedStyle }] of merged) {
    const { style, row } = finishStyle(mergedStyle)
    classes.set(name, style)
    if (row) rowDefaults++
    const text = [...style.keys()].filter((key) => textKeys.has(key))
    if (text.length) {
      checks.push({
        line,
        selector,
        text: `React Native applies ${text.join(', ')} only to the Text that gets the style.`,
      })
    }
  }
  return {
    file,
    draft: readable,
    converted,
    rowDefaults,
    listed,
    checks,
    classes: readable ? classes : undefined,
  }
}
