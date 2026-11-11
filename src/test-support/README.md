# Browser fakes

Use these modules only in development and tests.
The production Worker does not import them.
They use the same contracts as the real API.
The fixtures reuse the mockup data and keep all dates deterministic.
Workspace records include their number and canonical link on `FAKE_ORIGIN`.
Each record also gives the GitHub summary of its mockup workspace.
The default workspace takes the summary of the chosen banner instead, `ready-to-merge` by default, so its list mark and its bar agree.
The created workspace of the fake API starts with no summary.
A fixture that changes a workspace ID or org must rebuild its link.
Use `FAKE_TIME` as the screen's clock when it shows relative times.

```ts
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from './fake-api'

const server = new FakeApiServer({ conversation: 'running' })
const response = await server.fetch(workspacesPath('acme'))
```

Inject `server.fetch` where the screen's API client takes `fetch`.
Inject `server.events.subscribe` through a callback for the screen's event adapter.
For example, use `server.events.subscribe(0, onMessage)`.
The first message contains stored history. Later `emit` calls send live events.
Use the last event number instead of zero to exercise a reconnect.

The `omitted-data` conversation has a Unicode tool excerpt and a capped turn file list.
Both records include positive omission counts.
The `refused-events` conversation has one marker for each permanent refusal reason.
The marker can have no turn context when the event is invalid.
The `sent-by` conversation ends with a message from an agent tool.
It links a closed session with a long title, and its `Sent by:` line links a session of another workspace.
The dev app shows it with `?conversation=sent-by`, because the fake answers a send with its recorded message.
Each fake session record sets `retryMessageId`.
In the `failed` conversation, each open session names the failed request `ask`, which the recorded failure names too.
All other session records hold null.
Each session record names its starter in `startedBy`, as `senderSnapshot` copies a person.
An open session takes the starter that the mockups name, and a closed one the workspace owner.
Each record has `sourceSessionId: null`, `loginAvailable: true`, and `loginShared: true`.
The replies of Send and Try again name the session that took the message, with its record.
Browser file recordings contain complete reports.
`recordedRunnerFileEvents` keeps four complete runner reports for current file readers.
Each full report is explicitly part 1 of 1. Its tree ends at revision 2.
`recordedMultipartRunnerFileEvents` supplies eight events for part-joining checks.
It splits trees and changes into two parts and uses tree delta revisions 2 and 3.
The small samples exercise joining without large fixtures.
Current changes fixtures include `unpushedCommits`. The HTTP fixture has
one commit, and the later recorded report has two, so readers see a change.

`recorded-repairs.ts` records the lost updates without a session: the file tree, the changes list, the start steps, the workspace name, and the list of servers.
`firstLoss(kind)` gives the marker of a first loss. For the file tree, it is a refused tree delta.
After a first loss, the workspace asks for a fresh full report, and the browser shows nothing.
`refusedReport(kind, true)` gives the marker of the refused fresh report, with `repairFailed: true`. It marks a failed repair, which shows a notice.
`fullReport(kind)` gives a complete report of that kind, which clears the notice. `treeUpdate(revision)` gives a tree delta, which clears nothing.
`nextEnvelope(events, event, occurredAt)` numbers an event after the last event of the fake stream.
`storeFailedRepairs(events, kinds, now)` adds a first loss and a failed repair of each kind to the stored history, before `now`.
The name and the changes get the ages that the mockups draw.
The failed-repair tests of the Files store, the Files panel, and the workspace screen use these helpers.
The development pages of the Files screens and of the workspace screen use them too.

`paths: 'masked'` adds the two files of the masked mockups. Their real
paths hold a fake secret value, and their records carry the labels of the
mockups as display paths, in the file lists, the reads of the seed script,
and the end of each finished turn. `fixtures/masked-paths.ts` holds them.

