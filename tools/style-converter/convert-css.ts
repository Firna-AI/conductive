import { readCss } from './css-rules.ts'
import { convertDeclaration } from './declaration.ts'
import {
  finishStyle,
  merge,
  sideBorderConflict,
  type MergedStyle,
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

export function convertCss(
  file: string,
  css: string,
  tokenValues: ReadonlyMap<string, string> = new Map(),
): Conversion {
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
          reasons: descriptors
            ? []
            : convertDeclaration(declaration, tokenValues).reasons,
        })),
      })
      continue
    }

    const target = merged.get(className) ?? { line, selector, style: new Map() }
    merged.set(className, target)
    for (const declaration of rule.declarations) {
      const { entries, reasons } = convertDeclaration(declaration, tokenValues)
      const location = { line: declaration.line, selector }
      let blockers = reasons
      if (entries) {
        if (sideBorderConflict(target.style, declaration.name, entries))
          blockers = ['sideBorderStyle']
        else if (!addTokenTypes(types, entries)) blockers = ['tokenType']
      }
      const accepted = blockers.length === 0 ? entries : undefined
      for (const { previous, keys, keepsOtherValues } of merge(
        target.style,
        declaration,
        accepted,
      )) {
        const text = declaration.text.replace(/\s*\n\s*/g, ' ')
        let note = `${text} overrides ${keys.join(', ')} from ${previous.name} at line ${previous.line}.`
        if (accepted)
          note += keepsOtherValues
            ? ' The listed declaration still applies to its other values.'
            : ' The listed declaration no longer applies.'
        else if (keepsOtherValues)
          note += ' The draft keeps the other values from that declaration.'
        checks.push({ ...location, text: note })
      }
      if (!accepted) {
        listed.push({
          kind: 'declaration',
          ...location,
          text: declaration.text,
          reasons: blockers,
        })
        continue
      }
      converted++
      if (
        accepted.some(
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
