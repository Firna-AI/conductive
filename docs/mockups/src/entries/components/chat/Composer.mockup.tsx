import { defineComponent } from '@mokly/mokly'
import { Composer } from '../../../components/chat/Composer'
import { plainData } from '../../../defined'
import { defaultChoice } from '../../../fixtures/agents'
import {
  attachmentDraft,
  draftAttachments,
} from '../../../fixtures/attachments'
import { mentionDrafts } from '../../../fixtures/fileMentions'
import { roomAboveSchema, withRoomAbove } from '../common/ownPages'
import { withPanel } from './capabilitiesSlot'
import { composerRequired, composerStateProperties } from './composerSchemas'

/** An empty message box with the default model. */
const empty = {
  choice: defaultChoice,
  running: false,
  draft: '',
  attachments: [],
} as const

/**
 * The message box of a chat, registered with Mokly. Its pages show an
 * empty box, a draft with files over a drop, a running turn, the list of
 * `@`, and the login of another member. The list of `@` opens above the
 * box, so its page gives it room above. A screen supplies the open
 * Capabilities control in the `capabilitiesPanel` slot.
 */
export const composer = defineComponent({
  slug: 'composer',
  title: 'Composer',
  description:
    'The message box: the text, with a chip for each attached file at its place, then a bar with the attach button, the Capabilities icon, the model picker, and Send. A phone holds Attach files and Capabilities in the menu of one button, and shows Stop as its icon. The whole box takes a drop of files and shows the drop state while files hover over it. While a turn runs, a message steers the turn, and Stop ends it. Send waits for the uploads of the files. When a message spends the login of another member or the org login, a label after the picker names it. `@` opens the list of the files and folders above the box. Its own page shows an empty box.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: composerRequired,
    properties: {
      ...composerStateProperties,
      /** The least number of lines of the text. */
      lines: { type: 'integer', minimum: 1 },
      roomAbove: roomAboveSchema,
    },
  } as const,
  slots: ['capabilitiesPanel', 'pickerPart'],
  props: empty,
  render: ({ roomAbove, capabilities, capabilitiesPanel, ...props }) =>
    withRoomAbove(
      <Composer
        {...props}
        capabilities={withPanel(capabilities, capabilitiesPanel)}
      />,
      roomAbove,
    ),
  variants: [
    {
      slug: 'drop',
      title: 'Drop over a draft',
      description:
        'A draft with two attached files while more files hover over the box.',
      props: plainData({
        draft: attachmentDraft,
        attachments: draftAttachments,
        drop: true,
      }),
    },
    {
      slug: 'running',
      title: 'Turn running',
      description: 'A turn runs, so a message steers it, and Stop ends it.',
      props: { running: true },
    },
    {
      slug: 'mention',
      title: 'List of @',
      description: 'The list of `@` above the box, for the query of the draft.',
      props: {
        draft: mentionDrafts.query,
        mention: 'latest',
        roomAbove: true,
      },
    },
    {
      slug: 'session-login',
      title: 'Login of another member',
      description:
        'A message spends the login of the starter, so a label after the picker names it.',
      props: {
        draft: 'Show a loading state under the address line.',
        sessionLogin: { owner: 'Cal' },
      },
    },
  ],
})