Writes return recorded replies. They do not change backend state.
The account fixture includes empty shortcut changes for both keyboards.
The recorded shortcut save answers for the Mac keyboard.
Override that reply to test another keyboard or saved changes.
The GitHub action routes answer as a member with write access and the
`squash` method. A merge returns HTTP 202 with a pending job named
`merge-<workspace ID>`, and the poll of that job returns a completed merge.
Each banner with a pull request carries `FAKE_GITHUB_HEAD_SHA` as the head
that the bar shows, which the action client sends back.
`fake-bar.ts` sets the other answers of the actions of the bar: the
member's access, the end of a merge with the Worker's safe words, the local
work as a route reply and a newer changes report in the stream, and the
start and the poll of Continue. `continuedEvents` gives the events of a
Continue: the workspace on its new branch, a note in each session, the
changes report of the new branch, and its GitHub state. `fake-bar-dev.ts`
gives `scenarioFetch`, which answers as the Worker does with its state, for
the development pages.
Repository PUT and DELETE replies change only the named repository in the
recorded choices. Stateful client tests use the dev routes in `../app/dev/`.
Set the next reply with `server.json(method, path, body, status)`.
Its `body` can be a promise, such as an upload reply that waits for the digest of its file path.
Use `server.empty` for a 204 response.
Use `server.response` for a download or a custom error response.
Each response is cloned, so a caller can read it once without changing later replies.
Unknown routes return `fake_route_missing`. They never reach the real network.

The default org is `acme`. The default workspace is `checkout-autocomplete`.
`FAKE_IDS` in `fixtures/core.ts` names the shared sample IDs.
Options select the org role, workspace state, conversation, and GitHub banner state.
`github` sets the GitHub summary of the default workspace record, and `null` gives none.
Without it, `fakeGitHubSummary` gives the summary of the banner and its checks, as the Worker copies it.
`workspaceFixtures(state, github)` takes that summary for the default workspace.
The dev fake of `../app/dev/` uses `fakeGitHubSummary` too.
Its seed makes `email-dark-mode` work without GitHub state, so its grey mark moves.
Replace a reply to draw a missing login, a first run, or a deleted org.
`endpointLoginFixtures(updatedAt)` in `fixtures/agent-logins.ts` supplies
connected own endpoint metadata for both agents. The development seed uses
it for `?login=endpoint`. The fixture holds no key or full address.
The fake answers `GET /api/invites` with no invitations. A test sets its own list with `server.json`.
`server.signIn(user)` serves the session of another person, with app access, as a sign-in of that person does.
The session reply has app access, and `GET /api/waitlist` answers with `accessState` of `fixtures/waitlist.ts`: no pause, the waitlist on, and the invite code of the mockups with 2 of its 5 invites used.
`serveWaiting(server)` in `waitlist.ts` serves the session of Sam Okafor, who waits for app access, with the waitlist state of the mockups. `serveWaiting(server, { email: 'none' })` serves the account without a verified email.
`codeRefusal(code)` gives the status and the error body of a code that let nobody in, as the Worker sends them.
`fixtures/waitlist.ts` also gives `waitingUser`, `waitingState`, `ownInviteCode(uses)`, and `sampleCodes`, an invite code of the operator mockups that works, one that is used up, and one that is disabled.
`serveSuspendedAcme(server, role)` in `suspended-org.ts` serves Acme as a suspended org in the org list, and `orgSuspendedBody` is the error body of the API for a write that a suspended org refuses.
`serveOperator(server)` in `operator.ts` makes the person signed in an operator, and serves the operator replies of the samples: the Overview, the newest orgs and users, the people who wait, the invite codes, the pause of sign-ups, which is off, the waitlist switch, which is on with the count of the people who wait, and the page of each sample org and user. It returns the replies, so a test can change one. `operatorRequiredBody` is the error body of the API for an operator request of anyone else.
The operator samples in `fixtures/operator-samples.ts` have the names and the counts of the operator mockups, with an ID for each org and user, and the people of the other fixtures. Ten of them wait, with the names of the waitlist mockups. Each time counts back from the time of the samples. Hexwave is suspended, Pinecrest is deleted, and Dana Kim is suspended. `SAMPLE_IDS` names them, Sam Okafor and Kenji Watanabe, who wait with and without a verified email, and Zed K, the newest person who waits, as `SAMPLE_IDS.newestWaiting`.
`fixtures/operator-access-samples.ts` gives the way in of each user who came after the waitlist, the age of each GitHub account, the referral code of each user with app access, and the invite codes of the mockups. `fixtures/operator-access.ts` turns them into the app access of a user, the waitlist, and the codes, with the records that an operator changes: the approvals, the open sign-ups in `openSignups`, the codes, the pause, and the switch in `waitlistSwitch`. `sampleAccessRecords` in `fixtures/operator-access-records.ts` builds those records at a time, with the waitlist on. An open sign-up names its operator on the page of a user. The approval email of Ana Pereira went, and the one of Joe Quinn never went. The suspension of Dana Kim disabled her referral code.
`fixtures/operator.ts` builds the replies from the samples and their records: the page of an org or a user, its row in a list, and the Overview with the 30 UTC days up to the day of the read and the count of the people who wait. The dev fake changes the records with Suspend, Lift, Approve, New code, Disable, the pause, and the switch. Its waitlist reads the same codes, pause, and switch, and a code that works there counts its use and gives a referral code.
`macCommands` chooses the Mac commands of the fake workspace, and `onMac` makes the window the Mac app on the Mac of the fake user.
Without `onMac`, the window is a browser: it has no pairing, and the Mac settings refuse it as the Worker does.
Each fake record has a `requestKey` from `fakeRequestKey`, which differs from its `requestId` and is safe in an address.
The answer routes use that key, as the Worker's do, so an address built from the raw ID finds no reply.
`fakeSettingsReply` gives a settings reply with its pairing and outcome: done, done but not saved, or failed.
The requests come after the tool call of the recorded turn, so the chat places a card after it.
Preview and desktop URLs are recorded placeholders. Tests can replace them with local fixture URLs.

