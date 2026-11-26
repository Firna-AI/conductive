# Key code

This page is part of the [web app guide](README.md). It names the files,
the types, and the functions of the web app that a reader opens first.
Each path is relative to `src/app/`, the folder of this page.

- [Shortcuts](shortcuts/README.md): the pure command registry, keyboard
  defaults, browser keys, account keymap, conflicts, and press decision.
  The [shortcut layer](../shell/shortcuts/README.md) calls it for each key
  of the page.
- `services.ts`: `windowHost` detects the web host, and `windowNewTab`
  opens a page of another site in a new tab, as a link with
  `target="_blank"` and `rel="noreferrer"` does. `live-services.ts` and
  `dev/fake-services.ts` supply them with the keyboard and key events.
- `dev/org-routes.ts` creates orgs and starts their first simulated build.
  `dev/build-routes.ts` runs builds and the added build after the first image.
  `dev/settings-routes.ts` saves settings and repository choices.
  `dev/provider-routes.ts` keeps the provider accounts and their weights,
  and gives a new org its account. `dev/operator-orgs.ts` lists the samples
  and the orgs that Create org made for the operator section.
- `dev/seed.ts`: the state of the dev fake when the app opens.
  `dev/acme-seed.ts`: Acme with its recorded records, and its
  sub-workspaces with `?subWorkspaces=1`. `dev/workspace-writes.ts`:
  Rename, the move of a tree, Archive, and Restore of one workspace.
- `dev/waitlist-routes.ts`: the waitlist of the person signed in, and
  `admitOpenSignup`, which gives app access during open sign-up before each
  request. `dev/signup-routes.ts`: the pause and the waitlist switch of
  the operator section. `dev/seed.ts` turns the waitlist off for
  `?waitlist=off`.
- `dev/attachment-routes.ts`: the upload routes of both composers, which
  keep the bytes of each upload. `dev/attachment-files.ts`:
  `attachmentFiles`, the private store of those bytes and of their copies,
  and `attachmentFileRoutes`, the content and download routes of the
  copies. Its `readCopiedFile` gives the same reads to the development
  page of the chat. `dev/attachment-message-routes.ts`:
  `attachmentMessageFetch`, the reply of a send of uploaded files.
  `dev/attachment-files.test.ts` drives them through `createFakeServices`,
  the chat API, and the file client.
- `api/client.ts`: the JSON client and `ApiError`. The client also gives
  its `fetch`, for a feature client that reads its own replies, so the web
  app and the Mac app keep their transport. Its `sendPart` sends a raw part
  of a file with `PUT` through the file transport of the services:
  `api/xhr-files.ts` in the browser and in the Mac app.
  `api/read-*.ts`: the readers.
  [api/read-shortcuts.ts](api/read-shortcuts.ts) reads both shortcut keyboards and
  the reply of a shortcut save with the shared reply readers. A malformed
  account structure remains an `invalid_response` error from the API
  client.
- `clipboard.ts`: `copyText`, the clipboard write for plain or pending text.
  It starts a pending `ClipboardItem` write during the user press when the
  browser supports it. The fallback waits for the text and calls `writeText`.
  Both paths propagate failures. `AppServices.copy` accepts a string or a
  promise of a string. Live services and development hosts use this owner.
- [Key code: drafts and attached files](key-code-drafts.md) names the
  entry points of the draft text, the attached files, and their uploads,
  which the chat and New workspace share.
- `replay-socket.ts`: `replaySubscribe`, the raw event stream of a feature
  store over the event source of the app, with the reconnect rules of
  [Data lifecycle](data-lifecycle.md).
- `app-model.ts`: the session, the orgs, the models list, Get started,
  `putOrg`, which takes a confirmed org record, `moveOrg`, which moves an
  org in the person's own order, and `admit`, which opens the app when app
  access arrives. `boot.ts`: `Boot`, the states of the first load,
  `readShared`, what every screen of the app shares, and `watchSession`,
  the client that shows the sign-in after a `sign_in_required` refusal.
- `api/refusals.ts`: `noteRefusals`, a client that reports each refusal
  with one error code, also the replies of its fetch.
