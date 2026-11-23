import { defineComponent } from '@mokly/mokly'
import { RightColumn } from '../../../../../../src/ui/components/workspace/RightColumn'

/**
 * The column beside the chat, registered with Mokly. A screen supplies the
 * pull request bar, the file lists, and the tools panel in slots, so these
 * pages show the column and its handles without them.
 */
export const rightColumn = defineComponent({
  slug: 'right-column',
  title: 'Right column',
  description:
    'The column beside the chat: the pull request bar, the file lists, and the tools panel below them. A handle on its inner edge resizes it, and a second handle on the top edge of the tools panel moves the split between the file lists and the tools. Without tools, the files part fills the column, as for an archived workspace. The screen supplies each part, so its own page shows the empty column.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The width in px while the user drags the handle. */
      width: { type: 'number', minimum: 0 },
      /** The share of the file lists in percent while the user drags the split. */
      filesShare: { type: 'number', minimum: 0, maximum: 100 },
      /** The user hid the column with the toggle of the header. */
      hidden: { type: 'boolean' },
    },
  } as const,
  slots: ['pullRequest', 'files', 'tools'],
  render: (props) => (
    <RightColumn
      files={props.files}
      filesShare={props.filesShare}
      hidden={props.hidden}
      pullRequest={props.pullRequest}
      tools={props.tools}
      width={props.width}
    />
  ),
  variants: [
    {
      slug: 'resize',
      title: 'Resize',
      description: 'The column in the middle of a drag of its handle.',
      props: { width: 560 },
    },
    {
      slug: 'split',
      title: 'Split',
      description:
        'The tools panel with its handle, in the middle of a drag that raises the split.',
      props: { filesShare: 35 },
      slots: { tools: <span /> },
    },
  ],
})
