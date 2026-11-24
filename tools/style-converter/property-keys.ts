import { getPropertyName } from 'css-to-react-native'

const sides = ['Top', 'Right', 'Bottom', 'Left']

export const groups: Readonly<Record<string, readonly string[]>> = {
  padding: sides.map((side) => `padding${side}`),
  margin: sides.map((side) => `margin${side}`),
  borderWidth: sides.map((side) => `border${side}Width`),
  borderColor: sides.map((side) => `border${side}Color`),
  borderRadius: [
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomRightRadius',
    'borderBottomLeftRadius',
  ],
  inset: ['top', 'right', 'bottom', 'left'],
  gap: ['rowGap', 'columnGap'],
}

const sideGroups: Readonly<Record<string, readonly string[]>> = {
  ...groups,
  borderStyle: sides.map((side) => `border${side}Style`),
  marginBlock: ['marginTop', 'marginBottom'],
  marginInline: ['marginLeft', 'marginRight'],
  paddingBlock: ['paddingTop', 'paddingBottom'],
  paddingInline: ['paddingLeft', 'paddingRight'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
}

export const foldedKeys = {
  borderStyle: [
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
  ],
  overflow: ['overflow-x', 'overflow-y'],
} as const

const foldedLonghands = new Map(
  Object.entries(foldedKeys).flatMap(([key, names]) =>
    names.map((name): [string, string] => [name, key]),
  ),
)

export function sideKeys(key: string): readonly string[] | undefined {
  return Object.hasOwn(sideGroups, key) ? sideGroups[key] : undefined
}

export function cssPropertyName(key: string): string {
  return key.replace(/[A-Z]/g, (part) => '-' + part.toLowerCase())
}

export function foldedKey(longhand: string): string | undefined {
  return foldedLonghands.get(longhand)
}

export function nativeKey(longhand: string): string {
  return foldedKey(longhand) ?? getPropertyName(longhand)
}
