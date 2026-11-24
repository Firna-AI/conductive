export const reasons = {
  combinator: ['Combinator', 'Apply the style at the view that needs it.'],
  element: ['Element selector', 'Apply the style to the target view or Text.'],
  hover: ['Hover state', 'Use the hover state of a Pressable.'],
  focus: ['Focus state', 'Use focus and blur events.'],
  pseudoClass: ['Pseudo-class', 'Use component state or props.'],
  pseudoElement: [
    'Pseudo-element',
    'Add a view or Text for the generated part.',
  ],
  attribute: ['Attribute selector', 'Use component props to select the style.'],
  compound: [
    'Compound selector',
    'Apply the style when the classes or ID match.',
  ],
  global: ['Global selector', 'Find the view that owns the global class.'],
  nesting: ['Nested rule', 'Apply the style in the outer selector context.'],
  media: ['Media query', 'Use the window size or the matching device setting.'],
  container: ['Container query', 'Use the measured size of the container.'],
  supports: ['Feature query', 'Check platform support for the feature.'],
  keyframes: ['Keyframes', 'Port the animation.'],
  atRule: ['Other at-rule', 'Port the at-rule where the app needs it.'],
  grid: ['Grid', 'Use views and flex layout.'],
  calculation: ['CSS calculation', 'Calculate the value in TypeScript.'],
  em: ['em unit', 'Calculate the length from the font size.'],
  rem: ['rem unit', 'Calculate the length from the root font size.'],
  unit: [
    'Unsupported unit',
    'Supply a length or another value React Native accepts.',
  ],
  lineHeight: ['Unitless line height', 'Use the font size × n.'],
  fontVariant: [
    'Font variant',
    'Port font-variant by hand with a mutable font variant array.',
  ],
  customProperty: [
    'Custom property',
    'Set the value in the theme or the view.',
  ],
  localVariable: [
    'Local variable',
    'Pass the value into the style from the view.',
  ],
  cssFunction: [
    'CSS function',
    'Port the function where the view uses its value.',
  ],
  cssKeyword: ['CSS-wide keyword', 'Set the value on the view that needs it.'],
  fixedColor: ['Fixed colour', 'Use a design token for the colour.'],
  currentColor: ['Current colour', 'Pass the text colour to the style.'],
  colorValue: [
    'Unsupported colour value',
    'Use a design token or transparent.',
  ],
  property: [
    'Unsupported style name',
    'Find a React Native style or port the behaviour in the view.',
  ],
  nativeValue: [
    'Unsupported style value',
    'Supply a value that the React Native style accepts.',
  ],
  parseValue: ['Cannot convert value', 'Port the declaration by hand.'],
  sideBorderStyle: [
    'Side border style',
    'React Native sets one border style for all sides.',
  ],
  overflowAxes: [
    'Overflow axes',
    'React Native sets one overflow value for both axes.',
  ],
  shorthandDefault: [
    'Implicit shorthand value',
    'Set the missing values from the CSS context.',
  ],
  tokenType: [
    'Token type conflict',
    'Supply a token with the type this style needs.',
  ],
  parseRule: ['Cannot read rule', 'Check the source rule for a parse error.'],
  parseFile: ['Cannot read file', 'Check the source file for a parse error.'],
} as const

export type Reason = keyof typeof reasons
