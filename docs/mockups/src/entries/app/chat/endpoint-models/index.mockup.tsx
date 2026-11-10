import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatEndpointModels = defineScreen({
  title: 'Models on an own endpoint',
  description:
    'Proposal for option G of decision 10 of the own endpoint plan, not chosen yet. The Claude login of Cal runs on Cal\'s proxy, whose model list does not name Fable 5.1, as app/account/endpoint-models shows. In a session of Cal, Cal writes the next message and opens the picker. Fable 5.1 says "Not listed" in a muted colour, and it stays a choice, as each other model does. The picker keeps the models of the app, and it gets no models from the endpoint.',
  rationale:
    'The mark is soft and never blocks a choice, because the list of a gateway need not name every model that it serves. It shows only in the pickers of the owner of the login, so the session record does not change, and a member in a session of Cal sees no mark. "Not listed" uses the verb of the account page, which says "This endpoint does not list Fable 5.1".',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker-unlisted' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'not-served',
      title: 'Model not served',
      description:
        'Proposal for option G of decision 10 of the own endpoint plan, not chosen yet. Cal chose Fable 5.1 and sent the message. The proxy does not serve that model, so the turn stopped before any work. The notice says "The endpoint of this login does not serve claude-fable-5-1. Choose another model." It names the model ID and no host. The picker still shows Fable 5.1, the model of the turn. Try again sends the same message again on that model, for example after Cal adds the model to the endpoint.',
      rationale:
        'Every member sees the same chat, so the failure names the missing model ID for every member, also for a member whose picker has no mark. The chat window never shows the host of an endpoint, as decision 5 says since 10 November 2026, so the failure names the model and not the host. The words follow the other failures of a turn, such as "The selected model is unavailable. Choose another model.": what failed, then one action. The ID is the exact name that the endpoint did not serve.',
      props: { composer: 'empty', conversation: 'model-not-served' },
    },
    {
      slug: 'member',
      title: 'Model not served, for a member',
      description:
        'Proposal for option G of decision 10 of the own endpoint plan, not chosen yet. Priya, a member of Acme, opens the session of Cal after the turn that stopped. The bar says "Cal\'s login", and the notice says the same as for Cal: "The endpoint of this login does not serve claude-fable-5-1. Choose another model." It names no host. The picker of Priya has no marks, because they come from the list of the login of Cal, which only Cal sees.',
      props: {
        composer: 'empty',
        conversation: 'model-not-served',
        viewer: 'member',
      },
    },
  ],
})
