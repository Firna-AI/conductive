import { defineComponent } from '@mokly/mokly'
import { ChatPane } from '../../../components/chat/ChatPane'
import { foldStates } from '../../../components/chat/WorkFold'
import { plainData } from '../../../defined'
import { defaultChoice } from '../../../fixtures/agents'
import { conversations } from '../../../fixtures/conversations'
import { creatingLog } from '../../../fixtures/starting'
import { personKeys } from '../layout/railSchemas'
import { viewports } from '../common/viewports'
import {
  sandboxNoticeSchema,
  startingLogSchema,
} from '../workspace/sandboxSchemas'
import { withComposerPanel } from './capabilitiesSlot'
import { chatItemSchema } from './chatItemSchemas'
import { composerStateSchema } from './composerSchemas'

/** An empty message box with the default model. */
const composer = {
  choice: defaultChoice,
  running: false,
  draft: '',
  attachments: [],
} as const

/**
 * The chat transcript with its composer, registered with Mokly. A screen
 * supplies the content of an empty chat, the notice above the composer,
 * and the open Capabilities control of the composer in slots. A screen
 * that draws a screen of another viewport passes `viewport`. Without it, a
 * page of the part draws the layout of its own view.
 */
export const chatPane = defineComponent({
  slug: 'chat-pane',
  title: 'Chat pane',
  description:
    'The chat transcript, with the composer or a sandbox bar under it. When a turn ends, the work before each of its answers folds into one line. While the sandbox starts, its steps show at the end of the transcript. The commands that wait for approval on a Mac and the requests for secrets while their tool calls wait stay in view just above the composer. A request that outlived its tool call stays at its place, as a late request. An empty chat shows the content that the screen supplies. Its own page shows the finished turn of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['items', 'composer', 'viewer'],
    properties: {
      items: { type: 'array', items: chatItemSchema },
      composer: composerStateSchema,
      /** The sandbox is not running: its bar, in place of the composer. */
      problem: sandboxNoticeSchema,
      /** The steps of a start of the sandbox. */
      starting: startingLogSchema,
      /** The person signed in, who reads the transcript. */
      viewer: { enum: personKeys },
      /** How the folds of the ended turns show. */
      fold: { enum: foldStates },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  slots: ['empty', 'notice', 'capabilitiesPanel'],
  props: { items: plainData(conversations.history), composer, viewer: 'cal' },
  render: (props, context) => (
    <ChatPane
      composer={withComposerPanel(props.composer, props.capabilitiesPanel)}
      empty={props.empty}
      fold={props.fold}
      items={props.items}
      notice={props.notice}
      problem={props.problem}
      starting={props.starting}
      viewer={props.viewer}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Turn running',
      description:
        'A turn runs: the newest run of tool calls is open, and Stop shows in the composer.',
      props: {
        items: plainData(conversations.running),
        composer: { ...composer, running: true },
      },
    },
    {
      slug: 'empty',
      title: 'Empty',
      description:
        'A new session without messages shows the content of the screen.',
      props: { items: [] },
      slots: { empty: 'The content of an empty chat, from the screen.' },
    },
    {
      slug: 'starting',
      title: 'Sandbox starting',
      description: 'The steps of the start of the sandbox end the transcript.',
      props: { items: [], starting: creatingLog },
    },
    {
      slug: 'stopped',
      title: 'Sandbox stopped',
      description:
        'The bar of a stopped sandbox takes the place of the composer.',
      props: { problem: { problem: 'stopped' } },
    },
  ],
})
