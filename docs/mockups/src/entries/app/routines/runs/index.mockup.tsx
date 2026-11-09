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
    'The runs of the routine that reviews pull requests, newest first: queued, starting, working, needs input, done and unread, ready, stopped, and archived. Each run shows its trigger, its pull request, its time, and its state. A run with a workspace opens it from its row. A phone shows the runs below the form.',
  rationale:
    'Each run opens a new workspace, from decision 201 A, so a run takes the state of its workspace and the same mark as the workspace list. A queued run has no workspace yet. The pull request of a run opens on GitHub, from option D of decision 205, which the design adds to the chosen A. The run of PR opened #482 opens its workspace.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, focus: 'runs' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Failed runs',
      description:
        "A failed run for each cause: the Claude login of the owner is not connected, the GitHub access of the owner expired, and the cloud computer did not start. Each says what failed, and the owner gets the one action that fixes it. A run whose cloud computer could not start a second time keeps its workspace, which shows Couldn't start.",
      rationale:
        'The app checks the logins of the owner before each create, so a run fails before it spends a start, and the Runs list names the real cause. A failed first start removes its workspace, so the run keeps the saved cause. The routine stays on after a failure.',
      props: { runs: 'failed' },
    },
    {
      slug: 'skipped',
      title: 'Skipped runs',
      description:
        'Two events that started no run: a pull request that an account outside Acme opened, and a push of github-actions[bot] to the pull request of a member. Each shows its reason. An author whom the filter leaves out shows no row.',
      rationale:
        'The user chose option C of decision 206. The Runs list shows a skipped run for an author or a sender outside the org, and nothing for an author whom the owner left out, because the owner chose that.',
      props: { runs: 'skipped' },
    },
    {
      slug: 'saved',
      title: 'Saved, no runs yet',
      description:
        'Morning summary after its first save: Weekdays at 09:00 in Europe/London, and no runs yet. Run now starts a run at once.',
      rationale:
        'Only the owner uses Run now, because a run spends the logins of the owner. Run now also works while the routine is off, so the owner can test it before its schedule runs.',
      props: { routine: 'morning-summary', runs: 'none', focus: 'form' },
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
