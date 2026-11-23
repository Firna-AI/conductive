import { expect, test } from 'vitest'

import { findClassJoins } from './class-joins.ts'
import { convertCss } from './convert-css.ts'
import { renderReport } from './report.ts'

test('writes the counts, source lines, reasons and class join in the run report', () => {
  const stylesheet = convertCss(
    'src/demo/Example.module.css',
    '.row {\n  display: flex;\n  width: calc(100% - 1em);\n}\n.row:hover { width: 10px }',
  )
  const joins = findClassJoins(
    'src/demo/Example.tsx',
    "import styles from './Example.module.css'\nclasses(styles.row, props.className)",
  )
  expect(renderReport('src/demo', [stylesheet], joins).text)
    .toBe(`# Style conversion report

- Area \`src/demo\`
- CSS Modules 1
- Drafts 1
- Declarations converted 1
- Declarations listed 2
- Classes with the row default 1
- Check by hand 0
- Joins 1 in 1 file

## Listed declarations by reason

One declaration can count under more than one reason.

| Reason | Declarations | What to do |
| --- | ---: | --- |
| Hover state | 1 | Use the hover state of a Pressable. |
| CSS calculation | 1 | Calculate the value in TypeScript. |
| em unit | 1 | Calculate the length from the font size. |

## \`src/demo/Example.module.css\`

### Not in the draft

- Line 3 · \`.row\` · \`width: calc(100% - 1em)\` · CSS calculation, em unit
- Line 5 · \`.row:hover\` · Hover state
  - Line 5 · \`width: 10px\`

### Check by hand

None.

## Views that join classes

- \`src/demo/Example.tsx\` · Line 2 · \`styles.row\`, \`props.className\`
`)
})
