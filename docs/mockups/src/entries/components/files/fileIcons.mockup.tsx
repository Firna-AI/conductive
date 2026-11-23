import { defineComponent } from '@mokly/mokly'
import { EntryIcon } from '../../../../../../src/ui/components/files/fileIcons'

/**
 * The icon of an entry of the tree, registered with Mokly. The app draws
 * the same icons, so mockup-only parts render the wrapper and the parts
 * that the app reaches keep the plain part.
 */
export const entryIcon = defineComponent({
  slug: 'entry-icon',
  title: 'Entry icon',
  description:
    'The icon of an entry of the file tree, as All files, the list of `@`, and the file chips draw it: a folder, open or closed, a Markdown file, a code file, or another file. A file is code when the code view gives it syntax colours. Its own page shows a code file.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'folder', 'size'],
    properties: {
      /** The name of the entry, whose extension picks the icon of a file. */
      name: { type: 'string', minLength: 1 },
      folder: { type: 'boolean' },
      /** A folder whose entries show below it. */
      open: { type: 'boolean' },
      size: { type: 'number', minimum: 1 },
      /** A class of the call, such as the colour of the tree. */
      className: { type: 'string' },
    },
  } as const,
  props: { name: 'useAddressAutocomplete.ts', folder: false, size: 14 },
  render: (props) => (
    <EntryIcon
      className={props.className}
      folder={props.folder}
      name={props.name}
      open={props.open}
      size={props.size}
    />
  ),
  variants: [
    {
      slug: 'folder',
      title: 'Folder',
      description: 'A closed folder.',
      props: { name: 'prisma', folder: true },
    },
    {
      slug: 'open-folder',
      title: 'Open folder',
      description: 'A folder whose entries show below it.',
      props: { name: 'checkout', folder: true, open: true },
    },
    {
      slug: 'markdown',
      title: 'Markdown file',
      description: 'A Markdown file.',
      props: { name: 'README.md' },
    },
    {
      slug: 'other-file',
      title: 'Other file',
      description: 'A file that the code view does not colour.',
      props: { name: 'postcode-overlap.png' },
    },
  ],
})
