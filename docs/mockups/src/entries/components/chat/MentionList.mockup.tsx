import { defineComponent } from '@mokly/mokly'
import {
  entryFolder,
  entryName,
} from '../../../../../../src/ui/components/chat/entryPaths'
import { mentionRows } from '../../../components/chat/fileMentions'
import {
  MentionAnchor,
  MentionList,
} from '../../../../../../src/ui/components/chat/MentionList'
import { SkillIcon } from '../../../../../../src/ui/components/chat/SkillChip'
import { instanceKey } from '../../../instanceKey'
import { entryIcon } from '../files/fileIcons.mockup'
import { roomAboveSchema, withRoomAbove } from '../common/ownPages'

/** The rows of the list of `@` for the query `addr`. */
const rows = mentionRows('addr').map((entry) => ({
  key: entry.path,
  name: entryName(entry),
  folder: entryFolder(entry),
  icon: entry.folder ? ('folder' as const) : ('file' as const),
}))

/**
 * The list of `@` above the message box, registered with Mokly. The icon
 * of a row is a key, because an element is not data: its adapter draws
 * the icon of the entry, as All files draws it. The list opens above its
 * place, so its own pages give it room above.
 */
export const mentionList = defineComponent({
  slug: 'mention-list',
  title: 'Mention list',
  description:
    'The list of `@` above the message box, as wide as the box: the icon, the name, and the folder of each file or folder that matches. The list of `/` shows the name and the description of each skill in the same way, and `label` names its listbox. The row that Enter or Tab picks is highlighted. One line takes the place of the rows while the tree loads, when no tree is available, and when nothing matches. Its own page shows the matches of "addr".',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'rows', 'highlighted', 'line'],
    properties: {
      id: { type: 'string', minLength: 1 },
      /** The name of the listbox, for the list of `/`. */
      label: { type: 'string' },
      rows: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['key', 'name', 'folder', 'icon'],
          properties: {
            /** The real path, or the name of a skill: the key of the row. */
            key: { type: 'string', minLength: 1 },
            name: { type: 'string' },
            /** The folder that holds the entry, or '' at the root. */
            folder: { type: 'string' },
            /** The muted line after the name: the description of a skill. */
            description: { type: 'string' },
            /** The icon of a file, by its name, of a folder, or of a skill. */
            icon: { enum: ['file', 'folder', 'skill'] },
          },
        },
      },
      /** The row that Enter or Tab picks, or null. */
      highlighted: { type: ['integer', 'null'], minimum: 0 },
      /** The line in place of the rows, or null. */
      line: { type: ['string', 'null'] },
      roomAbove: roomAboveSchema,
    },
  } as const,
  props: {
    id: 'file-mentions',
    rows,
    highlighted: 0,
    line: null,
    roomAbove: true,
  },
  render: (props) =>
    withRoomAbove(
      <MentionList
        highlighted={props.highlighted}
        id={props.id}
        label={props.label}
        line={props.line}
        rows={props.rows.map((row) => ({
          ...row,
          icon:
            row.icon === 'skill' ? (
              <SkillIcon size={14} />
            ) : (
              <entryIcon.Component
                folder={row.icon === 'folder'}
                moklyInstance={`icon-${instanceKey(row.key)}`}
                name={row.name}
                size={14}
              />
            ),
        }))}
      />,
      props.roomAbove,
    ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description:
        'The line that takes the place of the rows while the tree loads.',
      props: { rows: [], highlighted: null, line: 'Loading files…' },
    },
  ],
})

/**
 * The place of the list of `@`, registered with Mokly. The composer
 * supplies the list and the box in the `children` slot.
 */
export const mentionAnchor = defineComponent({
  slug: 'mention-anchor',
  title: 'Mention anchor',
  description:
    'The place of the list of `@`: just above the message box, over the chat. The composer supplies the list and the box, so its own page shows the empty place.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['children'],
  render: (props) => <MentionAnchor>{props.children}</MentionAnchor>,
})
