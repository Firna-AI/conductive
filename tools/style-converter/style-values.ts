export type Token = { kind: 'token'; name: string }
export type StyleValue =
  | number
  | string
  | string[]
  | Token
  | { kind: 'template'; parts: (string | Token)[] }
  | { kind: 'offset'; width: number; height: number }
export type StyleEntry = [string, StyleValue]
export type ClassStyles = Map<string, StyleValue>
export type Styles = Map<string, ClassStyles>

export type TokenType = 'string' | 'number'

export function isColorKey(key: string): boolean {
  return key === 'color' || key.endsWith('Color')
}

const stringTokenKeys = new Set([
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'textAlign',
  'textTransform',
])

export function scalarTokenType(key: string): TokenType {
  return isColorKey(key) || stringTokenKeys.has(key) ? 'string' : 'number'
}

export function tokenTypes(
  key: string,
  value: StyleValue,
): [string, TokenType][] {
  if (typeof value !== 'object' || Array.isArray(value)) return []
  if (value.kind === 'token') {
    return [[value.name, scalarTokenType(key)]]
  }
  if (value.kind === 'template') {
    return value.parts.flatMap((part) =>
      typeof part === 'string' ? [] : [[part.name, 'string']],
    )
  }
  return []
}
