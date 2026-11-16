import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const newRoutine = defineScreen({
  title: 'New routine',
  description:
    'New routine opens an empty routine. Its name says Untitled routine, it is active, and it uses the first repository and the General section. It has no trigger yet, and the prompt asks what the routine should do. Save is the only action, and it stays off until the prompt has text. The Runs list says No runs yet, and a phone shows no tabs until the first save.',
  rationale:
    'An empty name saves as Untitled routine, as in Conductor. A routine can have no trigger, because Run now still starts it. A run without a prompt has no task, so Save stays off until the prompt has text, as the user chose in decision 511 B. Run now and Delete come after the first save.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, routine: 'new', runs: 'none' },
  useCasePaths: ['user-flows/create-routine'],
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'org-login',
      title: 'Runs on the org login',
      description:
        'Priya, a member of Acme, opens New routine, so the new routine is hers. She has no Claude login of her own, and Acme has an org login for Claude. The line under the prompt says "Runs use Acme\'s Claude login and your GitHub access." The form has no notice that asks to connect Claude, and no other change. Save stays off until the prompt has text, as for any new routine.',
      rationale:
        'The user chose decision 5 A of the org logins plan on 16 November 2026: a run takes the default login of the owner of its routine, as a new session of the owner does: the own login, or else the org login. While "Use for every member" is on, the org login comes first, from decision 7 B, and the line names it in the same way. The org login then pays for runs that no person watches, so the line names it before the first save. The runs keep the GitHub access of the owner, by decision 50, so their pushes show as Priya. When an admin removes the org login, a later run takes the next default login of Priya, or it fails as the run of an owner without a login, as app/routines/runs/failed shows. Decision 5 A adds no control to the form.',
      props: { viewer: 'member', login: 'org' },
    },
    {
      slug: 'org-models',
      title: 'Models of the org endpoint',
      description:
        'The same new routine of Priya, with the model picker open. The Claude login of Acme runs on its gateway, whose model list does not name Fable 5.1. So the Claude group shows Opus 5.5 and Sonnet 5.5, without Fable 5.1, as the composer on that login does. The Codex group keeps both of its models.',
      rationale:
        'The user chose decision 3 A of the org logins plan on 16 November 2026: each picker of a session or a new session on the org login follows the last model list of the org endpoint. The routine form does the same as the composer, as app/chat/endpoint-models/org shows, so a run does not fail on a model that the list leaves out. Only an admin sees the list itself, on the Agents tab of the org settings, as app/org-settings/agents/endpoint-models shows.',
      props: { viewer: 'member', login: 'org', modelMenu: 'open' },
    },
  ],
})
