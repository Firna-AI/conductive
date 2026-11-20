import { defineComponent } from '@mokly/mokly'
import { FileLinkText, MentionChip } from '../../../components/chat/MentionChip'

/** A line target at the end of a path, as `LineTarget`: its first and last line. */
const lineSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['start', 'end'],
  properties: {
    start: { type: 'integer', minimum: 1 },
    end: { type: 'integer', minimum: 1 },
  },
} as const

const fileEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'name', 'kind', 'change'],
  properties: {
    path: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    kind: { enum: ['file', 'directory'] },
    change: { const: null },
  },
} as const

/** The hook of the branch, which opens in its tab. */
const hook = {
  path: 'src/app/checkout/useAddressAutocomplete.ts',
  name: 'useAddressAutocomplete.ts',
  kind: 'file',
  change: null,
} as const

/**
 * A file or a folder of the tree in a text, registered with Mokly. Text
 * of a chat keeps the plain chip, because its parts have no key that stays
 * the same, and a text can name the same path twice.
 */
export const mentionChip = defineComponent({
  slug: 'mention-chip',
  title: 'Mention chip',
  description:
    'The chip of a file or a folder of the tree in a text: a mention, or inline code of an answer whose whole text is a path. A line target adds `:42` or `:42-50` to its name and to its title, and a press opens the file at the lines. A press on a file opens its tab, when the mockups draw it. Its own page shows a mention of the hook of the branch.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['part'],
    properties: {
      /** The file or folder reference, as `FilePart`. */
      part: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'entry', 'source', 'lines'],
        properties: {
          kind: { const: 'file' },
          entry: fileEntrySchema,
          /** The mention or the code as the text has it. */
          source: { type: 'string' },
          lines: { anyOf: [lineSchema, { const: null }] },
        },
      },
    },
  } as const,
  props: {
    part: { kind: 'file', entry: hook, source: `@${hook.path}`, lines: null },
  },
  render: (props) => <MentionChip part={props.part} />,
  variants: [
    {
      slug: 'lines',
      title: 'At lines',
      description:
        'A path of an answer with a line target: the lines after the name, and a press opens the file at the lines.',
      props: {
        part: {
          kind: 'file',
          entry: hook,
          source: `${hook.path}:19-22`,
          lines: { start: 19, end: 22 },
        },
      },
    },
    {
      slug: 'folder',
      title: 'Folder',
      description: 'A mention of a folder, which no view opens.',
      props: {
        part: {
          kind: 'file',
          entry: {
            path: 'src/app/checkout',
            name: 'checkout',
            kind: 'directory',
            change: null,
          },
          source: '@src/app/checkout/',
          lines: null,
        },
      },
    },
  ],
})

/**
 * A Markdown link of an answer to a file of the tree, registered with
 * Mokly. Text of a chat keeps the plain link, as it keeps its chips.
 */
export const fileLinkText = defineComponent({
  slug: 'file-link-text',
  title: 'File link text',
  description:
    'A Markdown link or image of an answer to a file of the tree: a normal link with its label, which opens the file as its chip does, when the mockups draw that page. Its title is the path. Its own page shows a link to the hook of the branch.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['entry', 'label'],
    properties: {
      entry: fileEntrySchema,
      label: { type: 'string' },
      lines: lineSchema,
    },
  } as const,
  props: { entry: hook, label: 'the hook' },
  render: ({ entry, label, lines }) => (
    <FileLinkText entry={entry} lines={lines ?? null}>
      {label}
    </FileLinkText>
  ),
  variants: [
    {
      slug: 'not-drawn',
      title: 'Page not drawn',
      description:
        'A link to a file whose page the mockups do not draw, such as the screenshot of an answer: the label in the style of a link, with the path as its title.',
      props: {
        label: 'Postcode field on a phone',
        entry: {
          path: '.context/shots/before.png',
          name: 'before.png',
          kind: 'file',
          change: null,
        },
      },
    },
  ],
})
