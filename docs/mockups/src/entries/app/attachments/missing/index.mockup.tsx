import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsMissing = defineScreen({
  title: 'File no longer in the cloud computer',
  description:
    'Cal sent the message with the screenshot and the console log. Its first try got both files into the cloud computer, then failed because Claude was overloaded. The app then deleted its stored copy of each file. Later the screenshot left the cloud computer, for example because an agent deleted it. Cal pressed Try again, which sends the same text with the same files, so the chat shows the message again. Before the agent gets the message, the app checks that each file is still in the cloud computer. The screenshot is gone, so the turn stopped before any work: "postcode-overlap.png is no longer in the cloud computer. Attach it again in a new message." Try again stays, as on each failed turn, but it fails again until the file is back at its path. The first failure has no Try again. A press on the chip of the screenshot opens its file tab, which says "This file moved or was deleted", as app/chat/masked-paths/unnamed shows.',
  rationale:
    'The user chose option A of large-upload decision 3 on 12 November 2026: the app deletes its stored copy of each file once the cloud computer has it. So a later try of the message uses the copy in the cloud computer, and the app has no bytes to send again. The app checks that each copy is still at its path, with its size. When a copy is gone or its size changed, the turn fails and names the file. A new upload makes a new file, which only a new message can carry, so the words ask for a new message. Try again stays, because the member or an agent can put the file back at its path. The words and Try again are a design call of 12 November 2026. The chat keeps both tries, as after each Try again, and only the newest failed turn offers Try again.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'missing-file', composer: 'empty' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'two-files',
      title: 'Two files gone',
      description:
        'The same Try again, after both files left the cloud computer, for example because an agent deleted the folder of the attached files. The notice names both files in the order of the message: "postcode-overlap.png and checkout-console.log are no longer in the cloud computer. Attach them again in a new message."',
      rationale:
        'A design call of 13 November 2026: the notice names each file that is gone, so the member attaches all of them again in one new message. A notice that names only the first file was rejected, because the next try would then fail for the next file.',
      props: { conversation: 'missing-files' },
    },
  ],
})