## Mounted tests

`mount.ts` mounts React components in a DOM test and acts as a person does. Use it only in tests, because it imports Vitest.
`dom-queries.ts` finds elements by their role and accessible name, by their `aria-label`, or by their text.
The global test environment stays Node.
Start each DOM test file with the line `// @vitest-environment happy-dom`.
Give the file the test timeout `MOUNTED_TEST_TIMEOUT`, 15 seconds, with `vi.setConfig`.
It is a hang guard that is longer than the deadline of `waitFor`, so a failed wait shows its own error first.

```tsx
// @vitest-environment happy-dom
import { vi } from 'vitest'
import { byRole, queryByRole } from '../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT, press, waitFor } from '../test-support/mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const view = await mount(<OwnerPicker {...props} />)
await press(byRole('button', 'Owner: Cal'))
await waitFor(() => queryByRole('menuitemradio', 'Priya Raman'), 'the choice of Priya Raman')
await view.rerender(<OwnerPicker {...props} workspace={next} />)
```

- `mount(element)` renders the element inside `act` into a new container on `document.body`.
  It returns `container`, `rerender(element)`, and `unmount()`. Each mounted tree unmounts after its test.
- `press(element)` clicks the element. `typeText(field, text)` types into an input or a text area, so React sees the change. A message field takes the text as `typeMessage` types it.
- `message-field.ts` acts on the message field of a composer, the chip text field: `focusMessage(field)` moves the focus into the field as Tab does, with no press of the pointer, `typeMessage(field, text)` selects all and types the text, `pasteMessage(field, text)` pastes plain text at the caret through a paste event, `pressInField(field, key)` presses a key, `clearMessage(field)` deletes all the text as Ctrl+A and Backspace do, and `messageText(field)` gives the plain draft with the link of each chip. Each one commits the change of the field, as a browser does before the next input. `asMessageField(element)` checks that an element is such a field, also while it takes no change.
  `messageText` reads each field as a field without a files source. For a field with attached files, it gives the text without escapes and the mark of each attached file, so it is not the draft text. Read the draft that the owner keeps instead.
  `pressKey(key)` sends a keydown and a keyup to the focused element. Each runs inside `act`.
  Each fails with a named error when a person cannot use the target. `pressKey` checks the focused element.
