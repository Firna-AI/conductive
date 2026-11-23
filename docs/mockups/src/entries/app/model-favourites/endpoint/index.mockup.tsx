import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const modelFavouritesEndpoint = defineScreen({
  title: 'A favourite that the endpoint leaves out',
  description:
    "The Claude login of Cal runs on Cal's proxy, whose model list does not name Fable 5.1, as app/account/endpoint-models shows. In a session of Cal, Cal writes the next message and opens the picker. The menu lists four favourites. It leaves out Fable 5.1 Low, because the pickers of Cal hide Fable 5.1. All models leaves out Fable 5.1 too, as app/chat/endpoint-models shows. The favourite stays saved, and Preferences shows it greyed, as app/model-favourites/preferences/hidden shows.",
  rationale:
    'A design call of 20 November 2026: a favourite whose model the model list no longer holds, or that the own endpoint of the member does not list, stays saved, and the menu leaves it out, as the pickers hide such models (decision 10 G of the own endpoint plan). So a pick never fails on a model that the endpoint does not list, and the favourite comes back when the list names its model again. Every picker on the org login follows the list of the org endpoint (decision 3 A of the org logins plan), so the menu of a session on that login leaves out such a favourite too, as app/chat/endpoint-models/org shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker-unlisted' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
