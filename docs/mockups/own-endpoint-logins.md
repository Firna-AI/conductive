# Own endpoint login mockups

[Logins](orgs-and-logins.md#logins) describes the shared account controls.

- An own endpoint login sends the turns of its agent to a gateway or a
  proxy that the user chose, from decision 1 A of the own endpoint plan.
  The model gateway in the Worker, not the cloud computer, sends each model
  request of those turns to the endpoint, with the key, so the cloud
  computer gets neither. Its form asks for the address of the endpoint and
  its key, and the app stores both encrypted. `EndpointFields` in
  `src/components/settings/` draws the fields, as `app/account/own-endpoint`
  and its `codex` variant show.
  - The form says that the endpoint must serve the Anthropic Messages API
    for Claude, or the OpenAI Responses API for Codex. It names the models
    that the app offers. The app reads the model list of the endpoint, and
    the owner's pickers hide each model of the app that the list does not
    name (decision 10 G of that plan), as `app/account/endpoint-models`
    and `app/chat/endpoint-models` show.
  - The address is the base address of the endpoint. The placeholder gives
    an example, without `/v1` for Claude, and with `/v1` for Codex. One
    shared rule checks the address and builds the exact address of each
    request from it (decision 9 E of that plan). It keeps a query, and it
    drops a fragment, a trailing slash, and a final `/v1` of a Claude
    address. The hint names where the requests go, through the app, from
    the address in the field, such as https://gateway.example.com/v1/messages.
    When the rule changes the typed address, the hint first names the
    address that the form saves, such as "Saves as
    https://proxy.example.com", as `app/account/own-endpoint/typed` shows.
  - The rule accepts only an `https://` address with a public host name,
    because the gateway calls the endpoint over the internet. It refuses
    `localhost`, names of one label, internal names, the names of the app
    and of its previews, and a user name or a password in the address. It
    also refuses each IP address, IPv4 or IPv6, as the host, because a
    fetch from the Worker to an IP address can fail (decision 13 A of that
    plan). A host name that points to the IP address, such as
    `136.115.241.64.sslip.io`, works when the server has a certificate for
    that name. The form and the save use the same rule. Its refusal names
    the rule in plain words: "Use a public https:// address with a host
    name, without a user name or a password." The refusal takes the place
    of the hint under the address, and the key stays in its field, as
    `app/account/own-endpoint/refused` shows.
  - A connected own endpoint login shows its kind with the host of its
    endpoint under its row, such as "Own endpoint at proxy.example.com", so
    that a phone shows both in full. It never shows the key or the full
    address, as `app/account/own-endpoint/connected` shows. The part lives
    in `src/components/settings/LoginEndpoint.tsx`.
  - When the typed address of a Codex endpoint gives no model list and the
    same address with `/v1` gives one, the save stores the address with
    `/v1` (Codex base decision 1 C, which Cal chose
    on 13 November 2026). A note under the host then says "Conductive added
    /v1 to the address, because the endpoint lists its models there." The
    page keeps it until it reloads, as
    `app/account/endpoint-models/v1-added` shows.
  - When the model list read of a save or of a Refresh fails, a warning
    under the host says "Conductive couldn't read the model list of this
    endpoint. Check the address and the key." It has Refresh, and it shows
    for both agents, as `app/account/endpoint-models/read-failed` shows.
    The page keeps it until a read works or the page reloads. A failed
    read in the background shows nothing. A failed read keeps the last list, so the row can also name the
    models that the list leaves out. The row then has one Refresh, beside
    the warning, as `app/account/endpoint-models/read-failed-unlisted`
    shows.
  - `EndpointRead.tsx` in `src/components/settings/` draws the note and the
    warning. The caller gives the warning its Refresh button, so that the
    app can give the button its own action. `endpointReadCopy.ts` beside it
    holds the words of both and of Refresh, with the product name from
    `brand.ts`. Neither imports a fixture, so the app can import them.
    `EndpointDetails.tsx` puts the lines under an own endpoint login in
    order, and gives the row its one Refresh.
  - In a session on the own endpoint of another member, the bar of the
    composer names the login as for every login, such as "Cal's login".
    It names no host, because the members of an org trust each other with
    their logins (decision 5 of the own endpoint plan, which Cal changed on
    10 November 2026).
