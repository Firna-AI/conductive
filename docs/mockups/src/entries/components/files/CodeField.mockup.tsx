import { defineComponent } from '@mokly/mokly'
import {
  CodeBlock,
  CodeField,
} from '../../../../../../src/files/code/CodeField'
import { installScript, startupScript } from '../../../fixtures/computer'
import { noop } from '../../../../../../src/ui/noop'

/** The props of a code field and of a code block. */
const codeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'name', 'value'],
  properties: {
    /** The name of the code for a screen reader. */
    label: { type: 'string' },
    /** A file name that picks the language of the colours. */
    name: { type: 'string' },
    value: { type: 'string' },
  },
} as const

/** A code field with line numbers and syntax colours, registered with Mokly. */
export const codeField = defineComponent({
  slug: 'code-field',
  title: 'Code field',
  description:
    'A field for code, such as a script of the cloud computer, with line numbers and the syntax colours of a file tab. It grows with its lines and shows at least three. Long lines wrap beside their number. Its own page shows the install script of Acme, and a variant shows the empty script of a new org.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: codeSchema,
  props: { label: 'Install software', name: 'script.sh', value: installScript },
  render: (props) => (
    <CodeField
      label={props.label}
      name={props.name}
      onChange={noop}
      value={props.value}
    />
  ),
  variants: [
    {
      slug: 'empty',
      title: 'Empty',
      description:
        'The empty startup script of a new org: one numbered line in a field of three lines.',
      props: { label: 'Startup script', value: '' },
    },
  ],
})

/** Code to read, with line numbers and syntax colours, registered with Mokly. */
export const codeBlock = defineComponent({
  slug: 'code-block',
  title: 'Code block',
  description:
    'Code to read in a tinted block, with the line numbers and the colours of a code field, such as a script that a member who is not an admin reads. Its own page shows the startup script of Acme.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: codeSchema,
  props: { label: 'Startup script', name: 'script.sh', value: startupScript },
  render: (props) => (
    <CodeBlock label={props.label} name={props.name} value={props.value} />
  ),
})
