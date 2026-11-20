import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../screens/automationState'

const flow = ['user-flows/create-automation']

export const runs = defineScreen({
  title: 'Runs',
  description:
    'The newest 50 runs of the automation that reviews pull requests: queued, starting, working, needs input, done and unread, ready, stopped, and archived, then older runs. Each run shows its trigger, its pull request, its time, and its state. A run with a workspace opens it from its row. Older runs exist, so Show older runs ends the list. A phone shows the runs on the Runs tab.',
  rationale:
    'Each run opens a new workspace, from decision 501 A, so a run takes the state of its workspace and the same mark as the header of that workspace. A queued run has no workspace yet. The pull request of a run opens on GitHub, from option D of decision 505, which the design adds to the chosen A. The run of PR opened #482 opens its workspace. The list holds the newest 50 runs, so that each read every 10 seconds stays small, and Show older runs reaches the rest.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, tab: 'runs' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Failed runs',
      description:
        "A failed run for each cause, among runs that did not fail. A check before the create failed two runs, so they have no workspace: the Claude login of the owner is not connected, and the GitHub access of the owner expired. Each says what failed, and the owner gets the one action that fixes it. The run of PR opened #486 failed its first start, and the run of PR pushed #486 failed its first turn. Each kept its workspace, and its row opens it, with Try again. The failed start shows the cross of its workspace. The oldest failed run used Codex, before Cal moved the automation to Claude, so its row still names Codex and offers Connect Codex. The run of PR opened #485 finished its first turn, and later its workspace could not resume, so it shows Couldn't start. The cloud computer stopped the first turn of the run of PR pushed #483, and it stopped again a few minutes after the agent continued, so no further turn continued the work. That run failed, and its row says that a message in the workspace continues the work. A stop after the 30 days of a chain of turns gives the same row. The cloud computer also stopped the first turn of the run of PR pushed #481, while Cal's Claude login was gone, so no turn continued the work. That run failed for the login, with the words and the action of the failed login check, and it kept its workspace. The cloud computer also stopped the first turn of the run of PR pushed #480, and the turn that continued the work finished, so that run did not fail.",
      rationale:
        'The app checks the logins of the owner before each create, so a run fails before it spends a start, and the Runs list names the real cause. A run of an owner without a Claude login of their own runs on the org login when the org has one, from decision 5 A of the org logins plan of 16 November 2026, so only an owner whom no login serves gets this failure. A failed first start and a failed first turn keep their workspace, from option D of decision 130 and option B of decision 512, and the run stays failed after Try again. The words come from the cause that the app stored, and from the agent and the owner of the run itself, so a later change of the automation changes no past row. A failed first turn shows as failed, because the state of its workspace would hide the failure. The user chose D of decision 6 of the continuation plan on 20 November 2026: a run takes the outcome of the last turn of the chain of its first turn, and a chain that ends with no turn to continue it fails the run. A lost login keeps the cause of the login, so the owner reads what to fix and gets Connect Claude. The rule of 15 minutes and the end of the 30 days give the new cause cloud_computer_stopped. Its words name what stopped, not the limit, as the stopped line of the chat does. They also say what to do, because a stopped turn has no Try again. An automation turns off only after three runs in a row fail, from decision 513 B, and a chain that ends with no turn to continue it counts. The runs of PR opened #487, PR opened #485, and PR pushed #480 did not fail, so no three runs in a row failed, and this automation stays on.',
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
        'Morning summary after its first save: Weekdays at 09:00 in Europe/London, and no runs yet. Run now starts a run at once. A phone shows the Automation tab.',
      rationale:
        'Only the owner uses Run now, because a run spends the logins of the owner. Run now also works while the automation is off, so the owner can test it before its schedule runs.',
      props: { automation: 'morning-summary', runs: 'none', tab: 'automation' },
      useCasePaths: flow,
    },
    {
      slug: 'run-now',
      title: 'Run now',
      description:
        'Run now started the first run of Morning summary. Its workspace starts, and the row opens it.',
      props: { automation: 'morning-summary', runs: 'run-now' },
      useCasePaths: flow,
    },
  ],
})
