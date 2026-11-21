import { defineComponent } from '@mokly/mokly'
import { WorkspaceBody } from '../../../components/workspace/WorkspaceBody'

/**
 * The desktop workspace beside the sidebar, registered with Mokly. A
 * screen supplies each part in a slot, so these pages show the layout
 * without the content of a screen.
 */
export const workspaceBody = defineComponent({
  slug: 'workspace-body',
  title: 'Workspace body',
  description:
    'The desktop workspace beside the sidebar: the centre column with its header, its tabs, and the open session or file, then the right column with the pull request, the file lists, and the tools. When the user hides the right column, the centre column takes its width. The screen supplies each part, so its own page shows the empty layout.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The width of the right column while the user drags its handle. */
      rightWidth: { type: 'number', minimum: 0 },
      /** The share of the file lists while the user drags the split. */
      filesShare: { type: 'number', minimum: 0, maximum: 100 },
      /** The user hid the right column with the toggle of the header. */
      rightHidden: { type: 'boolean' },
    },
  } as const,
  slots: ['header', 'tabs', 'center', 'pullRequest', 'files', 'tools'],
  render: (props) => (
    <WorkspaceBody
      center={props.center}
      files={props.files}
      filesShare={props.filesShare}
      header={props.header}
      pullRequest={props.pullRequest}
      rightHidden={props.rightHidden}
      rightWidth={props.rightWidth}
      tabs={props.tabs}
      tools={props.tools}
    />
  ),
  variants: [
    {
      slug: 'right-hidden',
      title: 'Right column hidden',
      description: 'The centre column takes the width of the hidden column.',
      props: { rightHidden: true },
    },
  ],
})
