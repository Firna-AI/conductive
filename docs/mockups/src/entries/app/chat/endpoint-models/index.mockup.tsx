import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatEndpointModels = defineScreen({
  title: 'Models on an own endpoint',
  description:
    "Cal chose option G of decision 10 of the own endpoint plan on 10 November 2026: the pickers of the owner of a login hide each model that its endpoint does not list. The Claude login of Cal runs on Cal's proxy, whose model list does not name Fable 5.1, as app/account/endpoint-models shows. In a session of Cal, Cal writes the next message, opens the picker, and opens All models. In All models, the Claude group shows Opus 5.5 and Sonnet 5.5, without Fable 5.1. The Codex group keeps both of its models, because the list names every Codex model of the app. The menu leaves out the favourite Fable 5.1 Low too, as app/model-favourites/endpoint shows. A phone shows All models in place of the menu. The picker keeps the models of the app, and it gets no models from the endpoint.",
  rationale:
    'Cal chose to hide each model that the list does not name, in place of the soft mark that option G first had, so the picker offers only models that the endpoint lists. The cost is that a model that the endpoint serves but does not list is hidden too, so the Agents tab names each hidden model, with its ID and Refresh. Every picker of the owner of the login follows its list: the composer, New workspace, automations, and the default model in Preferences. The pickers of other members do not, so the session record does not change, and a member in a session of Cal sees every model of the app. On an org login, every picker follows the list of the org endpoint, from decision 3 A of the org logins plan, as the org variant shows. The picker of a session keeps its current model, also when the list no longer names it, as the not-served variant shows. A favourite on a hidden model stays saved, and the menu leaves it out, from a design call of 20 November 2026 of the model favourites.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker-unlisted', allModels: 'open' },
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
    {
      slug: 'org',
      title: 'Models of the org endpoint',
      description:
        'Address autocomplete runs on the Claude login of Acme, whose gateway does not list Fable 5.1, as app/org-settings/agents/endpoint-models shows. Priya, a member of Acme, writes the next message, opens the picker, and opens All models. The bar says "Acme\'s login". In All models, the Claude group shows Opus 5.5 and Sonnet 5.5, without Fable 5.1. The Codex group keeps both of its models. The menu leaves out her favourite Fable 5.1 Low too.',
      rationale:
        'The user chose decision 3 A of the org logins plan on 16 November 2026: each picker of a session or a new session on the org login follows the last model list of the org endpoint, as the picker of the owner of a personal endpoint does. So every member picks only models that the endpoint lists, and a turn does not fail on a model that the list leaves out. Only an admin sees the list itself and Refresh, on the Agents tab of the org settings. A session keeps its current model, also when the list no longer names it. The automation form does the same, as app/automations/automation/new/org-models shows. The favourites menu is part of each picker, so it leaves out each favourite on a model that the list does not name, from a design call of 20 November 2026 of the model favourites.',
      props: { composer: 'picker-unlisted', viewer: 'member', login: 'org' },
    },
  ],
})