- `file-picker.ts`: `pickFiles(root, files)` picks files with the first Attach files button in `root`, as a member does.
  The paperclip of a composer and the notice of a dropped folder both offer that button, and both open the same picker.
  It focuses and presses the button, so the focus leaves the message field for the button, as in Chrome.
  It then gives the file input of `root` the files and fires its change event, as a browser does after a pick.
- `file-drop.ts`: `draggedFiles(items, text?)` gives a drag of files and folders from the desktop, with optional plain text beside them.
  Each item has kind file and an entry, and the types hold `Files`, as in Chrome. A folder comes as an empty file whose entry is a directory.
  `draggedText(text, type?)` gives a drag of text or of a link.
  `fireDrag(target, type, data, { point, to })` fires one drag event, with a `copy` offer at `dragenter` and `dragover`.
  `dropOn(target, data, point?)` drags over the target and drops.
- `byRole(role, name)` gives the one element with the role and exactly the accessible name.
  It fails when it finds none or more than one. `queryByRole` gives null for none. `queryAllByRole` gives all.
- `byLabel(label)` and `queryByLabel(label)` match an exact `aria-label`. `accessibleName(element)` gives the name.
- `byText(text)` and `queryByText(text)` give the innermost element whose spoken text is exactly `text`.
  `queryAllByText` gives all, so a test can count the shown copies of a text.
- `byDialog(name)` gives the one `<dialog>` with the name. Each finder takes an optional root.
- The finders skip an element that is not shown, and every `aria-hidden` subtree.
  `isShown(element)` is the check: `checkVisibility()` is true, and no ancestor has `hidden`.
- `isOperable(element)` says whether a person can use the element now: it is shown, it is not inert,
  and it is inside the open dialog whenever a dialog is open. `whyInoperable(element)` gives the reason.
- `requestDialogClose(dialog)` sends a close request as a browser does for Escape: a `cancel` event, then a close
  unless a listener prevents it. With `{ cancelable: false }`, the dialog closes whatever the listeners do,
  as a browser can close it after a second Escape.
- `holdAnimationFrames()` holds the animation frames until the test ends, so a callback of `requestAnimationFrame` never runs.
- `waitFor(find, what)` gives the first value of `find` that is not null, undefined, or false.
  Between tries, the event loop takes one turn inside `act`. After 10 seconds it fails with `what` in the error.
  It needs real timers.
- `deferred()` gives a promise with its `resolve` and `reject`. Use it to hold a fake reply until the test lets it go.

happy-dom 21 has `showModal()` for `<dialog>`, but it only sets `open`. Its `close()` fires `close` at once.
It sends no close requests, such as for Escape, and it has no Popover API. Check a popover in a real browser.
Its `checkVisibility()` does not hide the content of an element with `hidden`, so `isShown` checks it.
The spinner of `@firna/ui` runs a continuous animation, which keeps an async `act` from settling in happy-dom.
A test that shows a busy state calls `holdAnimationFrames()`, so the real spinner stays on its first frame.
Replies, timers, and `waitFor` go on.

## Key code

- `fake-api.ts` handles requests and records them. A reply for the path of
  an upload route answers each raw file sent there, whatever file the query
  names.
- `fake-files.ts`: `fetchFiles`, the raw file upload over a fetch for tests
  and the dev fakes, which reports no progress, and `sentFiles`, the files
  that a fake got.
