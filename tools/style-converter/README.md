# Style converter

Use this development tool to draft React Native styles from the CSS Modules
of one area of the app. Use the report to port the rest of the CSS by hand.
Nothing in the product imports the tool.

## Run the tool

Use Node 24. Run this command from the repository root.

```sh
npm run styles:convert -- src/ui/components/common --out .context/common-styles
```

Give one area folder and an output path with `--out`. The tool reads the
area and its subfolders. Give a new or empty folder as the output path.
Use `--help` to print the command syntax.

The tool prints the counts and the path of `report.md`. Exit status 0
means the run finished. The report can contain work to do by hand.
Invalid input gives exit status 1 and an error on standard error. A
missing area, a missing option, a file as output, or a nonempty output
folder stops the run before it writes any output.

## Draft modules

For each readable `<area>/<sub>/Name.module.css`, the tool writes
`<out>/<sub>/Name.styles.ts`. The name of the exported function uses camel
case. The function returns one style object for each plain class.

For example, `StatusText.module.css` can contain this rule.

```css
.status {
  display: flex;
  color: var(--ui-ink2);
  font-size: var(--ui-text-sm);
}
```

`StatusText.styles.ts` contains this function.

```ts
type Tokens = {
  readonly ink2: string
  readonly textSm: number
}

export function statusTextStyles(t: Tokens) {
  return {
    status: {
      display: 'flex',
      flexDirection: 'row',
      color: t.ink2,
      fontSize: t.textSm,
    },
  } as const
}
```

Pass the design tokens of the current colour scheme as `t`. Call the function
again when the scheme changes. Each draft lists the tokens it reads in a
local `Tokens` type. A function with no token reads takes no argument.

The tool removes `--ui-` and uses camel case. For example, `--ui-pad-x`
becomes `t.padX` and `--ui-font-mono` becomes `t.fontMono`. It drops the CSS
fallback in `var(--ui-ink, fallback)`. Colour, font family, and tokens inside
strings use `string`. Font weight, font style, text alignment, and text
transform use the accepted keyword values of each property. The other
token fields use `number`.

Supply React Native values in `t`. Give a length as a number when the draft
reads the token as a number. For a token inside a shadow string, supply a
string that matches its part of the shadow syntax.

- The report lists `--ui-tracking-*` uses with an `em` unit. Calculate the
  letter spacing from the font size of each Text.
- The report lists `--ui-leading-chat` uses in `line-height`. Multiply the
  font size by the token value to get a native line height.
- Supply the visible window height for `--ui-screen-height`, which uses `dvh` in CSS.
- Select one font family for each `--ui-font-*` token that gives a CSS font list.

The web theme defines the CSS token names and values.
See [theme.ts](../../src/ui/theme.ts),
[palette.ts](../../src/ui/design/palette.ts), and
[metrics.ts](../../src/ui/design/metrics.ts).

## Conversion rules

- Convert a selector with one class. Check each selector in a list on its own.
- List rules with combinators, elements, attributes, IDs, multiple classes,
  global selectors, pseudo-classes, or pseudo-elements.
- List each rule in a media, container, or feature query with its selector
  reasons. List keyframes and other at-rules as whole items.
- Keep source values and source lines. If the source and parser disagree,
  list the whole rule. If the parser cannot read a file, list its error.
- Merge longhands for each class. An `!important` value wins over a normal
  value. For values with equal importance, use the later one. Collapse
  equal sides or equal gaps after the merge.
- When a listed declaration in a top-level plain class rule overrides draft
  values, remove only the keys it replaces. The manual check names each
  earlier declaration and says when the draft keeps some of its values.
  Count the earlier declaration as converted.
- When a later converted declaration replaces listed keys, add a manual
  check at the later line. It says if any part of the listed declaration
  still applies.
- Expand padding, margin, borders, radii, gaps, and inset. Map the inline and
  block sides of margin and padding to physical sides for the app's left to
  right layout.
- Map a side border to its width and colour. Drop `solid` from a side border.
  List a `dashed` or `dotted` side border or a side with a different shared
  border style. Map `border: 0` and `border: none` to zero width.
- Map `background: none` and `background: transparent` to a transparent
  background. Keep a box shadow in the string syntax that React Native
  accepts. Add token lookups in a template literal when the shadow reads
  tokens.
- Use the CSS row default for a flex class with no direction. Map
  `inline-flex` to `flex` and add a check for the surrounding layout.
- Apply `!important` during the merge. Omit the flag from the draft and add
  a check for style order. Add a check for each class with text styles.
- Use token lookups and transparent for colours. List fixed colours,
  `currentColor`, and other colour values.
- List grid, calculations, unsupported units, unitless line heights,
  CSS-wide keywords, custom property assignments, and local variables.
  List unsupported functions, style names, and values.
