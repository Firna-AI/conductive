import { languageOf, languageOfExtension, type Language } from './languages'

const aliases = new Map([
  ['rust', 'rs'],
  ['typescript', 'ts'],
  ['javascript', 'js'],
  ['jsonc', 'json'],
  ['python', 'py'],
  ['shell', 'sh'],
  ['kotlin', 'kt'],
  ['c++', 'cpp'],
  ['csharp', 'cs'],
  ['c#', 'cs'],
  ['ruby', 'rb'],
  ['make', 'makefile'],
])

const plainLabels = new Set([
  'text',
  'txt',
  'plain',
  'plaintext',
  'console',
  'output',
  'log',
  'none',
  'diff',
  'patch',
])

/** The file tab family for a lower-case fence label, or null for plain text. */
export function languageOfLabel(label: string | null): Language | null {
  if (label === null || plainLabels.has(label)) return null
  const name = aliases.get(label) ?? label
  if (name === 'dockerfile' || name === 'makefile') return languageOf(name)
  return languageOfExtension(name)
}
