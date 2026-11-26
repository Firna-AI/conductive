import { defineComponent } from '@mokly/mokly'
import { FileMentionList } from '../../../components/chat/FileMentionList'
import { roomAboveSchema, withRoomAbove } from '../common/ownPages'
import { mentionTrees } from './composerSchemas'

/**
 * The list of `@` of the mockups, registered with Mokly. Its pages show the
 * matches of a query, a tree that loads, no tree, no match, and no match in
 * a limited tree. The list opens above its place, so its own pages give it
 * room above.
 */
export const fileMentionList = defineComponent({
  slug: 'file-mention-list',
  title: 'File mention list',
  description:
    'The list of `@` of the mockups for the query after the last `@` of the draft: the files and folders of the sample tree that match, with the first row highlighted. One line takes the place of the rows while the tree loads, when the cloud computer could not read the files, and when nothing matches. In a limited tree, that line also says that some files are not listed. Its own page shows the matches of "addr".',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['query', 'tree'],
    properties: {
      /** The text after the last `@` of the draft. */
      query: { type: 'string' },
      tree: { enum: mentionTrees },
      roomAbove: roomAboveSchema,
    },
  } as const,
  props: { query: 'addr', tree: 'latest', roomAbove: true },
  render: (props) =>
    withRoomAbove(
      <FileMentionList query={props.query} tree={props.tree} />,
      props.roomAbove,
    ),
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description: 'The tree still loads.',
      props: { tree: 'loading' },
    },
    {
      slug: 'unavailable',
      title: 'No tree',
      description:
        'The cloud computer could not read the files, and no list was saved.',
      props: { tree: 'unavailable' },
    },
    {
      slug: 'no-match',
      title: 'No match',
      description: 'Nothing matches the query.',
      props: { query: 'zipcode' },
    },
    {
      slug: 'limited',
      title: 'No match in a limited tree',
      description:
        'The limited tree of a large branch leaves out tsconfig.json, so nothing matches "tsconfig". The line says that some files are not listed, and asks the member to type the path or to ask the agent.',
      props: { query: 'tsconfig', tree: 'limited' },
    },
  ],
})
