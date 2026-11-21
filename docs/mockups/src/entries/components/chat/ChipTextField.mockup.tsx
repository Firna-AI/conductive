import { defineComponent } from '@mokly/mokly'
import { ChipTextField } from '../../../components/chat/ChipTextField'

/**
 * The text field of a message box that holds chips, registered with
 * Mokly. A message box supplies its draft in the `children` slot.
 */
export const chipTextField = defineComponent({
  slug: 'chip-text-field',
  title: 'Chip text field',
  description:
    'The text field of a message box that holds chips inside its text, with the font and the line height of the plain field. It grows with its text up to its most lines, then scrolls. On a phone its text is larger. A message box supplies its draft, so its own page shows the empty field.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'lines', 'maxLines'],
    properties: {
      /** The spoken name of the field, such as "Message". */
      label: { type: 'string' },
      /** The least number of lines that the field shows. */
      lines: { type: 'integer', minimum: 1 },
      /** The most lines that the field shows before its text scrolls. */
      maxLines: { type: 'integer', minimum: 1 },
    },
  } as const,
  slots: ['children'],
  props: { label: 'Message', lines: 2, maxLines: 8 },
  render: (props) => (
    <ChipTextField
      label={props.label}
      lines={props.lines}
      maxLines={props.maxLines}
    >
      {props.children}
    </ChipTextField>
  ),
  variants: [
    {
      slug: 'text',
      title: 'Text',
      description: 'The field with a line of text.',
      props: {},
      slots: {
        children:
          'Check that the suggestions stay closed when a saved address loads.',
      },
    },
  ],
})
