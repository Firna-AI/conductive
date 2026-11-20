import { defineComponent } from '@mokly/mokly'
import { FileLinkText, MentionChip } from '../../../components/chat/MentionChip'
import { mentionEntrySchema } from './chipSchemas'

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

/** The hook of the branch, which opens in its tab. */
const hook = {
  path: 'src/app/checkout/useAddressAutocomplete.ts',
  folder: false,
  preview: 'code',
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
      /** The mention, as `MentionPart`. */
      part: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'entry', 'source'],
        properties: {
          kind: { const: 'mention' },
          entry: mentionEntrySchema,
          /** The mention or the code as the text has it. */
          source: { type: 'string' },
          line: lineSchema,
          /** The part was inline code of an answer. */
          code: { const: true },
        },
      },
    },
  } as const,
  props: {
    part: { kind: 'mention', entry: hook, source: `@${hook.path}` },
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
          kind: 'mention',
          entry: hook,
          source: `${hook.path}:19-22`,
          line: { start: 19, end: 22 },
          code: true,
        },
      },
    },
    {
      slug: 'folder',
      title: 'Folder',
      description: 'A mention of a folder, which no view opens.',
      props: {
        part: {
          kind: 'mention',
          entry: { path: 'src/app/checkout', folder: true },
          source: '@src/app/checkout/',
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
    required: ['part'],
    properties: {
      /** The link, as `FileLinkPart`. */
      part: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'label', 'source', 'picture', 'entry'],
        properties: {
          kind: { const: 'file-link' },
          /** The label of the link. */
          label: { type: 'string' },
          /** The link as the text has it. */
          source: { type: 'string' },
          /** The Markdown image of a picture file, which can show as it. */
          picture: { type: 'boolean' },
          entry: mentionEntrySchema,
          line: lineSchema,
        },
      },
    },
  } as const,
  props: {
    part: {
      kind: 'file-link',
      label: 'the hook',
      source: `[the hook](${hook.path})`,
      picture: false,
      entry: hook,
    },
  },
  render: (props) => <FileLinkText part={props.part} />,
  variants: [
    {
      slug: 'not-drawn',
      title: 'Page not drawn',
      description:
        'A link to a file whose page the mockups do not draw, such as the screenshot of an answer: the label in the style of a link, with the path as its title.',
      props: {
        part: {
          kind: 'file-link',
          label: 'Postcode field on a phone',
          source:
            '![Postcode field on a phone](/home/user/code/storefront/.context/shots/after.png)',
          picture: true,
          entry: { path: '.context/shots/after.png', folder: false },
        },
      },
    },
  ],
})