- `org-list.ts`: `OrgList`, the orgs of the person in their own order, as
  `AppModel.orgs` gives them: the list that the server confirmed, then the
  moves that wait for their answer. `OrgList.patch` takes from the answer
  of a partial save only the fields of its request, as
  [Data lifecycle](data-lifecycle.md) says.
- [send-queue.ts](send-queue.ts): `SendQueue`, whose `run` sends the moves
  of one `OrgList`, or the writes and saves of one `Resource`, one at a
  time. Each request goes out after the answer of the one before.
- `org-writes.ts`: the requests of `AppModel.createOrg`,
  `AppModel.renameOrg`, and `AppModel.setOrgColor`, which read the org record.
  `saveOrgPatch` sends the partial save that `renameOrg` and `setOrgColor`
  share, and gives its answer and its request to `OrgList.patch`.
  `putOrgOrder` saves the user's org order for `AppModel.moveOrg`.
- `waitlist-model.ts`: `WaitlistModel`, the screen of a person who waits:
  the use of a code from the field or a join link, the invitations with
  Accept, and the read of the app access at each return to the page.
  `waitlist-state.ts`: what the screen shows, and the reason of each
  refused code. `api/read-waitlist.ts`: the readers of the session and the
  waitlist state, which requires `waitlistOn`.
- `../shell/waitlist/`: `Waiting`, which runs a join link and the read at
  each return, `WaitlistScreen`, the code field, and the invitations.
  `../shell/auth/SignInFrame.tsx`: the frame that the sign-in, the sign-in
  of a join link, and the waitlist share. `../shell/layout/Alone.tsx`: a
  page without the rail, and the wait of the first load.
- [waitlistCopy.ts](../ui/screens/waitlistCopy.ts) and
  [inviteCodeCopy.ts](../ui/components/settings/inviteCodeCopy.ts):
  the words of the waitlist and of the invite code that the app and the
  mockups share.
- `invitations-model.ts`: `InvitationsModel`, the pending invitations,
  Continue to workspaces, and Accept invitation.
  `api/read-invitations.ts`: their readers.
- `get-started.ts`: the order and the states of the steps of Get started.
  `setup-steps.ts`: `setupSteps`, the steps that the screens show, and
  `setupOrg`, the org of Get started and of the address `/`. The agent
  step is complete with an own login or an org login that serves.
- [getStartedCopy.ts](../ui/screens/getStartedCopy.ts): the
  setup text that the app and mockups share.
- `org-model.ts`: the sections, workspaces, repositories, builds, members,
  automations, computer settings, and org logins of one org, with `watch`.
  `org-resources.ts` gives the read of each part, and `org-waits.ts` its
  wait, such as `workspacesWait`. `OrgModel.startBuild` sends Build
  computer and Try again for each screen that offers them.
- `org-refresh.ts`: the readers of the parts of `OrgModel`, in
  [Key code: the workspace list and the workspace models](key-code-workspaces.md).