- List `font-variant` as manual work. React Native needs a mutable array
  for font variants.

The tool checks style names and the allowed values for properties such as
`display`, `position`, and `overflow`. It maps `start` and `end` to
`flex-start` and `flex-end` for alignment.
See [native-properties.ts](native-properties.ts).

## Report

Open `<out>/report.md`. The summary counts modules, drafts, converted and
listed declarations, classes that get the row default, manual checks, class
joins, and unreadable class values. It gives the number of files with joins.
A declaration counts once for each selector that uses it. One listed
declaration can count under more than one reason.

Each module has a **Not in the draft** list and a **Check by hand** list.
The items give source lines and selectors. An item for a rule includes its
declarations. The reason table gives the action for each reason.
See [reasons.ts](reasons.ts).

**Views that join classes** lists TSX files, lines, and class expressions.
It detects template literals, `classes()`, `clsx()`, `cx()`, arrays with
`.join(' ')`, and concatenation with `+`. A join has at least two class
values and uses at least one member of a CSS Module default import.
The scan counts each word in a string literal or static template text
that matches `/^-?[_a-zA-Z][\w-]*$/` as one class value. It uses the larger
branch of a readable `?:`, `||`, or `??`. It reads the right side of `&&`.
It keeps each unreadable operand in a join as one value with its source text.
It lists the outermost join and skips files that end in `.test.tsx`.

**Class values to check by hand** gives the file, element line, and source
expression for each JSX `className` value the scan cannot read. The scan
can read strings, template literals with readable parts, object members,
parameters, supported joins, choices between readable values, and constants
with readable initializers. It treats `false`, `null`, and the global
`undefined` as empty class values. Mutable variables and unknown calls go
in the manual list.

## Limits

The tool accepts token names by their `--ui-` prefix and name format.
It does not check that a token exists. It lists token uses whose type the
style cannot take. If a token needs two types in one module, the draft uses
their common values. The tool lists a conflicting use if the types have no
values in common.
The list of React Native style names can miss newer names.

## Development

```sh
npm run test -- tools/style-converter
npm run typecheck
npm run lint
npm run format:check
npm run exports:check
```

`npm run typecheck` checks the tool and its tests through the root
[tsconfig.node.json](../../tsconfig.node.json).

### Key Code

- The command reads the options and writes the drafts and report. [main.ts](main.ts)
- The CSS reader records source blocks and their positions. [css-text.ts](css-text.ts)
- The rule reader matches source blocks to Lightning CSS rules. [css-rules.ts](css-rules.ts)
- The selector check finds reasons to list a selector. [selectors.ts](selectors.ts)
- The module converter drafts one module and collects its report items. [convert-css.ts](convert-css.ts)
- The declaration converter checks and converts one declaration. [declaration.ts](declaration.ts)
- The value reader finds token calls and unsupported CSS values. [value-source.ts](value-source.ts)
- The style checks use a list of supported names and values. [native-properties.ts](native-properties.ts)
- The keyword table gives literal values and token types for style properties. [keyword-values.ts](keyword-values.ts)
- The function checks cover transforms, filters, transform origins, and shadows. [native-functions.ts](native-functions.ts)
- The shorthand converter expands CSS shorthands into React Native values. [shorthands.ts](shorthands.ts)
- The property map gives the longhand keys that each declaration sets. [property-keys.ts](property-keys.ts)
- The draft value types cover literals, token lookups, and templates. [style-values.ts](style-values.ts)
- The merge applies longhands in order and collapses equal values. [merge.ts](merge.ts)
- The draft writer formats a TypeScript module. [draft.ts](draft.ts)
- The class join scan finds joins and unreadable JSX class values. [class-joins.ts](class-joins.ts)
- The class reader reads class expressions and their bindings. [class-values.ts](class-values.ts)
- The reason table gives the report labels and actions. [reasons.ts](reasons.ts)
- The report writer counts the results and writes the Markdown. [report.ts](report.ts)
- The conversion tests check the draft shape and converted styles. [convert-css.test.ts](convert-css.test.ts)
- The cascade tests check shorthand overrides and importance. [cascade.test.ts](cascade.test.ts)
- The draft token tests check keyword unions and manual font variants. [draft-tokens.test.ts](draft-tokens.test.ts)
- The relative token tests check report reasons in plain and listed rules. [relative-tokens.test.ts](relative-tokens.test.ts)
- The rule tests check the reasons and source lines for omissions. [listed-rules.test.ts](listed-rules.test.ts)
- The join tests check class joins in TSX text. [class-joins.test.ts](class-joins.test.ts)
- The report test checks the Markdown for a small run. [report.test.ts](report.test.ts)
- The command test checks file output and exit status. [main.test.ts](main.test.ts)
