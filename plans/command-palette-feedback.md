# Send feedback from the command palette

Status: Active. On branch `calummoore/command-palette-feedback-option`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive has no way to send feedback from the app. Its only contact
addresses are `abuse@` and `legal@` at the product domain. This change adds
a "Send feedback" row to the command palette. The row opens a Feedback
dialog. The person writes a message and can add screenshots. The Worker
emails the message, the screenshots, and the context of the page to a team
inbox through Resend. The team can reply to the primary verified email of
the person's GitHub account.

The user chose this approach in a brainstorm on 10 November 2026, with
decisions 218, 219, and 220. Decisions 221 to 224 are open. The change does
not cover these:

- A log of the recent errors of the app. The user chose it for a follow-up
  item, in decision 219.
- Other entry points, such as the Help menu of the Mac app.
- A copy of the feedback in the app's database, or a page that lists it.

Contract owners:

- `docs/protocol/feedback.md`, a new protocol doc.
- [Command palette](../docs/protocol/command-palette.md), and the new page
  that takes its sections Actions and Settings.
- [Request bodies](../docs/protocol/access-and-security.md#request-bodies),
  for the body limit of the feedback route.
- [Deployment inputs](../docs/deployment.md), for the team inbox.
- The Privacy page in `src/marketing/privacy.ts` and
  `src/marketing/privacy-uses.ts`, and the Terms page in
  `src/marketing/terms.ts`.
- The [Worker README](../worker/README.md), the
  [app API README](../worker/app-api/README.md), and the
  [web app README](../src/app/README.md).

## Decisions

The decision numbers continue from the highest number on `origin/main` on
10 November 2026, which was 217. The last milestone checks them for a
collision before the pull request.

Two options checks ran on 10 November 2026. The first ran over decisions
218 to 221. It kept the chosen options of 218, 219, and 220, and it added
options to each. It changed the recommendation of 221 from B to D. Its new
problems gave decisions 222, 223, and 224, and design changes. The second
ran over decisions 222 to 224. It added options to each, and changed the
recommendations of 222 and 224. Its new problems gave more design changes,
and the follow-up item `plans/follow-ups/invitation-email-send-limit.md`.
Their reports are in `.context/command-palette-feedback/`.

### 218. Choose where feedback goes

Added on 9 November 2026 by the brainstorm of this change.

- **Root question:** How does a person send feedback to the Conductive
  team from the command palette, and where does the team read it?
- **Options:**
  - **A.** Mail link. The row opens a new email to a team address in the
    person's email app. The Mac app drops `mailto:` addresses today, so it
    needs a change. Effort: Small.
  - **B.** Public GitHub board. The row opens a new issue in a public
    repository of the team. Effort: Small.
  - **C.** Dialog, sent by email. The Worker emails each message through
    Resend to a team inbox. Effort: Medium. With the screenshots of
    decision 219, the whole plan is Large.
  - **D.** Dialog, filed as an issue in a private GitHub repository of the
    team, with a new GitHub token. The GitHub API cannot attach a file to
    an issue. Effort: Medium.
  - **E.** Dialog, kept in the app's database, with a Feedback tab in the
    operator section. The rule that the operator section shows no chat,
    file, or email address must change. Effort: Large.
  - **F.** Dialog. The Worker posts each message to another outside tool
    through its API, such as a help desk or a team chat channel. It adds
    an outside service, a secret, and a recipient on the Privacy page. A
    chat webhook cannot carry screenshots. Effort: Medium. Added by the
    options check.
  - **G.** Private hosted board by link. The row opens a board of an
    outside service, where only the team sees the posts. It adds an
    outside service with its own sign-in, and the board gets no context.
    Effort: Small. Added by the options check.
- **Left out:** Change nothing, because it fails the goal. A hosted widget
  in the page, because it loads outside code in pages that show private
  code, which the content security policy of decision 67 forbids. A
  feedback workspace in the team's org, because the Worker would then
  write into an org that the sender cannot reach.
- **Recommendation:** C.
- **Chosen:** C, by the user on 10 November 2026. Reason: it gives an
  in-app dialog like the Feedback dialog of Conductor. It reuses the email
  sender of the Worker, and the team can reply from its inbox.

### 219. Choose what a message carries

Added on 9 November 2026 by the brainstorm of this change.

- **Root question:** What does a feedback message carry, so that the team
  can act on it?
- **Options:**
  - **A.** The text only. The Worker adds the GitHub login of the sender.
    Effort: Small.
  - **B.** A, plus the context: the org and the workspace of the page, the
    app version, the browser, and whether the Mac app sent it. The dialog
    says what it adds. Effort: Small.
  - **C.** B, plus screenshots that the person picks, pastes, or drops. The
    route declares a larger limit, such as 10 MB. Effort: Medium.
  - **D.** C, plus the recent errors of the app behind a checkbox, as in
    Conductor. Effort: Large.
  - **E.** C, plus the facts that the Worker holds about the open
    workspace: its state and its cloud computer ID. Effort: Small. Added by
    the options check.
  - **F.** C, plus a kind that the person picks: bug, idea, or question.
    Effort: Small. Added by the options check.
- **Left out:** An automatic capture of the page. A capture inside the page
  shows the frames of a port preview and of the live desktop as blank. The
  Mac app does not let the page capture the screen.
- **Recommendation:** C.
- **Chosen:** C, by the user on 10 November 2026, with D as a follow-up
  item. Reason: screenshots carry most bug reports about screens, and the
  context lets the team find the workspace.

### 220. Choose how the team replies

Added on 9 November 2026 by the brainstorm of this change.

- **Root question:** How does the team answer the person who sent
  feedback?
- **Options:**
  - **A.** No reply address. The message names the GitHub login. Effort:
    Small.
  - **B.** An optional email field in the dialog. Effort: Small.
  - **C.** The primary verified email of the GitHub account. The dialog
    shows that address before the send. Effort: Small.
  - **D.** C, plus an optional email field only for an account without a
    primary verified email. Effort: Small. Added by the options check.
  - **E.** C, but the Worker reads the emails from GitHub each time that
    the dialog opens, so a new primary email counts without a new sign-in.
    Effort: Medium. Added by the options check.
- **Left out:** A menu of the verified emails of the person, because the
  choice of address is a detail of C. A reply inside the app, because it
  needs a stored copy of each message.
- **Recommendation:** C.
- **Chosen:** C, by the user on 10 November 2026. Reason: the person
  types nothing and sees which address the team gets. The brainstorm
  graded C Medium, because it needed a stored primary email. Since then,
  `origin/main` keeps that email in `users.primary_verified_email` for the
  approval email of the waitlist. So C needs no new stored data.

### 221. Choose whether the Terms cover feedback

Added on 10 November 2026 while this plan was written. Open.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The section "Your work" of `src/marketing/terms.ts`, and
  `TERMS_VERSION` in `src/shared/terms.ts`.
- **Terms:**
  - **Terms revision:** the value `TERMS_VERSION`. Each sign-in records
    the revision that the person accepted. A new revision applies at the
    next sign-in of each person, at most 7 days later.
- **Background:**
  - The Terms say that a person keeps their rights in their content.
  - They let the operator store, copy, process, and transmit that content
    "as needed to provide the service".
  - The team uses feedback to improve Conductive. A fix of a reported bug
    provides the service. A new feature from an idea goes further.
  - A screenshot can show the private code of an org.
  - The Terms have no text about feedback.
- **Problem:** The Terms do not say what the operator may do with
  feedback.
- **Impact if no action:** The right of the operator to use an idea from
  feedback stays unclear.
- **Root question:** How does the operator get a clear right to use what a
  person sends as feedback, and where does the person agree to it?
- **Options:**
  - **A.** Change nothing. The general content permission of the Terms
    applies. Effort: Small.
  - **B.** Add one paragraph to "Your work": the operator can use feedback
    to improve Conductive, with no duty to the sender. Set a new Terms
    revision. Effort: Small.
  - **C.** Show the same words in the Feedback dialog, near Send, and
    change no Terms text. Effort: Small.
  - **D.** B and C together, with a narrower right. The paragraph lets the
    operator use the ideas and the text of feedback to improve Conductive.
    Screenshots stay under the general content permission. One line near
    Send says the same and links to the Terms. Set a new Terms revision.
    Effort: Small. Added by the options check.
  - **E.** The words of C as a checkbox, and Send waits for it. It adds a
    step at each send and a new gate on Send. Effort: Small. Added by the
    options check.
- **Left out:** A Feedback section with more rules. Its length is a detail
  of B, and a rule on private code in screenshots belongs with
  decision 223.
- **Wider fix:** None. A new feature has no class of defect to prevent.
- **Previous examples:** None found.
- **Related:** Decision 223 says how long the team keeps feedback.
- **Recommendation:** D, in place of B. A new revision applies only at the
  next sign-in, so with B alone, a send from an open session stays under
  the old Terms for up to 7 days. The line near Send covers that gap.
- **Action:** ask the user, because the option changes the legal terms of
  the service, and no requirement covers feedback.

### 222. Choose how the team opens screenshots safely

Added on 10 November 2026 from the options check. Open.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** The design of `POST /api/feedback` below, and the
  attachments that Milestone 3 adds to `worker/mail-sender.ts`.
- **Terms:**
  - **Media type:** the type that the browser gives a file, such as
    `image/png`. A crafted request can give any type and any name.
- **Background:**
  - Decision 219 lets a person add screenshots to feedback.
  - The Worker sends each screenshot to the team inbox as an attachment,
    through Resend. Resend takes the type of an attachment from its file
    name, unless the request of the Worker gives the type.
  - A crafted request can send an HTML file, an SVG file with a script,
    or a program, with any name and any type.
  - A crafted image can also attack the image decoder of a device. Such a
    flaw of WebP was used in real attacks in 2023.
  - The email comes from the product's own address, so the team can trust
    it more than an email from a stranger.
- **Problem:** The first design took any image type, and kept the name and
  the type that the request gives.
- **Impact if no action:** A person with app access can send a harmful
  file to the team inbox from the product's own address.
- **Root question:** How does the team open each screenshot of a feedback
  email safely, whatever bytes, name, and type a crafted request sends?
- **Options:**
  - **A.** Any file that says it is an image. The Worker names each file
    itself, such as `screenshot-1`, with the extension of the stated type.
    An SVG file with a script, or a file with a false type, still reaches
    the team. Effort: Small.
  - **B.** Only PNG, JPEG, GIF, and WebP files. The Worker checks the type
    from the first bytes of each file, and names each file from the type
    that it finds. The dialog runs the same check when the person adds a
    file, and refuses another file with a message that names the types.
    The Worker refuses another file with HTTP 400. Effort: Small.
  - **C.** B, but the dialog converts each other image that the browser
    can show into PNG before the send. So the person meets no refusal for
    an image. Effort: Medium.
  - **D.** B, and the shared mail sender takes an attachment only as a
    checked image kind with its bytes. The sender writes the file name and
    the type itself, so no caller can pass a name or a type from a
    request. A later attachment, such as the log of option D of
    decision 219, falls under the same rule. Effort: Small. Added by the
    options check.
  - **E.** B, and the Worker redraws each screenshot through the Images
    service of Cloudflare before the send. The devices of the team then
    decode only images that Cloudflare wrote. It needs a new binding, a
    fake for the tests, and a charge for each image above the free
    allowance. Effort: Medium. Added by the options check.
- **Left out:** A malware scan of each file, because it needs a new
  outside service and finds only known attacks, and E removes a crafted
  image with no new outside party. An image decoder inside the Worker,
  because one decoded large screenshot can hold half of the memory of an
  isolate.
- **Wider fix:** D. Its type keeps each later attachment under the same
  rule, while the check of B lives only in the feedback route.
- **Previous examples:** The upload route of a chat file takes any type,
  in `worker/chat/attachment-routes.ts`. Those files go to the cloud
  computer of the workspace, not to an inbox.
- **Related:** Decision 219 chose the screenshots.
- **Recommendation:** D, in place of B. It costs the same as B, and the
  screenshot tools of macOS, Windows, and Linux save PNG or JPEG files.
  E best protects the devices of the team.
- **Action:** ask the user, because D adds a refusal of a file type to the
  dialog and the route.

### 223. Choose where and how long the team keeps feedback

Added on 10 November 2026 from the options check. Open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The sections "Who gets your data" and "How long Conductive
  keeps data" of `src/marketing/privacy.ts`.
- **Terms:**
  - **Team inbox:** the mailbox that gets each feedback email. The Worker
    secret `FEEDBACK_EMAIL` holds its address.
- **Background:**
  - Decision 218 sends feedback by email to the team inbox. The app keeps
    no copy.
  - The Privacy page says how long each kind of data stays. UK data
    protection law asks for that time, or for the rules that set it. The
    data must go when it no longer serves its purpose.
  - The host of the team inbox, such as Google or Fastmail, also holds the
    feedback. Resend keeps the data of each sent email for 30 days, which
    the page covers in its sentence on the records of the providers.
  - The page names no host and no keep rule for the emails that people
    send to `legal@` and `abuse@` either.
  - The repository does not say which host the team inbox uses.
- **Problem:** The plan gives no time for feedback in the team inbox, and
  no host of that inbox.
- **Impact if no action:** The Privacy page cannot say who holds feedback
  or for how long.
- **Root question:** Where does the team keep feedback, and for how long,
  as the Privacy page must say?
- **Options:**
  - **A.** The team keeps each feedback email while it helps to improve
    Conductive. It deletes the email when it stops helping, or when the
    sender asks. The Privacy page states this rule and names the host of
    the team inbox. A change of host then needs a change of the page.
    Effort: Small.
  - **B.** The team keeps each feedback email for a fixed time, such as
    2 years, then deletes it. The Privacy page states the time and names
    the host. The team needs a delete rule in its inbox. Effort: Small.
  - **C.** The rule of A, but the Privacy page names the host by its kind,
    "the email provider of the operator", as it treats the emails to
    `legal@` and `abuse@` today. A change of host needs no change of the
    page. Effort: Small.
  - **D.** One section of the Privacy page, "Emails to the team", covers
    feedback and the emails to `legal@` and `abuse@`. It names their host
    and gives a keep rule for each kind of email. The operator gives these
    facts for the two addresses too. Effort: Small. Added by the options
    check.
- **Left out:** A copy in the app's database with a delete job. It fails
  the goal, because the email in the team inbox still needs its own keep
  rule.
- **Wider fix:** D. Each later address of the team falls under the same
  section.
- **Previous examples:** The Privacy page gives a time for unsent files
  and for a deleted org: 7 days each.
- **Related:** Decision 221 covers the use of feedback in the Terms.
- **Recommendation:** C, in place of A, which the options check kept with
  a fixed reason. C needs no timer, and no fact that only the operator
  knows. It stays true when the team moves its inbox. D best covers the
  other emails to the team, in a separate change.
- **Action:** ask the user, because the keep rule and the naming of the
  host are legal choices of the operator. A and B also need the host of
  the team inbox.

### 224. Choose how often one person can send feedback

Added on 10 November 2026 from the options check. Open.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** The design of `POST /api/feedback` below, and
  `worker/mail-sender.ts`.
- **Background:**
  - Each feedback send makes one request to Resend.
  - The invitation emails and the approval emails use the same Resend
    account, with one send quota and one rate limit.
  - Without pay-as-you-go, Resend refuses each send after the quota runs
    out. With it, each extra email costs money.
  - An approval email tries again for up to 24 hours, then stops.
  - The Free plan of Resend allows 100 emails a day. `docs/deployment.md`
    does not say which plan the deployment uses.
  - The Worker has no rate limit for user requests today. Org invitations
    have no send limit either.
  - An operator can suspend a person who misuses the app.
- **Problem:** One person can send feedback with no limit.
- **Impact if no action:** A person who sends feedback in a loop can use up
  the send quota, or run up a bill. Invitation and approval emails then
  fail, and an approval email can stop for good.
- **Root question:** How do the invitation and approval emails keep
  working, at a bounded cost, while one person sends feedback in a loop?
- **Options:**
  - **A.** No limit. An operator suspends a person who misuses it. A loop
    can use a day of the Free plan in seconds, before an operator can act.
    Effort: Small.
  - **B.** A limit for each person, such as 5 sends in an hour. The Worker
    answers a send above it with HTTP 429, and the dialog says when to try
    again. It needs a table of send times, a dialog state, and its mockup.
    Effort: Medium.
  - **C.** A limit for the whole app, such as 50 feedback emails in a day,
    which keeps the rest of the quota for the other emails. One person can
    still use all of it. Effort: Medium.
  - **D.** Send feedback through the email service of Cloudflare, to the
    team inbox as a verified address. Cloudflare sends such email free and
    outside the Resend quota, with attachments and a reply address. It
    needs Email Routing on the sending domain. Effort: Medium.
  - **E.** Feedback uses a second Resend team, with its own key, its own
    sending subdomain, and its own quota. A second team needs a paid plan,
    such as Pro. Effort: Small. Added by the options check.
  - **F.** B and C together, from one table of send times: a limit for
    each person, such as 5 in an hour and 10 in a day, and a daily limit
    for the whole app below the quota of the plan. A send above a limit
    gets HTTP 429, and the dialog says when to try again. Effort: Medium.
    Added by the options check.
  - **G.** The shared mail sender applies the limits of F to each email
    that a person's request starts: feedback and org invitations. The
    approval email stays outside the limits, because an operator starts
    it. It adds a refusal to the org invitations on `origin/main`, so their
    protocol doc and their screen change too. Effort: Medium. Added by the
    options check.
- **Left out:** A limit in the dialog alone, because a crafted request
  skips it. The rate limit binding of Cloudflare Workers as the counter,
  because it counts only over 10 or 60 seconds, apart in each location.
- **Wider fix:** G. D takes only feedback off the shared quota, while org
  invitations can still use it up.
- **Previous examples:** The draft files of the chat have no limit for one
  person either. The follow-up item
  `plans/follow-ups/draft-attachment-quota.md` asks the same kind of
  question.
- **Related:** The follow-up item
  `plans/follow-ups/invitation-email-send-limit.md` records the missing
  limit of org invitations.
- **Recommendation:** F, in place of B. B alone keeps no room in the
  quota, and one person can add accounts with an invite code. G best
  protects the other emails.
- **Action:** ask the user, because F adds a new refusal. The limits also
  need the Resend plan of the deployment.

## Design

Each line below is my design call of 10 November 2026, with its reason. A
line that waits for an open decision names it.

### The palette row

- The row is "Send feedback". Its search words are "bug", "idea",
  "support", "contact", "help", and "report".
- It is the one row of a new group, "Help", after "Window" on the Actions
  tab. On the All tab, it comes last among the actions. Reason: feedback
  is about the product, not about a workspace, an org, or the window.
- It shows on each page where the palette opens, also with no org and in a
  suspended org. Reason: feedback changes no org.
- The row breaks three statements of the palette doc, and the protocol doc
  states each exception:
  - "Each action does what the same control does in the app." The row has
    no other control.
  - "The palette offers only the actions that the current page offers."
    The app offers the row on each page.
  - Without an org, the palette "offers only Create org and the Account
    settings". It also offers Send feedback.
- Reason for the exceptions: the user asked for the palette, and a Mac
  menu item cannot open a dialog in the page, because the page has no
  bridge.
- The row is not a link, and the dialog has no address. Reason: the dialog
  sits over the current page, as the Archive question does.

### The dialog

- It uses the dialog of the app: a dialog on desktop and a sheet on a
  phone.
- It has a message box, Add screenshots, a line that names the context, a
  reply line, Cancel, and Send feedback. Decision 221 can add a line near
  Send.
- The message box takes the focus. It follows
  [the send key](../docs/protocol/create-a-workspace.md#the-send-key) of
  every composer. Reason: one key rule in every composer.
- Send waits for text in the message box.
- Add screenshots opens the file picker. A paste of an image into the
  message box, or a drop on the dialog, adds it too. Each screenshot shows
  as a chip with its name, its size, and Remove. Decision 222 sets the
  file types. With its options B to E, the dialog runs the same byte check
  as the Worker, from shared code, so a renamed file fails at once.
- The dialog removes the metadata of each image before the send, such as
  the place where a photo was taken. Reason: a screenshot needs none, and
  a photo can hold the location of the person.
- The screenshots of one message can add up to 7 MB in all. The dialog
  refuses a screenshot that passes this limit, and names the limit.
  Reason: the user chose a route limit near 10 MB, and base64 makes the
  screenshots a third larger.
- The context line says that the message includes the org and the
  workspace that the person has open, the app version, and the browser.
- The reply line names the primary verified email of the person: "The
  team replies to <address>." Without one, it says how to get a reply: add
  a verified email on GitHub, then sign in again. Reason: the Worker reads
  that email at each sign-in.
- A send shows its progress. A failed send keeps the text and the
  screenshots, and names what failed. A new press of Send tries again.
  Decision 224 can add a state that says when to try again.
- After a send, the dialog closes and a toast thanks the person.
- A close without a send keeps the draft in the memory of the tab. The
  next open shows it. A send clears it. Reason: an Escape by mistake loses
  nothing, and the browser keeps nothing in its storage.
- The mockups choose the final words of each text.

### What a message carries

- The dialog sends the text, the screenshots, the org ID of the org of the
  palette, the ID of the open workspace, the app version, and whether the
  page runs in the Mac app.
- The app version is the version of `package.json` and the short commit
  of the build. The web build and the Mac app build stamp it.
- The Worker adds the user ID, the GitHub login, the GitHub ID, the
  `User-Agent` header of the request, and the time.
- The message carries no page address and no name of an org or a
  workspace. Reason: the address of a file view holds the file path, and a
  name can hold private words. The IDs let the team find the org in the
  operator section.
- The Worker keeps the org ID only when the person is a member of that
  org. It keeps the workspace ID only when the workspace belongs to that
  org. Otherwise it leaves the ID out and sends the rest. Reason: the email
  must not point the team at an org that the person cannot reach.

### The routes

- `GET /api/feedback` gives the reply address: the primary verified email
  of the person, or none. Reason: the feature owns its read. The waitlist
  state gives the same address, but a change of the waitlist must not
  change the dialog.
- `POST /api/feedback` takes a JSON body: a draft ID, the text, the
  context, and the screenshots, each with its bytes in base64.
- The route declares a body limit of 10 MB at the Worker entry, as the
  chosen option of decision 219 said. Reason: a larger JSON body holds
  more memory, and an isolate has 128 MB for all of its requests, as
  decision 144 found.
- The Worker refuses blank text with HTTP 400, and screenshots over 7 MB
  in all with HTTP 413. Decision 222 sets the refusal of a file type.
  Reason: the dialog never sends them, so only a crafted request meets
  these refusals.
- Without a team inbox, the route answers HTTP 503. A refused email gives
  HTTP 502. The dialog shows each error.
- A person without app access gets HTTP 403 with `access_required`. The
  allow list of the waitlist already refuses every new route. Reason: such
  a person sees only the waitlist, which has no palette.
- The Worker keeps no copy of the feedback. Outside a local app origin,
  its log holds no feedback text.
- Decision 224 sets the limit on sends.

### The email

- The shared mail sender of the Worker sends it, from
  `Conductive feedback <feedback@mail.conductive.build>`. The sender gets
  a sender name, a reply address, and attachments. The invitation and
  approval emails stay as they are. Option D of decision 224 would send
  feedback through Cloudflare in place of Resend.
- It goes to the team inbox of the Worker secret `FEEDBACK_EMAIL`. Reason:
  a personal address stays out of the repository.
- Its reply address is the primary verified email of the person, when the
  Worker has one.
- Its subject is "Feedback from <login>". Its plain text holds the
  message, then the context, with links to the operator pages of the user
  and the org.
- Each screenshot goes as an attachment. The Worker gives Resend the name
  and the type of each file, as decision 222 sets them, so Resend never
  takes the type from a name that a request chose.
- The delivery key holds the user ID, the draft ID, and a hash of the
  body, as the key of an invitation does. Reason: a second press of Send
  after a lost reply sends one email. A changed draft gets a new key,
  because Resend refuses a key that it saw with another body.
- On a local app origin, the Worker writes the email to its log and sends
  nothing, as it does for the other emails.

### The legal pages and the docs

- The Privacy page names the feedback data, its route through Resend to
  the team inbox, and the reply address. Decision 223 gives the host and
  the time. The page also gets a new effective date.
- The row of `FEEDBACK_EMAIL` in `docs/deployment.md` says that the team
  inbox must match what the Privacy page says about its host.
- The Privacy page gets a sentence on how Resend sends data out of the UK.
  Reason: the page names Resend as a recipient, but its section on
  transfers does not name it, and feedback adds free text and screenshots.
- Decision 221 gives the Terms text.
- The architecture doc names Resend under "External services", with the
  invitation, approval, and feedback emails.
- The protocol doc `docs/protocol/command-palette.md` has 259 lines, above
  the length target. Its sections Actions and Settings move to a new page
  in the same change.
- The row "Help and feedback" of the Conductor Cloud comparison page
  becomes Available in the last implementation milestone. Its note names
  the palette row. Reason: the claim rule of Available holds when the pull
  request merges, if the team inbox is set by then.
- The overview guide of the public docs, `src/marketing/docs/overview.md`,
  gets a short section on how to send feedback. Reason: the palette is the
  only entry point, so a guide helps people find it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the palette row, the Feedback dialog with its states, and the user
flow, for desktop and for a phone. Read the `mockups` and `product-ui`
skills first. The texts that decisions 221, 222, and 224 add wait for
their answers.

- [ ] Add the Help group with Send feedback to the Actions tab of
      `app/command-palette/actions`, and a search for "feedback" to
      `app/command-palette/search`.
- [ ] Add the page `app/feedback`. Its canonical screen is the dialog with
      a message and one screenshot, over the workspace list.
- [ ] Add the child page `app/feedback/states`: the empty dialog, the
      dialog without a reply address, a send in progress, a failed send,
      and a screenshot over the limit.
- [ ] Add the child page `app/feedback/refusals` for the refusals that the
      answers of decisions 222 and 224 add: a file of another type, and a
      send above the limit. This TODO waits for those answers.
- [ ] Add the user flow `user-flows/send-feedback`: open the palette,
      search "feedback", write a message, paste a screenshot, send, and
      see the toast. It reuses the screens of the pages above.
- [ ] Choose the words of each text of the dialog and the toast, under the
      copy rules of the `product-ui` skill.
- [ ] Update `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for the feedback row,
the dialog, the routes, and the email. Delegate the legal pages to the
`external docs implementor`, and the rest to the `docs implementor`.

- [ ] Write `docs/protocol/feedback.md`: the row, the dialog and its
      states, what a message carries, the screenshots, the reply address,
      the email, the errors of the routes, and access. Cite each decision
      with its rejected options.
- [ ] Move the sections Actions and Settings of
      `docs/protocol/command-palette.md` to a new linked page. Add the
      Help group, the Send feedback row, and its three exceptions there.
- [ ] Add the body limit of the feedback route to
      [Request bodies](../docs/protocol/access-and-security.md#request-bodies).
- [ ] Add `FEEDBACK_EMAIL` to the secrets of `docs/deployment.md`. Say
      that the team inbox must match what the Privacy page says about its
      host.
- [ ] Add Resend to "External services" in
      `docs/architecture/components.md`. Add the new protocol docs to the
      list in `docs/architecture.md`.
- [ ] Read both legal pages in full. Update each sentence that the
      feedback facts change: the uses of data, the recipients, the
      retention, the GitHub emails, and the effective date. The host and
      the time wait for decision 223.
- [ ] Add how Resend transfers data out of the UK to "Transfers to other
      countries", from the published terms of Resend. Name the source in
      the commit.
- [ ] Apply decision 221 to the Terms page and `TERMS_VERSION`. This TODO
      waits for the answer.
- [ ] Update `plans/follow-ups/privacy-invitation-email-data.md`: remove
      the parts that `origin/main` and this change complete.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: The feedback routes of the Worker

Depends on: 2

Add the two routes, the email, and the body limit, with their tests.

- [ ] Add the shared types and limits in `src/shared/feedback.ts`.
- [ ] Give the shared mail sender in `worker/mail-sender.ts` a sender
      name, a reply address, and attachments. Keep the invitation and
      approval emails as they are, with their tests.
- [ ] Add `GET /api/feedback` and `POST /api/feedback` after the app
      request gate, with the checks, the context, and the email of the
      design.
- [ ] Apply decisions 222 and 224 to the route. This TODO waits for the
      answers.
- [ ] Declare the 10 MB body limit of `POST /api/feedback` at the Worker
      entry.
- [ ] Add `FEEDBACK_EMAIL` to `AppEnv`, with the local log and the 503
      without it.
- [ ] Test with the fake Resend: the email fields, the reply address with
      and without an email, the attachments, one email for a repeated
      draft, a new email for a changed draft, each refusal, the IDs of an
      org of which the person is not a member, and the local log.
- [ ] Update the [Worker README](../worker/README.md) and the
      [app API README](../worker/app-api/README.md).

## Milestone 4: The feedback client of the web app

Depends on: 3

Add the build version, the model of the dialog, and the dev fake, with no
screen.

- [ ] Stamp the app version in the builds of `vite.config.ts` and
      `desktop/vite.config.ts`, and give it to the app.
- [ ] Add the feedback model in `src/app/`: the read of the reply
      address, the draft in memory, and the send with its draft ID.
- [ ] Add the readers of the replies in `src/app/api/`.
- [ ] Add the two routes to the dev fake, so that the dialog works with
      `npm run dev`.
- [ ] Test the model: a send, a failed send that keeps the draft, a
      second send with the same draft ID, and the clear after a send.
- [ ] Update the [web app README](../src/app/README.md).

## Milestone 5: The palette row and the dialog

Tags: ui

Depends on: 1, 4

Build the row, the dialog, and the toast as the mockups draw them.

- [ ] Add the action `send-feedback` with its words to
      `src/app/palette/commands.ts`, and the Help group to the palette
      results.
- [ ] Add the host and the dialog of feedback under `src/shell/`, in the
      desktop frame and the phone frame. The palette passes its org and
      the open workspace to the dialog.
- [ ] Build the screenshots: the picker, the paste, the drop, the chips,
      the removal of metadata, and the 7 MB limit. Apply decisions 222
      and 224.
- [ ] Test the palette results: the Help group on each kind of page, and
      a search by each search word.
- [ ] Test the dialog in happy-dom: a send with a toast, a failed send
      that keeps the draft, a pasted screenshot, a screenshot over the
      limit, a photo whose location the dialog removes, Escape that keeps
      the draft, and the reply line with and without an address.
- [ ] Set the row "Help and feedback" of the comparison page to Available,
      with a new note. Add a short section on how to send feedback to the
      overview guide `src/marketing/docs/overview.md`. Delegate this TODO
      to the `external docs implementor`.
- [ ] Update `src/app/screens.md` and the READMEs of the changed folders.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, then the complete gate `npm run check`.
- [ ] Smoke-test the row and the dialog with `npm run dev`, on the dev
      fake. The Worker tests of Milestone 3 cover the email, because the
      dev app does not call the Worker.
- [ ] Ask the user to set the Worker secret `FEEDBACK_EMAIL` of the
      deployment to the team inbox before the merge. Without it, each send
      gets HTTP 503, and the comparison row is not true.
- [ ] Add the follow-up item `plans/follow-ups/feedback-recent-app-errors.md`
      for option D of decision 219.
- [ ] Search `origin/main` for decisions 218 to 224. On a collision,
      renumber the decisions of this plan and their citations.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Send feedback with a screenshot from the deployed app. Check the
      email, its reply address, and its attachment.
