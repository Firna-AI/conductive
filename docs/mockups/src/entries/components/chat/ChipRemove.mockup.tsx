import { defineComponent } from '@mokly/mokly'
import { FileText } from 'lucide-react'
import {
  ChipEndRemove,
  ChipIconCell,
} from '../../../../../../src/ui/components/chat/ChipRemove'
import { TouchScreen } from '../../../../../../src/ui/components/common/touch'
import { removalSchema } from './chipSchemas'

/**
 * The cell of the icon of a chip of a message box, registered with Mokly.
 * A chip supplies its icon in the `icon` slot.
 */
export const chipIconCell = defineComponent({
  slug: 'chip-icon-cell',
  title: 'Chip icon cell',
  description:
    'The cell of the icon at the start of a chip of a message box. While a pointer is over the cell, a × takes the place of the icon, and a press removes the chip. A keyboard reaches the cell only where it can focus, as for an attached file. A chip supplies its icon. Its own page shows the cell without an icon.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['removal'],
    properties: {
      removal: removalSchema,
      /** The keyboard can reach the cell, as for an attached file. */
      focusable: { type: 'boolean' },
    },
  } as const,
  slots: ['icon'],
  props: { removal: { name: 'useAddressAutocomplete.ts' } },
  render: (props) => (
    <ChipIconCell
      focusable={props.focusable}
      icon={props.icon}
      removal={props.removal}
    />
  ),
  variants: [
    {
      slug: 'icon',
      title: 'Icon',
      description: 'The cell with the icon of a file chip.',
      props: {},
      slots: { icon: <FileText aria-hidden size={12} /> },
    },
    {
      slug: 'pointer',
      title: 'Pointer over the icon',
      description: 'The pointer is over the cell, so a × takes its place.',
      props: { removal: { name: 'useAddressAutocomplete.ts', pointer: true } },
      slots: { icon: <FileText aria-hidden size={12} /> },
    },
  ],
})

/**
 * The × at the end of a chip where no pointer hovers, registered with
 * Mokly. It shows only on a touch screen, so its own page passes `touch`,
 * which no screen passes: a screen of a phone gives the touch sizes.
 */
export const chipEndRemove = defineComponent({
  slug: 'chip-end-remove',
  title: 'Chip end remove',
  description:
    'The × at the end of a chip of a message box where no pointer hovers, as on a phone. It shows at all times there, and nowhere else. Its own page shows it with the touch sizes.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['removal'],
    properties: {
      removal: removalSchema,
      /** The touch sizes of a phone, which only the own page passes. */
      touch: { type: 'boolean' },
    },
  } as const,
  props: { removal: { name: 'useAddressAutocomplete.ts' }, touch: true },
  render: (props) =>
    props.touch === true ? (
      <TouchScreen>
        <ChipEndRemove removal={props.removal} />
      </TouchScreen>
    ) : (
      <ChipEndRemove removal={props.removal} />
    ),
})
