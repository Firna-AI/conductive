import { defineComponent } from '@mokly/mokly'
import { CodeTokens, CodeView } from '../../../components/files/CodeView'
import { autocompleteHook } from '../../../fixtures/fileContents'

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
 * Its page shows the hook of Checkout address autocomplete.
 */
export const codeView = defineComponent({
  slug: 'code-view',
  title: 'Code view',
  description:
    'A code file with line numbers and syntax colours, as the tab of a code file shows it. Its own page shows the hook of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['code'],
    properties: { code: { type: 'string' } },
  } as const,
  props: { code: autocompleteHook },
  render: (props) => <CodeView code={props.code} />,
})
