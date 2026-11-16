import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const standardSpeed = defineScreen({
  title: 'Standard speed',
  description:
    'Fast is on in the session of Checkout address autocomplete, and the trigger reads "Opus 5.5 High Fast". Claude reached its fast limit during the turn, so the turn ran at standard speed. The turn still finished, so it ends with its duration. Beside the duration, muted text with a gauge icon says "Standard speed · Fast limit reached", and the files of the turn follow under that line. A fast turn that ran at fast speed, and a turn without fast mode, end as any turn does, as app/fast-mode/trigger and app/chat show.',
  rationale:
    'The user chose D of fast mode decision 257 on 12 November 2026: each fast turn reports its speed at its end, and the end line of a fast turn that ran at standard speed shows "Standard speed" and the cause. A member who chose Fast then learns, beside the slow turn, why it was slower, as the end of a turn shows "Changed files unavailable" (decision 109). The note stands beside the duration, which it explains, and the files move under it, so the row of the files keeps its look. The dot joins the speed and the cause, as it joins the notes of a stopped turn. "Fast limit reached" are the words of Claude. The line gives no time until the limit resets, because it stays in the chat after the reset. Fast stays on, so the next turn runs fast again when the cause ends, such as after the cooldown of the limit.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'standard-speed-limit',
    modelChoice: 'fast',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'older-software',
      title: 'Older cloud computer software',
      description:
        'The cloud computer of the workspace resumed with older software, which ignores fast mode, so the turn ran at standard speed. Its end line says "Standard speed · Older cloud computer software". Each fast turn of this workspace ends in the same way. A new workspace whose cloud computer starts from a newer image runs fast.',
      rationale:
        'The software of a cloud computer comes from the image that it started from, so a cloud computer can resume weeks later with older software. That software reports no speed, so the turn counts as a turn at standard speed, with this cause. The words are those of the other places that name older software, such as "Previews need newer cloud computer software". The line gives no action, so that it stays short on each such turn.',
      props: { conversation: 'standard-speed-older' },
    },
    {
      slug: 'stopped',
      title: 'Stopped turn',
      description:
        'The user pressed Stop during a fast turn that ran at standard speed after Claude reached its fast limit. A stopped turn shows no file list, so its line ends with the words after a dot: "You stopped the agent · Standard speed · Fast limit reached".',
      rationale:
        'The end of a stopped turn gives its speed too, so its line names the speed and the cause, as it names "Changed files unavailable" (decision 109). The speed comes before the notes of the files, as it stands before the files of a finished turn.',
      props: { conversation: 'standard-speed-stopped', banner: 'none' },
    },
  ],
})
