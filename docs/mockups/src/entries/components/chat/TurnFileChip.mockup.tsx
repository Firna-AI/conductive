import { defineComponent } from '@mokly/mokly'
import { TurnFileChip } from '../../../components/chat/TurnFileChip'
import { changedFileSchema } from '../files/fileSchemas'

/**
 * A changed file of a finished turn, registered with Mokly. Its pages show
 * a file with a diff, a file without one, and a file without line changes.
 */
export const turnFileChip = defineComponent({
  slug: 'turn-file-chip',
  title: 'Turn file chip',
  description:
    'A changed file of a finished turn: the icon of a file, its name, and the lines that it adds and removes. A file without line changes, such as a binary file, has no "+0". A file with a drawn diff opens it. Its own page shows the file whose diff the mockups draw.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['file'],
    properties: { file: changedFileSchema },
  } as const,
  props: {
    file: {
      path: 'src/app/checkout/AddressForm.tsx',
      change: 'modified',
      added: 38,
      removed: 6,
      diff: true,
    },
  },
  render: (props) => <TurnFileChip file={props.file} />,
  variants: [
    {
      slug: 'no-diff',
      title: 'Without a diff',
      description: 'A changed file whose diff the mockups do not draw.',
      props: {
        file: {
          path: 'src/app/checkout/useAddressAutocomplete.ts',
          change: 'added',
          added: 64,
          removed: 0,
        },
      },
    },
    {
      slug: 'binary',
      title: 'Without line changes',
      description: 'A binary file, which has no line counts.',
      props: {
        file: {
          path: 'public/screens/checkout.png',
          change: 'added',
          added: 0,
          removed: 0,
        },
      },
    },
  ],
})
