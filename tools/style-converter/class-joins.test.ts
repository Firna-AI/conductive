import { expect, test } from 'vitest'

import { findClassJoins } from './class-joins.ts'

const file = 'src/demo/Example.tsx'
const imports =
  "import styles from './Example.module.css'\nimport card from './Card.module.css'\n"

const cases: [string, string, string[][]][] = [
  [
    'template',
    '<A className={`${styles.row} ${styles.editable}`} />',
    [['styles.row', 'styles.editable']],
  ],
  [
    'cross-module template',
    '`${styles.row} ${card.card}`',
    [['styles.row', 'card.card']],
  ],
  [
    'class from props',
    '`${styles.row} ${props.className}`',
    [['styles.row', 'props.className']],
  ],
  ['template text', '`selected ${styles.row}`', [['selected', 'styles.row']]],
  ['template selector', '`.${styles.row}`', []],
  [
    'unreadable operand',
    'cx(styles.row, tag`active`)',
    [['styles.row', 'tag`active`']],
  ],
  [
    'conditional argument',
    'classes(styles.row, editing && styles.editable)',
    [['styles.row', 'styles.editable']],
  ],
  [
    'computed member',
    'clsx(styles[key], status())',
    [['styles[key]', 'status()']],
  ],
  [
    'outermost call',
    'cx(classes(styles.row, styles.editable), "highlight")',
    [['styles.row', 'styles.editable', '"highlight"']],
  ],
  [
    'array join',
    '[styles.row, " ", ".selector", className].join(" ")',
    [['styles.row', 'className']],
  ],
  [
    'concatenation',
    'styles.row + " " + (editing ? styles.editable : "")',
    [['styles.row', 'styles.editable']],
  ],
  [
    'larger branch',
    'classes(styles.row, editing ? "idle" : cx(styles.editable, card.card))',
    [['styles.row', 'styles.editable', 'card.card']],
  ],
  [
    'module fallback in a nullish choice',
    'classes((wide ? "wide roomy" : undefined) ?? styles.row, "base")',
    [['styles.row', '"base"']],
  ],
  [
    'module fallback in an OR choice',
    'cx((wide ? "wide roomy" : "") || styles.row, "base")',
    [['styles.row', '"base"']],
  ],
  [
    'module branch of a nested ternary',
    'classes(on ? "x y z" : (edit ? "x y" : styles.row), styles.base)',
    [['styles.row', 'styles.base']],
  ],
  ['ternary selects one class', 'editing ? styles.row : styles.editable', []],
  ['template with spaces', '` ${styles.row} `', []],
  ['classes without a module', 'classes(props.className, "hidden")', []],
  [
    'separate branch joins',
    'editing ? cx(styles.row, "a") : cx(card.card, "b")',
    [
      ['styles.row', '"a"'],
      ['card.card', '"b"'],
    ],
  ],
]

test.each(cases)(
  'reports the class values for %s',
  (_name, expression, values) => {
    const source = `${imports}const value = ${expression}\n`
    expect(findClassJoins(file, source).joins).toEqual(
      values.map((classes) => ({
        file: 'src/demo/Example.tsx',
        line: 3,
        values: classes,
      })),
    )
  },
)

test('lists a class variable that the view appends to at the JSX element line', () => {
  const { checks } = findClassJoins(
    file,
    `${imports}function Row() {
  let className = styles.row
  className += ' ' + styles.editable
  return (
    <A
      className={className}
    />
  )
}
`,
  )
  expect(checks).toEqual([
    { file: 'src/demo/Example.tsx', line: 7, expression: 'className' },
  ])
})

test('reads a constant class with an absent branch and a class fallback', () => {
  const { joins, checks } = findClassJoins(
    file,
    `${imports}function Row(props: { className?: string }) {
  const className = props.className ?? undefined
  return <A className={classes(styles.row, className || styles.editable)} />
}
`,
  )
  expect(checks).toEqual([])
  expect(joins).toEqual([
    {
      file: 'src/demo/Example.tsx',
      line: 5,
      values: ['styles.row', 'styles.editable'],
    },
  ])
})
