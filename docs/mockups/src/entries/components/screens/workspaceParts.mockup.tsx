import { defineComponent } from '@mokly/mokly'
import { FilesContent, ToolContent } from '../../../screens/workspaceParts'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'
import { viewports } from '../common/viewports'

/** The props of a part of the workspace screen: its state and viewport. */
const stateProperties = {
  /** The state of the workspace screen, as `WorkspaceState`. */
  state: workspaceStateSchema,
  /** The viewport of the screen, when it differs from the view. */
  viewport: { enum: viewports },
} as const

/**
 * The files panel of the workspace screen, registered with Mokly. A screen
 * that draws a screen of another viewport passes `viewport`. Without it, a
 * page of the part draws the layout of its own view.
 */
export const filesContent = defineComponent({
  slug: 'files-content',
  title: 'Files content',
  description:
    'The files of the workspace screen in a state: All files, Changes, or Checks, or the sandbox state in place of a list while the sandbox cannot give it. On a phone, an open file shows as a page of the Files tab. An archived workspace has no file lists. A phone supplies the actions of the pull request bar for the top of the Checks tab. Its own page shows the Changes of the ready workspace.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: stateProperties,
  } as const,
  slots: ['checksTop'],
  props: { state: readyWorkspace },
  render: (props, context) => (
    <FilesContent
      checksTop={props.checksTop}
      state={props.state}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'all-files',
      title: 'All files',
      description: 'The tree of All files.',
      props: { state: { ...readyWorkspace, files: 'all' } },
    },
    {
      slug: 'archived',
      title: 'Archived',
      description: 'The panel of an archived workspace, without file lists.',
      props: {
        state: { ...readyWorkspace, sandbox: 'archived', archive: 'kept' },
      },
    },
  ],
})

/**
 * The tool of the tools panel of the workspace screen, registered with
 * Mokly. A screen that draws a screen of another viewport passes
 * `viewport`. Without it, a page of the part draws the layout of its own
 * view.
 */
export const toolContent = defineComponent({
  slug: 'tool-content',
  title: 'Tool content',
  description:
    'The tool of the tools panel in a state: Terminal, Preview, or Desktop, or the sandbox state while the sandbox is down. Its own page shows the Terminal of the ready workspace.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: stateProperties,
  } as const,
  props: { state: readyWorkspace },
  render: (props, context) => (
    <ToolContent
      state={props.state}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'preview',
      title: 'Preview',
      description: 'The Preview tool.',
      props: { state: { ...readyWorkspace, tool: 'preview' } },
    },
    {
      slug: 'stopped',
      title: 'Sandbox stopped',
      description: 'The sandbox state in place of the tool.',
      props: { state: { ...readyWorkspace, sandbox: 'stopped' } },
    },
  ],
})
