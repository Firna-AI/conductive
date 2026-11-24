import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'

test.each([
  ['letter-spacing', '--ui-tracking', '0.06em', 'em'],
  ['line-height', '--ui-leading', '1.6', 'lineHeight'],
])(
  'lists %s with its metric reason in plain and hover rules',
  (property, token, value, reason) => {
    const text = `${property}: var(${token})`
    const result = convertCss(
      'src/demo/Example.module.css',
      `.row { ${text} }\n.row:hover { ${text} }`,
      new Map([[token, value]]),
    )
    expect(result.listed).toEqual([
      {
        kind: 'declaration',
        line: 1,
        selector: '.row',
        text,
        reasons: [reason],
      },
      {
        kind: 'rule',
        line: 2,
        selector: '.row:hover',
        reasons: ['hover'],
        declarations: [{ line: 2, text, reasons: [reason] }],
      },
    ])
    expect(Object.fromEntries(result.classes?.get('row') ?? [])).toEqual({})
  },
)