- `mount.ts` mounts React components in DOM tests, acts as a person does, and waits for a state.
- `dom-queries.ts` finds shown elements in DOM tests, and says whether a person can use them.
- `message-field.ts` focuses, types into, pastes into, presses keys in, clears, and reads the message field of a composer.
- `file-picker.ts` picks files with the first Attach files button of a composer.
- `file-drop.ts` drags and drops files, folders, and text, as Chrome gives them.
- `fake-core-routes.ts` records account, org, settings, section, member, and routine replies: the list, and the read, update, and delete of each routine, and a create. Each routine, and the routine that a create answers, also has each page of its runs and a Run now that starts a run on a new workspace.
- `fake-workspace-routes.ts` records workspace, session, message, and view replies.
- `fake-tool-routes.ts` records file, terminal, preview, desktop, and GitHub replies, also the member action routes of GitHub.
  Its upload replies give each file the `path` that `attachmentPath` in `src/shared/attachment-paths.ts` builds, as the Worker does.
- `fake-api-routes.ts` defines the reply registration interface.
- `fake-events.ts` supplies history and live event messages.
- `fake-terminal.ts` supplies decoded terminal output and records input and resize calls.
- `recorded-chat.ts` supplies partial text, tools, queued messages, steer, stop, failure, omission counts, and refusal markers.
- `recorded-files.ts` supplies complete browser reports, runner parts, consecutive tree deltas, reads, diffs, and a size error.
- `recorded-repairs.ts` supplies the first losses, failed repairs, complete reports, and tree deltas of the data without a session, and stores failed repairs in the fake history.
- `fixtures/core.ts` maps account and org samples to the shared contracts.
- `suspended-org.ts` serves Acme as a suspended org, and gives the body of an `org_suspended` refusal.
- `operator.ts` serves the operator section of the samples, and gives the body of an `operator_required` refusal.
- `waitlist.ts` serves a person who waits for app access, and gives the reply of a refused code. `fixtures/waitlist.ts` gives the person, the waitlist states, and the codes of the mockups.
- `fixtures/operator-samples.ts` and `fixtures/operator.ts` give the sample orgs and users of the operator section, and build its replies.
- `fixtures/operator-access-samples.ts` and `fixtures/operator-access.ts` give the waitlist, the codes, and the app access of the samples, and `disabledCode`, the reply of a disable. `fixtures/operator-access-records.ts` gives `sampleAccessRecords`, the records that an operator changes.
- `fixtures/repositories.ts` supplies GitHub repository choices before org creation and the org's repository records.
- `fixtures/routines.ts` maps the routines of the mockups, newest first, with the last run of each, to the shared contracts. Its `runs` are the runs that the page of each routine lists in the mockups, or else its last run. Its `created` is the reply of a create: the routine that the flow "Create a routine" saves.
- `fixtures/routine-runs.ts` maps the run lists of the mockups to the runs of the API: each cause of a failed run and each reason of a skipped run as the Worker stores them, with the login of an account outside the org. `runsPage` gives one page of runs as the Worker pages them.
  Each run includes its agent and owner for the shared run contract. A member who left the org stays the owner of their runs, as the Worker keeps their user record.
  A run whose first start or first turn failed keeps its workspace, and a run that a check failed has none.
- `fixtures/routine-triggers.ts` turns a trigger of a save into the trigger of a reply: a preset with its cron, and each login with a fake GitHub ID.
- `fixtures/workspaces.ts` maps workspace and session samples, and `senderSnapshot` copies the identity of a person as a session starter.
- `fixtures/tools.ts` maps file, GitHub, and tool samples. `FAKE_GITHUB_HEAD_SHA` is the head commit of each fake pull request.
- `fixtures/devices.ts` maps the Mac command samples of the mockups: requests in each state, the pairing, and the Mac settings.
- `fake-device-routes.ts` records the Mac command, pairing, answer, and Mac settings replies.

See [the shared contracts](../shared/README.md) and
[the backend fakes](../../worker/test-support/README.md).
