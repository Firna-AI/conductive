import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../screens/routineState'

const flow = ['user-flows/create-routine']

export const runs = defineScreen({
  title: 'Runs',
  description:
    'The newest 50 runs of the routine that reviews pull requests: queued, starting, working, needs input, done and unread, ready, stopped, and archived, then older runs. Each run shows its trigger, its pull request, its time, and its state. A run with a workspace opens it from its row. Older runs exist, so Show older runs ends the list. A phone shows the runs on the Runs tab.',
  rationale:
    'Each run opens a new workspace, from decision 501 A, so a run takes the state of its workspace and the same mark as the workspace list. A queued run has no workspace yet. The pull request of a run opens on GitHub, from option D of decision 505, which the design adds to the chosen A. The run of PR opened #482 opens its workspace. The list holds the newest 50 runs, so that each read every 10 seconds stays small, and Show older runs reaches the rest.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, tab: 'runs' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Failed runs',
      description:
        "A failed run for each cause, among runs that did not fail. A check before the create failed two runs, so they have no workspace: the Claude login of the owner is not connected, and the GitHub access of the owner expired. Each says what failed, and the owner gets the one action that fixes it. The run of PR opened #486 failed its first start, and the run of PR pushed #486 failed its first turn. Each kept its workspace, and its row opens it, with Try again. The failed start shows the cross of its workspace. The oldest failed run used Codex, before Cal moved the routine to Claude, so its row still names Codex and offers Connect Codex. The run of PR opened #485 finished its first turn, and later its workspace could not resume, so it shows Couldn't start.",
      rationale:
        'The app checks the logins of the owner before each create, so a run fails before it spends a start, and the Runs list names the real cause. A failed first start and a failed first turn keep their workspace, from option D of decision 130 and option B of decision 512, and the run stays failed after Try again. The words come from the cause that the app stored, and from the agent and the owner of the run itself, so a later change of the routine changes no past row. A failed first turn shows as failed, because the state of its workspace would hide the failure. A routine turns off only after three runs in a row fail, from decision 513 B. The run of PR opened #487 did not fail, so this routine stays on.',
      props: { runs: 'failed' },
    },
    {
      slug: 'skipped',
      title: 'Skipped runs',
      description:
        'Two events that started no run: a pull request that an account outside Acme opened, and a push of github-actions[bot] to the pull request of a member. Each shows its reason. An author whom the filter leaves out shows no row.',
      rationale:
        'The user chose option C of decision 506. The Runs list shows a skipped run for an author or a sender outside the org, and nothing for an author whom the owner left out, because the owner chose that.',
      props: { runs: 'skipped' },
    },
    {
      slug: 'saved',
      title: 'Saved, no runs yet',
      description:
        'Morning summary after its first save: Weekdays at 09:00 in Europe/London, and no runs yet. Run now starts a run at once. A phone shows the Routine tab.',
      rationale:
        'Only the owner uses Run now, because a run spends the logins of the owner. Run now also works while the routine is off, so the owner can test it before its schedule runs.',
      props: { routine: 'morning-summary', runs: 'none', tab: 'routine' },
      useCasePaths: flow,
    },
    {
      slug: 'run-now',
      title: 'Run now',
      description:
        'Run now started the first run of Morning summary. Its workspace starts, and the row opens it.',
      props: { routine: 'morning-summary', runs: 'run-now' },
      useCasePaths: flow,
    },
  ],
})
