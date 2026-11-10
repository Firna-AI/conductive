import { defineScreen } from '@mokly/mokly'
import {
  AccountScreen,
  accountGeneral,
  accountSchema,
} from '../../../../screens/AccountScreen'

export const accountEndpointModels = defineScreen({
  title: 'Model list of an own endpoint',
  description:
    'Proposal for option G of decision 10 of the own endpoint plan, not chosen yet. Claude and Codex both run on Cal\'s proxy. The app read the model list of the proxy, and the list does not name Fable 5.1, a Claude model of the app. Under "Own endpoint at proxy.example.com", the Claude row says "This endpoint does not list Fable 5.1". The line under it gives the model ID and the time of the last read: "Its model ID is claude-fable-5-1. Checked 4 minutes ago." Refresh reads the list again. The list names every Codex model of the app, so the Codex row has no such line. With more missing models, the same line names each one.',
  rationale:
    'Option G keeps the model list of the app, so the picker keeps its size and gets no models from the endpoint. The Worker reads the list of the endpoint, GET /v1/models, when Cal saves the login and when Cal presses Refresh. It also reads the list again in the background when a turn on the login starts, at most once every 10 minutes, so the line follows the endpoint with no Refresh. A read that fails keeps the last list and its time. The words say "does not list", not "does not serve", because the list of a gateway need not name every model that it serves. So Fable 5.1 stays a choice in the picker, with a soft mark, as app/chat/endpoint-models shows. The line gives the model ID, because the owner needs the exact ID to add the model to the endpoint. The list belongs to the login of its owner, so the line sits beside that login, and only the owner sees it. When the list names every model of the app, the row shows no line, as app/account/own-endpoint/connected shows.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, ownEndpoint: 'unlisted' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
})
