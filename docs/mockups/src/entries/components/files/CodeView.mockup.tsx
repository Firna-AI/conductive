import { defineComponent } from '@mokly/mokly'
import {
  CodeTokens,
  CodeView,
  type LineRange,
} from '../../../components/files/CodeView'
import { autocompleteHook } from '../../../fixtures/fileContents'
import { inPlace, placeHeightSchema } from '../common/ownPages'

/** A range of lines of a file, from 1, as `LineRange`. */
const lineRangeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['first', 'last'],
  properties: {
    first: { type: 'integer', minimum: 1 },
    last: { type: 'integer', minimum: 1 },
  },
} as const

/** The lines of the hook that skip a short query, as an answer names them. */
const shortQueryLines = { first: 19, last: 22 } as const satisfies LineRange

/**
 * One line of code in syntax colours, registered with Mokly. Its page shows
 * a line with each kind of token.
 */
export const codeTokens = defineComponent({
  slug: 'code-tokens',
  title: 'Code tokens',
  description:
    'One line of code in syntax colours: keywords, strings, comments, numbers, and types. The code view and the diff view draw each line with it. Its own page shows a line with each kind of token.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['line'],
    properties: { line: { type: 'string' } },
  } as const,
  props: {
    line: "export const lookup = new Lookup('/api/places', 250) // ms",
  },
  render: (props) => <CodeTokens line={props.line} />,
})

/**
 * A code file with line numbers and syntax colours, registered with Mokly.
 * Its pages show the hook of Checkout address autocomplete, from the top
 * and opened at the lines that an answer names. A view opened at a line
 * fills the height of its place, so that page gives it a place of a fixed
 * height.
 */
export const codeView = defineComponent({
  slug: 'code-view',
  title: 'Code view',
  description:
    'A code file with line numbers and syntax colours, as the tab of a code file shows it. With the path of the file, the colours are those of its language, such as HTML. A tab opened at a line target marks the lines of the range and shows the first of them in the middle of the view. Its own page shows the hook of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['code'],
    properties: {
      code: { type: 'string' },
      /** The lines of a line target, which the tab opened at. */
      marked: lineRangeSchema,
      /** The path of the file, whose language gives the colours. */
      path: { type: 'string', minLength: 1 },
      placeHeight: placeHeightSchema,
    },
  } as const,
  props: { code: autocompleteHook },
  render: (props) =>
    inPlace(
      <CodeView code={props.code} marked={props.marked} path={props.path} />,
      props.placeHeight,
    ),
  variants: [
    {
      slug: 'at-a-line',
      title: 'At a line',
      description:
        'The tab opened at lines 19 to 22, from a file chip of an answer: the lines have an amber background.',
      props: { marked: shortQueryLines, placeHeight: 480 },
    },
  ],
})
