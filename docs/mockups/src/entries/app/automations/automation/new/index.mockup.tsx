import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const newAutomation = defineScreen({
  title: 'New automation',
  description:
    'New automation opens an empty automation. Its name says Untitled automation, it is active, and it uses the first repository and the General section. It has no trigger yet, and the prompt asks what the automation should do. Save is the only action, and it stays off until the prompt has text. The Runs list says No runs yet, and a phone shows no tabs until the first save.',
  rationale:
    'An empty name saves as Untitled automation, as Conductor saves Untitled routine. An automation can have no trigger, because Run now still starts it. A run without a prompt has no task, so Save stays off until the prompt has text, as the user chose in decision 511 B. Run now and Delete come after the first save.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, automation: 'new', runs: 'none' },
  useCasePaths: ['user-flows/create-automation'],
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'org-login',
      title: 'Runs on the org login',
      description:
        'Priya, a member of Acme, opens New automation, so the new automation is hers. She has no Claude login of her own, and Acme has an org login for Claude. The line under the prompt says "Runs use Acme\'s Claude login and your GitHub access." The form has no notice that asks to connect Claude, and no other change. Save stays off until the prompt has text, as for any new automation.',
      rationale:
        'The user chose decision 5 A of the org logins plan on 16 November 2026: a run takes the default login of the owner of its automation, as a new session of the owner does: the own login, or else the org login. While "Use for every member" is on, the org login comes first, from decision 7 B, and the line names it in the same way. The org login then pays for runs that no person watches, so the line names it before the first save. The runs keep the GitHub access of the owner, by decision 50, so their pushes show as Priya. When an admin removes the org login, a later run takes the next default login of Priya, or it fails as the run of an owner without a login, as app/automations/runs/failed shows. Decision 5 A adds no control to the form.',
      props: { viewer: 'member', login: 'org' },
    },
    {
      slug: 'org-models',
      title: 'Models of the org endpoint',
      description:
        'The same new automation of Priya, with the model picker open. The Claude login of Acme runs on its gateway, whose model list does not name Fable 5.1. So the menu lists four of her five favourites, without Fable 5.1 Low, and All models leaves out Fable 5.1, as the composer on that login does. Effort and the Fast switch follow. An automation has no session yet, so no favourite shows the external link icon.',
      rationale:
        'The user chose decision 3 A of the org logins plan on 16 November 2026: each picker of a session or a new session on the org login follows the last model list of the org endpoint. The automation form does the same as the composer, as app/chat/endpoint-models/org shows, so a run does not fail on a model that the list leaves out. Only an admin sees the list itself, on the Agents tab of the org settings, as app/org-settings/agents/endpoint-models shows. The prompt box shows the favourites menu, as each model picker does, from the design calls of 16 November 2026 of the model favourites, and it leaves out each favourite on a model that the list does not name.',
      props: { viewer: 'member', login: 'org', modelMenu: 'open' },
    },
  ],
})
