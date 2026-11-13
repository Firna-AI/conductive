import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../brand'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountAgents, accountSchema } from '../../../../screens/accountState'

export const accountEndpointModels = defineScreen({
  title: 'Model list of an own endpoint',
  description:
    'Cal chose option G of decision 10 of the own endpoint plan on 10 November 2026: the pickers of the owner of a login hide each model that its endpoint does not list. Claude and Codex both run on Cal\'s proxy. The app read the model list of the proxy, and the list does not name Fable 5.1, a Claude model of the app. Under "Own endpoint at proxy.example.com", the Claude row says "Fable 5.1 is hidden from your model pickers, because this endpoint does not list it." The line under it gives the model ID and the time of the last read: "Its model ID is claude-fable-5-1. Checked 4 minutes ago." Refresh reads the list again. The list names every Codex model of the app, so the Codex row has no such line. With more hidden models, the same line names each one.',
  rationale:
    'Option G keeps the model list of the app, so the picker gets no models from the endpoint. The Worker reads the list of the endpoint, GET /v1/models, when Cal saves the login and when Cal presses Refresh. It also reads the list again in the background when a turn on the login starts, at most once every 10 minutes, so the line follows the endpoint with no Refresh. A read that fails keeps the last list and its time. When that read was a save or a Refresh, the row warns, as app/account/endpoint-models/read-failed-unlisted shows. Cal chose to hide each model that the list does not name, in place of a soft mark, so the pickers of Cal offer only models that the endpoint lists, as app/chat/endpoint-models shows. Before the first read that works, the pickers hide nothing. When the list names no model of the app for an agent, the pickers show every model of that agent, so that each picker keeps a model, and the line says that the list names none of them. The words say "does not list", not "does not serve", because the list of a gateway need not name every model that it serves. A model that the endpoint serves but does not list is hidden too, so the line says why the model is missing from the pickers. The line gives the model ID, because the owner needs the exact ID to add the model to the endpoint. After Cal adds the model, Refresh brings it back to the pickers. The list belongs to the login of its owner, so the line sits beside that login, and only the owner sees it. When the list names every model of the app, the row shows no line, as app/account/own-endpoint/connected shows.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountAgents, ownEndpoint: 'unlisted' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'v1-added',
      title: 'Codex address saved with /v1',
      description: `Claude already runs on Cal's proxy, saved as https://proxy.example.com. Cal typed the same address in the form of Codex and pressed Connect. The proxy serves the OpenAI Responses API only under /v1: https://proxy.example.com/models gives no model list, and https://proxy.example.com/v1/models gives one. So the save stored https://proxy.example.com/v1. Under "Own endpoint at proxy.example.com", the Codex row says "${productName} added /v1 to the address, because the endpoint lists its models there." The note stays until the page reloads, and a later save or Remove clears it. The list names every Codex model of the app, so the row shows no model line.`,
      rationale:
        'Decision 1 C of the plan codex-endpoint-v1-base, which Cal chose on 13 November 2026: when the typed base of a Codex endpoint serves no model list and the same base with /v1 does, the save stores the /v1 base. Without it, each Codex turn on the login fails with HTTP 404, because the gateway adds /responses to the base. The account shows only the host, and the hint of the form named the request address from the typed one, so the note tells Cal that the saved address differs. The words of the note, its place, and how long it stays are agent calls of that plan. The read proves only the model list, so the note names the list, not the API. The save response carries a flag and never the address, so the note names /v1, not the saved address. The note sits under the host, because both say where the requests go. A Claude row never shows the note, because the shared rule already drops a final /v1 of a Claude address.',
      props: { ownEndpoint: 'v1-added' },
    },
    {
      slug: 'read-failed',
      title: 'Model list not read',
      description: `Claude and Codex both run on Cal's proxy, and the proxy refused the key when Cal pressed Refresh on each row. Under "Own endpoint at proxy.example.com", each row warns: "${productName} couldn't read the model list of this endpoint. Check the address and the key." Refresh, beside the warning, reads the list again, and a read that works removes the warning. A reload of the page, a new save, or a Remove also removes it. A Codex save that reads no model list, at the typed address or with /v1 added, stores the address as typed and shows the same warning under the Codex row. Before the first list that works, the pickers show every model of the app.`,
      rationale:
        'Decision 1 C of the plan codex-endpoint-v1-base, which Cal chose on 13 November 2026: when the save of a Codex endpoint can read no model list at all, the account page warns. The agent calls of that plan show the warning after a failed read at a save or a Refresh, for both agents, because a failed read means the same for each. The app stores no mark of a failed read, so a failed read in the background shows nothing, and a reload removes the warning. Reason: an endpoint that serves its API but no model list would otherwise keep a warning that Refresh cannot remove. The warning names what failed and what to check, and it keeps Refresh, so that Cal can read the list again after a fix. The account never shows the full address or the key, so Cal checks them in the setup of the endpoint. To change them, Cal removes the login and connects it again. The warning has an icon and words, so it never depends on colour alone.',
      props: { ownEndpoint: 'read-failed' },
    },
    {
      slug: 'read-failed-unlisted',
      title: 'Last list kept after a failed read',
      description:
        'As in app/account/endpoint-models/read-failed, the proxy refused the key when Cal pressed Refresh on each row. The last Claude list that the app read, from yesterday, does not name Fable 5.1, and a failed read keeps that list. So the Claude row shows the warning with Refresh, then "Fable 5.1 is hidden from your model pickers, because this endpoint does not list it." and "Its model ID is claude-fable-5-1. Checked yesterday." The row has one Refresh, beside the warning. The last Codex list names every Codex model of the app, so the Codex row shows only the warning.',
      rationale:
        'An agent call of the plan codex-endpoint-v1-base: when the row also shows the models that the last list leaves out, it shows one Refresh, not two, because one read changes both lines. Refresh sits beside the warning, the first line, because the failed read is what a new read can change. The model line keeps its words and gives the time of the last list that the app read, so Cal sees how old the list is. The pickers of Cal still hide Fable 5.1, from the list that the app kept, as decision 10 G of the own endpoint plan says.',
      props: { ownEndpoint: 'read-failed-unlisted' },
    },
  ],
})