- `org-agent-logins.ts`: `OrgAgentLogins`, the org logins of one org with
  the save, the switch, Remove, and Refresh of an admin. Each save, switch
  change, remove, and Refresh calls `changed`, which reads the default
  logins of the account again, as [Login data](login-data.md#rules) says.
  `api/read-org-logins.ts` reads them. `../shell/settings/AgentsTab.tsx`,
  `OrgLoginList.tsx`, and `EveryMemberSetting.tsx` draw the Agents tab.
- `secrets-model.ts`: `SecretsModel`, the secrets of one org with their
  create, Replace, delete, mark for all agents, and reveal.
  `api/read-secrets.ts` reads them and the capabilities of a workspace,
  and keeps no value from a reply of the list.
- `capabilities-model.ts`: `WorkspaceCapabilitiesModel`, the pre-approved
  secrets, the approvals of the sessions, and the values for the workspace
  of one workspace, with their changes. It reads the values from the list
  of the secret requests, and removes one with its route.
- `new-workspace-draft.ts`: `Draft`, with the pre-approved secrets of New
  workspace and the switch of Mac access, `allowThisMac`, and the pure
  rules of a draft that `new-workspace-model.ts` applies. Each draft starts from `NEW_WORKSPACE_CAPABILITIES` in
  [`../shared/secrets.ts`](../shared/secrets.ts).
- `permissions.ts`: `secretRights` and `mayAddSecret`, the rights of the
  Secrets tab, beside the other rights of an org.
- `first-build.ts`: `firstBuildOf` and `useFirstBuild`, the state of the
  first build of an org from its builds, which Get started and New
  workspace show until the org has a good image. `changedScriptNotice`
  gives the words of the notice of a changed install script, which the
  Cloud computer tab of an admin and of a member show.
- `current-build.ts`: `currentBuild`, the build that new workspaces start
  from: the current image build of the org, else its newest good build.
- [Key code: automations](key-code-automations.md) names the entry points
  of the automations: their readers, models, and drafts, the Automations
  page, the automation page, and the Runs list.
- `repository-changes.ts`: the repository changes and their readiness, in
  [Key code: the workspace list and the workspace models](key-code-workspaces.md).
- `account-model.ts`: the agent logins with their share setting, the
  default model, the model favourites, the New workspace view, the shortcut
  changes of each keyboard, the GitHub App installations, and the
  repositories that Create org offers. `account-preference-writes.ts`:
  `AccountPreferenceWrites`, the saves of the preferences. Each save shows
  the value of its reply, and a failed save keeps the saved value and fails
  with its error. `setFavourites` saves the whole list of the favourites,
  and the account then holds the list that the Worker kept, as
  [The account routes](../../docs/protocol/model-favourites-account.md#the-account-routes)
  says. `saveShortcuts` saves one batch of changes for one
  keyboard and keeps the confirmed changes of the reply. A screen watches the
  installations: they read at once, and again with the steps of Get started
  each time that the user comes back to the page. It also reads the
  waitlist state for the invite code of the account.
  `../shell/account/InviteCodeSection.tsx`: that invite code, in each
  state of the code, of the pause, and of open sign-up.
  `account-login-writes.ts`: the writes of the logins. The save of an own
  endpoint login and `refreshModels` read the account again for the model
  list of the endpoint, which only the account holds. A later change of the
  same login makes that read old, so it does not show. `endpoint-reads.ts`
  keeps the flags of their answers for the note and the warning.
  `startCodexSignIn` and `pollCodexSignIn` send the requests of the
  ChatGPT sign-in of Codex. `../shell/account/codex-sign-in.ts`:
  `CodexSignIn`, the steps, the polls, and the timer of that sign-in.
  `api/read-core.ts`: `loginUsable`, whether turns can run on a login.
  After a save, a remove, a share change, or a connected sign-in,
  `readDefaults` reads the logins of the agent again for the default
  logins of the account, and `orgLoginChanged` does so after a change of
  an org login.
  `account-login-reads.ts`: `AccountLoginReads`, the one owner of the
  reads of the logins. Each of its reads is a read of the whole account.
  It also reads the account once when an org joins the orgs of the
  person.
  `login-owner.ts`: `loginOwnerName`, the name of the owner of a login,
  the org or a member, for the label of the composer and the line under
  the prompt of an automation.
  `default-logins.ts`: `newSessionLogin`, the login of a new session of
  the person in an org, from the default logins that the server names,
  and the readers of those default logins for the screens.
- `panels.ts`: `PanelLayout`, the widths of the panels, the split of the
  right column (`column-split.ts`), the size of the Explain popovers
  (`explain-size.ts`), and whether the sidebar and the right column show.
  `stored-size.ts`: `StoredSize`, one size that the user chooses with a
  handle and that the browser keeps, which each of them uses.
  `panel-drag.ts`: `moveInRange`, the one rule of the steps of the
  columns and of the popover, and `panelDrag`, the rule of one drag. Each
  caller of `moveInRange` gives where Home and End go when its panel
  shows outside its range: the columns keep the width that shows, and
  the popover goes to the ends of its range, up to the room by its mark.
- `resource.ts`: `Resource`, a server value with its confirmed changes and
  its waiting writes, and the errors that prove that the value no longer
  exists. `refresh.ts`: `Refresher`, the shared reads of a part while
  screens show it, and `reread`, a read that starts after a refusal.
- [Key code: the workspace list and the workspace models](key-code-workspaces.md)
  names the entry points of the workspace list, its menus, Archive and
  Restore, and the models of an open workspace and of New workspace.
- `suspension.ts` and `permissions.ts`: the suspension of an org, the
  client that reports its refusals, also the replies of its fetch, and the
  rules of what a person may change.
- `computer-model.ts`: the scripts, the env vars with their Secret marks,
  the skills repository, the builds, and the log. `classifyEnvVar` changes
  only the mark of a variable, and sends no value. `replaceEnvVar` changes
  only the value, and sends no mark, so the Worker keeps the stored mark.
  `setEnvVar` sends a value and a mark, for Add variable.
  `saveSkillsRepository` saves the text of the Skills field and its trust
  choice in one write, with a grant that names that same text, and then
  looks up the skills again. `loadSkills` is Try again of the lookup.
- `skills-lookup.ts`: `SkillsLookup`, the reads of the lookup of the
  skills repository, of which only the newest answer shows, and
  `shownSkills`, the list or the notice that the Skills section shows for
  an answer. The tab of an admin and the read-only tab of the members UI
  share it.
- `skills-trust.ts`: `SkillsChoice`, the skills repository and its trust
  choice as one value. `sameSkillsChoice` is the equality of the draft of
  the Skills section, so a newer saved value never pairs the trust of one
  repository with the text of another. `savedSkillsChoice` and
  `savedSkillsTrust` read the saved choice of the settings, and
  `namesSkillsRepository` says whether the text of the field has a trust
  choice. The tab of an admin and the read-only tab of the members UI
  share it.
- `../shell/settings/SkillsSection.tsx`: the Skills section of an admin,
  with the field, the trust switch of `SkillsTrust.tsx`, Save repository,
  and the list or its notices, from the shared parts and words.
- `../shell/settings/EnvVarsSection.tsx`, `EnvVarForms.tsx`, and
  `EnvVarMark.tsx`: the env var editor of an admin. The Secret switch of a
  row saves its mark at once, and Add variable starts secret. A new value
  sends no mark, so it keeps the stored mark, also a mark that a save of
  the switch changed after its form opened. The switch, Change, and Delete
  of a row wait while one of them saves.
- `build-log-follower.ts`: `BuildLogFollower`, the reads and the timer of
  the log of one build.
- `events.ts`: the ordered event stream and its count of reconnects. Its
  `subscribe` tells the replayed events from the live ones.
- `event-socket.ts`: the event socket of the Worker, and `openSocket`, the
  terminal socket on the same origin as the events.
- `pointer-drag.ts`: `usePointerDrag`, the drag and drop of any pointer
  that the tab row of the chat, the workspace list, the org rail, and the
  org switcher use: the press, the start after a move of a mouse or a long
  press of a finger, Escape, the click after a drag, the scroll lock of
  touch, and a new drop place after a scroll under a still pointer. A menu
  event ends the press of a mouse and keeps the press of a finger.
  `cancel` does what Escape does, for an owner whose layer takes Escape
  first, such as the sheet of the org switcher. `ownPress` keeps a press
  on a control inside a dragged element, such as Close or Archive, for
  that control, and `isOwnPress` says whether a control kept a press.
  `longPress` and `touchSlop` are the hold of a finger and how far it
  moves first.
  `next-click.ts`: `stopNextClick`, which stops the click that ends a drag
  wherever it lands, also the late click of a finger.
  `pointer-drag.test.tsx` mounts the hook in happy-dom.
- `long-press.ts`: `useLongPress`, the long press of a finger that opens a
  menu where nothing drags, such as a tab of a read-only row. It holds as
  long and allows as small a move as the drag. It ignores a press that a
  control keeps, and stops the click after a hold. A mouse and a pen bind
  nothing. `../chat/components/TranscriptCopy.dom.test.tsx` checks it
  through the tab row of a read-only chat.
  `../shell/list/useRowDrag.ts`: the drag of a top-level row with its tree
  to a place in a section, on `usePointerDrag`, and `still`, the handlers
  of a nested row, whose long press does nothing, on `useLongPress`.
  `../shell/list/drop-target.ts`: `DropLayout`, the boxes of the sections,
  the rows, and the trees that a drop measures.
- `../shell/ui/useListDrag.ts`: the drag of an item in a vertical list,
  such as an org in the rail and in the org switcher of a phone, a chosen
  repository of an org, or a model favourite, on `usePointerDrag`.
  `../shell/ui/useListMoves.ts`: the moves of such an item by a menu and by
  Alt and Up or Down. `../shell/orgs/useOrgMove.ts`: the move of an org with
  the toast of a failed save. `../shell/layout/useRailOrder.ts`: the drag,
  the tile menu (`useTileMenu.tsx`), and the moves of the org tiles.
  `../shell/settings/RepositoryOrder.tsx`: the same moves of the chosen
  repositories, with their row menu. `../shell/account/FavouritesSection.tsx`:
  the same moves of the favourites of Preferences, which save one at a
  time, with the rows of `FavouriteParts.tsx` and the row IDs of
  `favourite-rows.ts`. `../shell/list/OrgSwitcherSheet.tsx`: the org switcher, where
  a long press lifts an org.
- `sideways-wheel.ts`: `useSidewaysWheel`, which turns a
  vertical wheel turn over a row that scrolls sideways into a sideways
  scroll of the row. A sideways swipe and a turn with Ctrl stay with the
  browser, and so does a turn past an end of the row. The tab row of the
  chat uses it, and any row that scrolls sideways can.
- `file-drags.ts`: `carriesFiles`, whether a drag carries files,
  `droppedItems`, the files and the folders of a drop in their order, by
  the entry of each item, and `intakeOf`, which turns each folder into its
  zip. `folder-zip.ts`: `zipFolder`, the zip of one dropped folder in the
  browser, with `fflate`, which stops at the size limit of an attachment.
  It moves the compressed bytes into blobs of about 8 MiB, so the page
  never holds the whole zip.
  `folder-entries.ts`: the parts of a dropped entry that the zip reads. `useFileDropGuard` cancels each drag of files that no part
  took, so the browser opens no file in place of the page. `App` and the
  chat development page mount it. The composer drop and the
  `useScreenshotDrop` of Feedback share `carriesFiles`.
- `operator-read.ts`, `operator-directory.ts`, and `operator-target.ts`:
  the Overview and the pages of the operator section, its searches, and
  Suspend and Lift. `operator-pause.ts`, `operator-switch.ts`, and
  `operator-access.ts`: the pause of sign-ups, the waitlist switch,
  Approve, New code, and Disable. `operator-providers.ts`: the provider
  accounts, their weights for new orgs, and the save of the weights. A
  refusal with `operator_required` marks the account as not an operator.
  `api/read-operator.ts`, `api/read-operator-pages.ts`,
  `api/read-operator-waitlist.ts`, and `api/read-operator-providers.ts`:
  their readers. The
  [operator section](../shell/operator/README.md) gives the screens.
- `router.ts` and `navigation.ts`: the addresses of the screens.
  `routeOf` gives the screen of an address, and `useRoute` the screen of
  the current one. A session address, built by `sessionAddressPath` of
  `../shared/session-link.ts`, gives the workspace route with its
  `session`, which the workspace screen shows before it replaces the
  address.
- `kept-org.ts`: `keptOrg`, the org of a page without one: the org that
  the tab opened last, from `AppModel.lastOrg`, or else the first org that
  is not deleted.
- `last-workspaces.ts`: `LastWorkspaces`, the last workspace page of each
  org of the person, which the browser keeps, as
  [Opening an org](../../docs/protocol/org-rail-order.md#opening-an-org)
  says. `AppModel.lastWorkspaces` follows the person signed in.
  `orgEntry` gives the page that opens an org: the org tile and its keys
  (`../shell/orgs/useOrgEntry.ts`) and the palette's Switch to rows use
  it. `startPage` gives the page of `/`. The workspace screen
  remembers and forgets its workspace through
  `../shell/workspace/remember-workspace.tsx`.
- [Key code: the palette, the layers, and the dialogs](key-code-layers.md)
  names the entry points of the command palette, the layers of each
  frame, New workspace as a dialog, and feedback with its screenshots.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
- `../shell/ui/useSavedDraft.ts`: the draft of an editor of a saved value,
  as one value or field by field (`eachField`).
  `../shell/list/useRowFocus.ts`: the focus of a row after a move by keys.
  A closing row menu gives the focus to the current link of its row through
  it, also after a render replaced the row.
- `../shell/orgs/`: Create org and the name and initials fields.
  `../shell/settings/RepositorySearch.tsx`: the searchable repository list.
