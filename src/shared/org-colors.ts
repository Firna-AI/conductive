/**
 * The preset colours of an org, in hue order. The tile of the open org
 * shows its colour. An org without a colour shows `blue`, the default.
 */
export const ORG_COLORS = [
  'blue',
  'teal',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'purple',
] as const

export type OrgColor = (typeof ORG_COLORS)[number]

/** The colour of an org that has none, and of a key that a client does not know. */
const DEFAULT_ORG_COLOR: OrgColor = 'blue'

export function isOrgColor(value: unknown): value is OrgColor {
  return (
    typeof value === 'string' &&
    (ORG_COLORS as readonly string[]).includes(value)
  )
}

/**
 * The colour to draw: the saved one, or the default when the org has none
 * or a newer server sent a key that this client does not know.
 */
export function orgColorOf(org: { color?: string }): OrgColor {
  return isOrgColor(org.color) ? org.color : DEFAULT_ORG_COLOR
}
