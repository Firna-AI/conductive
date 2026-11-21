import { defineComponent } from '@mokly/mokly'
import { FileMentionList } from '../../../components/chat/FileMentionList'
import { roomAboveSchema, withRoomAbove } from '../common/ownPages'
import { mentionTrees } from './composerSchemas'

/**
 * The list of `@` of the mockups, registered with Mokly. Its pages show the
 * matches of a query, a tree that loads, no tree, and no match. The list
 * opens above its place, so its own pages give it room above.
 */
export const fileMentionList = defineComponent({
  slug: 'file-mention-list',
  title: 'File mention list',
  description:
    'The list of `@` of the mockups for the query after the last `@` of the draft: the files and folders of the sample tree that match, with the first row highlighted. One line takes the place of the rows while the tree loads, when the cloud computer could not read the files, and when nothing matches. Its own page shows the matches of "addr".',
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
  ],
})
