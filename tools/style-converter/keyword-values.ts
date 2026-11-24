type KeywordProperty = { values: readonly string[]; token: boolean }

function keywords(values: string, token = false): KeywordProperty {
  return { values: values.split(' '), token }
}

const itemAlign = 'flex-start flex-end center stretch baseline'
const contentAlign =
  'flex-start flex-end center space-between space-around space-evenly'

const properties: Readonly<Record<string, KeywordProperty>> = {
  alignContent: keywords(`${contentAlign} stretch`),
  alignItems: keywords(itemAlign),
  alignSelf: keywords(`${itemAlign} auto`),
  backfaceVisibility: keywords('visible hidden'),
  borderStyle: keywords('solid dotted dashed'),
  boxSizing: keywords('border-box content-box'),
  cursor: keywords('auto pointer'),
  direction: keywords('ltr rtl'),
  display: keywords('flex none contents inline-flex'),
  flexDirection: keywords('row row-reverse column column-reverse'),
  flexWrap: keywords('wrap nowrap wrap-reverse'),
  fontStyle: keywords('normal italic', true),
  fontWeight: keywords('normal bold 100 200 300 400 500 600 700 800 900', true),
  isolation: keywords('auto isolate'),
  justifyContent: keywords(contentAlign),
  mixBlendMode: keywords(
    'normal multiply screen overlay darken lighten color-dodge color-burn hard-light soft-light difference exclusion hue saturation color luminosity',
  ),
  objectFit: keywords('cover contain fill scale-down none'),
  outlineStyle: keywords('solid dotted dashed'),
  overflow: keywords('visible hidden scroll'),
  pointerEvents: keywords('auto none box-none box-only'),
  position: keywords('absolute relative static'),
  textAlign: keywords('auto left right center justify', true),
  textDecorationLine: {
    values: ['none', 'underline', 'line-through', 'underline line-through'],
    token: false,
  },
  textDecorationStyle: keywords('solid double dotted dashed'),
  textTransform: keywords('none uppercase lowercase capitalize', true),
  userSelect: keywords('auto none text contain all'),
}

export function keywordProperty(key: string): KeywordProperty | undefined {
  return Object.hasOwn(properties, key) ? properties[key] : undefined
}
