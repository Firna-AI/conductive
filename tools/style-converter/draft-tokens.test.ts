import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'
import { renderDraft } from './draft.ts'

const file = 'src/demo/Text.module.css'

test('drafts text token types with the React Native keyword unions', async () => {
  const { classes = new Map() } = convertCss(
    file,
    `.label {
  text-align: var(--ui-align);
  text-transform: var(--ui-label-case);
  font-style: var(--ui-style);
  font-weight: var(--ui-weight);
}`,
  )
  expect(await renderDraft(file, classes)).toBe(`/**
 * Draft from src/demo/Text.module.css.
 * The report of this run lists the rules that the draft leaves out.
 */
type Tokens = {
  readonly align: 'auto' | 'left' | 'right' | 'center' | 'justify'
  readonly labelCase: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  readonly style: 'normal' | 'italic'
  readonly weight:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
}

export function textStyles(t: Tokens) {
  return {
    label: {
      textAlign: t.align,
      textTransform: t.labelCase,
      fontStyle: t.style,
      fontWeight: t.weight,
    },
  } as const
}
`)
})

test('lists font-variant for a manual port and leaves it out of the draft', () => {
  const { classes, listed } = convertCss(
    file,
    '.label { font-variant: tabular-nums }',
  )
  expect(listed).toEqual([
    {
      kind: 'declaration',
      line: 1,
      selector: '.label',
      text: 'font-variant: tabular-nums',
      reasons: ['fontVariant'],
    },
  ])
  expect(Object.fromEntries(classes?.get('label') ?? [])).toEqual({})
})
