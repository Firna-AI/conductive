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
  marginBlock: ['marginTop', 'marginBottom'],
  marginInline: ['marginLeft', 'marginRight'],
  paddingBlock: ['paddingTop', 'paddingBottom'],
  paddingInline: ['paddingLeft', 'paddingRight'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
}

const shorthandKeys: Readonly<Record<string, readonly string[]>> = {
  ...sideGroups,
  ...Object.fromEntries(
    sides.map((side) => {
      const key = `border${side}`
      return [key, [`${key}Width`, `${key}Color`]]
    }),
  ),
  background: ['backgroundColor'],
  border: [...groups.borderWidth, ...groups.borderColor, 'borderStyle'],
  outline: ['outlineWidth', 'outlineColor', 'outlineStyle'],
  flex: ['flexGrow', 'flexShrink', 'flexBasis'],
  flexFlow: ['flexDirection', 'flexWrap'],
  textDecoration: [
    'textDecorationLine',
    'textDecorationStyle',
    'textDecorationColor',
  ],
  textShadow: ['textShadowOffset', 'textShadowRadius', 'textShadowColor'],
}

export function sideKeys(key: string): readonly string[] | undefined {
  return Object.hasOwn(sideGroups, key) ? sideGroups[key] : undefined
}

export function longhandKeys(key: string): readonly string[] {
  return Object.hasOwn(shorthandKeys, key) ? shorthandKeys[key] : [key]
}
