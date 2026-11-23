import { getStylesForProperty } from 'css-to-react-native'

import { isColorKey, scalarTokenType, type StyleValue } from './style-values.ts'
import { cssNumber, readDimension } from './value-source.ts'

export const textKeys = new Set(
  `
  color fontFamily fontSize fontStyle fontVariant fontWeight letterSpacing lineHeight textAlign
  textDecorationColor textDecorationLine textDecorationStyle textShadowColor textShadowOffset
  textShadowRadius textTransform userSelect
`
    .trim()
    .split(/\s+/),
)

export const nativeKeys = new Set([
  ...textKeys,
  ...`
    alignContent alignItems alignSelf aspectRatio borderWidth borderTopWidth borderRightWidth
    borderBottomWidth borderLeftWidth borderStartWidth borderEndWidth bottom boxSizing columnGap
    direction display end flex flexBasis flexDirection flexGrow flexShrink flexWrap gap height
    inset justifyContent left margin marginTop marginRight marginBottom marginLeft marginStart
    marginEnd marginHorizontal marginVertical maxHeight maxWidth minHeight minWidth overflow
    padding paddingTop paddingRight paddingBottom paddingLeft paddingStart paddingEnd
    paddingHorizontal paddingVertical position right rowGap start top width zIndex
    backfaceVisibility backgroundColor borderColor borderTopColor borderRightColor borderBottomColor
    borderLeftColor borderStartColor borderEndColor borderRadius borderTopLeftRadius borderTopRightRadius
    borderBottomLeftRadius borderBottomRightRadius borderStyle boxShadow cursor filter isolation mixBlendMode
    opacity outlineColor outlineOffset outlineStyle outlineWidth pointerEvents transform transformOrigin
    objectFit tintColor
  `
    .trim()
    .split(/\s+/),
])

const itemAlign = 'flex-start flex-end center stretch baseline'
const contentAlign =
  'flex-start flex-end center space-between space-around space-evenly'
const alignmentKeys = new Set([
  'alignContent',
  'alignItems',
  'alignSelf',
  'justifyContent',
])

const keywords: Readonly<Record<string, string>> = {
  alignContent: `${contentAlign} stretch`,
  alignItems: itemAlign,
  alignSelf: `${itemAlign} auto`,
  backfaceVisibility: 'visible hidden',
  borderStyle: 'solid dotted dashed',
  boxSizing: 'border-box content-box',
  cursor: 'auto pointer',
  direction: 'ltr rtl',
  display: 'flex none contents inline-flex',
  flexDirection: 'row row-reverse column column-reverse',
  flexWrap: 'wrap nowrap wrap-reverse',
  fontStyle: 'normal italic',
  isolation: 'auto isolate',
  justifyContent: contentAlign,
  mixBlendMode:
    'normal multiply screen overlay darken lighten color-dodge color-burn hard-light soft-light difference exclusion hue saturation color luminosity',
  objectFit: 'cover contain fill scale-down none',
  outlineStyle: 'solid dotted dashed',
  overflow: 'visible hidden scroll',
  pointerEvents: 'auto none box-none box-only',
  position: 'absolute relative static',
  textAlign: 'auto left right center justify',
  textDecorationStyle: 'solid double dotted dashed',
  textTransform: 'none uppercase lowercase capitalize',
  userSelect: 'auto none text contain all',
}

const autoDimensions =
  /^(width|height|top|right|bottom|left|start|end|flexBasis|margin[A-Z]\w*)$/
const percentDimensions =
  /^(?:minWidth|maxWidth|minHeight|maxHeight|padding[A-Z]\w*|border[A-Z]\w*Radius|(?:row|column)Gap)$/
const pixelDimensions =
  /^(border(?:[A-Z]\w*)?Width|lineHeight|fontSize|letterSpacing|outlineWidth|outlineOffset|textShadowRadius)$/
const unitless = /^(flexGrow|flexShrink|opacity|zIndex)$/
const negativeLengths =
  /^(top|right|bottom|left|start|end|margin[A-Z]\w*|letterSpacing|outlineOffset)$/
const fontVariants = new Set([
  'small-caps',
  'oldstyle-nums',
  'lining-nums',
  'tabular-nums',
  'proportional-nums',
])

export function numericLength(text: string): number | undefined {
  if (cssNumber.test(text) && Number(text) === 0) return 0
  const size = readDimension(text)
  if (size?.unit === 'px' && Number.isFinite(size.size)) return size.size
}

function lengthProperty(key: string): boolean {
  return (
    autoDimensions.test(key) ||
    percentDimensions.test(key) ||
    pixelDimensions.test(key)
  )
}

export function acceptsScalarToken(key: string): boolean {
  return (
    scalarTokenType(key) === 'string' ||
    lengthProperty(key) ||
    unitless.test(key) ||
    key === 'aspectRatio'
  )
}

/** Checks a literal before it goes into a React Native style. */
export function nativeLiteral(
  key: string,
  text: string,
): StyleValue | undefined {
  let value = text.toLowerCase()
  if (alignmentKeys.has(key) && (value === 'start' || value === 'end'))
    value = `flex-${value}`
  const allowed = Object.hasOwn(keywords, key) ? keywords[key] : undefined
  if (allowed) return allowed.split(' ').includes(value) ? value : undefined
  if (isColorKey(key)) return value === 'transparent' ? value : undefined

  if (lengthProperty(key)) {
    if (value === 'auto' && autoDimensions.test(key)) return value
    const size = readDimension(value)
    const length = numericLength(value)
    if (length !== undefined && (length >= 0 || negativeLengths.test(key)))
      return length
    if (
      !pixelDimensions.test(key) &&
      size?.unit === '%' &&
      Number.isFinite(size.size) &&
      (size.size >= 0 || negativeLengths.test(key))
    )
      return value
    return undefined
  }

  if (unitless.test(key)) {
    if (key === 'zIndex' && !/^[+-]?\d+$/.test(value)) return undefined
    const number = Number(value)
    if (
      cssNumber.test(value) &&
      Number.isFinite(number) &&
      (key === 'zIndex' || number >= 0) &&
      (key !== 'opacity' || number <= 1)
    )
      return number
    return undefined
  }

  if (key === 'fontFamily') {
    const family = getStylesForProperty(key, text, true)[key]
    return typeof family === 'string' ? family : undefined
  }
  if (key === 'aspectRatio') {
    const ratio = getStylesForProperty(key, value, true)[key]
    if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0)
      return ratio
    return undefined
  }
  if (key === 'fontWeight')
    return /^(normal|bold|[1-9]00)$/.test(value) ? value : undefined
  if (key === 'fontVariant') {
    if (value === 'normal') return []
    const words = value.split(/\s+/)
    if (words.every((word) => fontVariants.has(word))) return words
    return undefined
  }
  if (key === 'textDecorationLine') {
    const words = value.split(/\s+/).sort().join(' ')
    if (words === 'line-through underline') return 'underline line-through'
    if (words === 'none' || words === 'line-through' || words === 'underline')
      return words
  }
}
