import { defineComponent } from '@mokly/mokly'
import { entryName } from '../../../../../../src/ui/components/chat/entryPaths'
import { FileChip } from '../../../../../../src/ui/components/chat/FileChip'
import { entryIcon } from '../files/fileIcons.mockup'
import { previewPaths } from '../../../components/files/previewPaths'
import { paths } from '../../../paths'
import { chipToSchema, openerTo } from './chipOpener'
import { mentionEntrySchema, removalSchema } from './chipSchemas'

/** The hook of the branch, which opens in its tab. */
const hook = {
  path: 'src/app/checkout/useAddressAutocomplete.ts',
  folder: false,
  preview: 'code',
} as const

/**
 * A file or a folder of the workspace in a line of text, registered with
 * Mokly. Its adapter draws the icon of the entry, as All files draws it,
 * and a link to the screen `to`, because a callback is not data.
 */
export const fileChip = defineComponent({
  slug: 'file-chip',
  title: 'File chip',
  description:
    'A file or a folder of the workspace in a line of text: a small rounded pill with the icon and the name of the entry, as All files draws them. Its title is the whole path. Screen readers hear "File" or "Folder" before the name. In a sent message a press opens the file. In a message box the chip has the cell of its icon, which a pointer turns into a × that removes it. A path with a line target shows the lines after the name. Its own page shows the chip of a file.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['entry'],
    properties: {
      entry: mentionEntrySchema,
      /** The text of the mention, which a copy of the message gives. */
      mention: { type: 'string' },
      to: chipToSchema,
      /** The chip of a message box, with the cell of its icon. */
      removal: removalSchema,
      /** The label of the name, when it differs from the end of the path. */
      name: { type: 'string' },
      /** The label of the whole path, for the title. */
      title: { type: 'string' },
      /** The line target after the name, such as `:19-22`. */
      lines: { type: 'string' },
    },
  } as const,
  props: { entry: hook },
  render: (props) => (
    <FileChip
      entry={props.entry}
      icon={
        <entryIcon.Component
          folder={props.entry.folder}
          moklyInstance="icon"
          name={entryName(props.entry)}
          size={12}
        />
      }
      lines={props.lines}
      mention={props.mention}
      name={props.name}
      opener={openerTo(props.to)}
      removal={props.removal}
      title={props.title}
    />
  ),
  variants: [
    {
      slug: 'link',
      title: 'In a sent message',
      description:
        'The chip of a mention in a sent message, which opens the tab of the file.',
      props: { mention: `@${hook.path}`, to: previewPaths.code },
    },
    {
      slug: 'folder',
      title: 'Folder',
      description: 'A folder, which no view opens.',
      props: { entry: { path: 'src/app/checkout', folder: true } },
    },
    {
      slug: 'removable',
      title: 'In a message box',
      description:
        'The chip in a message box, with the pointer over its icon, so a × takes its place.',
      props: { removal: { name: 'useAddressAutocomplete.ts', pointer: true } },
    },
    {
      slug: 'lines',
      title: 'At lines',
      description:
        'The chip of a path with a line target in an answer: the lines follow the name, and a press opens the tab of the file at the lines.',
      props: {
        mention: `${hook.path}:19-22`,
        lines: ':19-22',
        title: `${hook.path}:19-22`,
        to: paths.codeAtLine,
      },
    },
  ],
})
