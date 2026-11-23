import { keywordProperty } from './keyword-values.ts'

export type Token = { kind: 'token'; name: string }
export type StyleValue =
  | number
  | string
  | Token
  | { kind: 'template'; parts: (string | Token)[] }
  | { kind: 'offset'; width: number; height: number }
export type StyleEntry = [string, StyleValue]
export type ClassStyles = Map<string, StyleValue>
export type Styles = Map<string, ClassStyles>

export type TokenType = 'string' | 'number' | readonly string[]

export function isColorKey(key: string): boolean {
  return key === 'color' || key.endsWith('Color')
}

export function scalarTokenType(key: string): TokenType {
  const property = keywordProperty(key)
  if (property?.token) return property.values
  return isColorKey(key) || key === 'fontFamily' ? 'string' : 'number'
}

export function intersectTokenTypes(
  left: TokenType | undefined,
  right: TokenType,
): TokenType | undefined {
  if (left === undefined || left === right) return right
  if (left === 'number' || right === 'number') return undefined
  if (left === 'string') return right
  if (right === 'string') return left
  const shared = left.filter((word) => right.includes(word))
  return shared.length > 0 ? shared : undefined
}

export function tokenTypes(
  key: string,
  value: StyleValue,
): [string, TokenType][] {
  if (typeof value !== 'object') return []
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
