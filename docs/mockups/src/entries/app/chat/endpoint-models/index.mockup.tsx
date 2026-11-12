import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatEndpointModels = defineScreen({
  title: 'Models on an own endpoint',
  description:
    "Cal chose option G of decision 10 of the own endpoint plan on 10 November 2026: the pickers of the owner of a login hide each model that its endpoint does not list. The Claude login of Cal runs on Cal's proxy, whose model list does not name Fable 5.1, as app/account/endpoint-models shows. In a session of Cal, Cal writes the next message and opens the picker. The Claude group shows Opus 5.5 and Sonnet 5.5, without Fable 5.1. The Codex group keeps both of its models, because the list names every Codex model of the app. The picker keeps the models of the app, and it gets no models from the endpoint.",
  rationale:
    'Cal chose to hide each model that the list does not name, in place of the soft mark that option G first had, so the picker offers only models that the endpoint lists. The cost is that a model that the endpoint serves but does not list is hidden too, so the account page names each hidden model, with its ID and Refresh. Every picker of the owner of the login follows its list: the composer, New workspace, routines, and the default model in Preferences. The pickers of other members do not, so the session record does not change, and a member in a session of Cal sees every model of the app. The picker of a session keeps its current model, also when the list no longer names it, as the not-served variant shows.',
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
        'Cal chose option G of decision 10 of the own endpoint plan on 10 November 2026: the pickers of the owner of a login hide each model that its endpoint does not list. The session of Cal runs on Fable 5.1, which Cal chose while the list of the proxy still named it. Cal sent the next message on that model. The proxy no longer serves it, so the turn stopped before any work. The notice says "The endpoint of this login does not serve claude-fable-5-1. Choose another model." It names the model ID and no host. The picker still shows Fable 5.1, the model of the turn, because a session keeps its current model. Try again sends the same message again on that model, for example after Cal adds the model to the endpoint.',
      rationale:
        'Every member sees the same chat, so the failure names the missing model ID for every member, also for a member whose picker shows every model of the app. The chat window never shows the host of an endpoint, as decision 5 says since 10 November 2026, so the failure names the model and not the host. The words follow the other failures of a turn, such as "The selected model is unavailable. Choose another model.": what failed, then one action. The ID is the exact name that the endpoint did not serve.',
      props: { composer: 'empty', conversation: 'model-not-served' },
    },
    {
      slug: 'member',
      title: 'Model not served, for a member',
      description:
        'Cal chose option G of decision 10 of the own endpoint plan on 10 November 2026: the pickers of the owner of a login hide each model that its endpoint does not list. Priya, a member of Acme, opens the session of Cal after the turn that stopped. The bar says "Cal\'s login", and the notice says the same as for Cal: "The endpoint of this login does not serve claude-fable-5-1. Choose another model." It names no host. The picker of Priya hides no model, because only the pickers of the owner of a login follow its list, and only Cal sees that list.',
      props: {
        composer: 'empty',
        conversation: 'model-not-served',
        viewer: 'member',
      },
    },
  ],
})
