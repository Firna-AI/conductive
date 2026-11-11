# Branded emails

Status: Active. On branch `calummoore/email-design-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive sends two emails through Resend: the org invitation and the
approval email. Both are plain text, with one or two sentences and a raw
link. They have no logo, no button, and no footer. A reply bounces,
because the sender domain `mail.conductive.build` has no MX record and no
address record. A DNS check on 9 November 2026 showed this.

This change gives both emails one branded layout. React Email components
draw it. The mockup catalogue shows the components, and the Worker renders
the same components when it sends an email. Each email gets an HTML part
and a plain text part with the same words. Every reply goes to
`hello@conductive.build`.

The change does not cover these:

- A brand logo in the inbox list, called BIMI. Decision 1 says why it
  waits.
- A DMARC record for `conductive.build`. BIMI needs one, and the domain
  has none.
- New kinds of email.
- The feedback email to the team inbox. Only the team reads it, and
  `docs/protocol/feedback.md` states it. It keeps its plain text and the
  reply address of the person who sent the feedback.
- The log of failed sends, in `plans/follow-ups/mail-failure-reason-not-logged.md`.
- The shared helper for outside requests, in
  `plans/follow-ups/worker-outbound-request-helper.md`.

Contract owners:

- `docs/protocol/emails.md`, which Milestone 2 creates.
- [Waitlist](../docs/protocol/waitlist.md#the-approval-email), for when the
  approval email goes and its retries.
- [Orgs and members](../docs/protocol/orgs-and-members.md#members-and-roles),
  for when an invitation goes.
- The [Worker README](../worker/README.md), the
  [members README](../worker/members/README.md), and the
  [operator README](../worker/operator/README.md#approval-email-delivery).
- The [mockups README](../docs/mockups/README.md) and the
  [catalogue](../docs/mockups/catalogue.md).
- [Deployment secrets](../docs/deployment.md#secrets).

Replaced ways:

- Plain text that each mailer writes by hand → one message builder that
  renders the React Email templates. Consumers: `worker/invitation-mailer.ts`
  and `worker/invitation-mailer.test.ts`, moved in Milestone 3.
  `approvalEmailContent` in `worker/operator/approval-email.ts`, its caller
  `worker/operator/waitlist-route.ts`, `worker/operator/waitlist-approval.test.ts`,
  and `worker/operator/approval-local.test.ts`, moved in Milestone 4. The
  words in `docs/protocol/waitlist.md`, moved in Milestone 2. The inline
  invitation text goes in Milestone 3. `approvalEmailContent` goes in
  Milestone 4.
- Approval email rows that save only parts of the request → rows that save
  the whole request. Consumer: each row that the old Worker saves before or
  during the deploy. With decision 4, such a row sends the request of the
  old code. A follow-up item removes that path 24 hours after the deploy.

Sources: [Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[Resend Templates](https://resend.com/blog/introducing-templates),
[Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys),
[React Email changelog](https://react.email/docs/changelog),
[React Email in a Worker](https://blog.cloudflare.com/email-service/),
[Vercel invite template](https://github.com/resend/react-email/blob/canary/apps/demo/emails/Community/notifications/vercel-invite-user.tsx),
[dark-mode support in email clients](https://www.caniemail.com/features/css-at-media-prefers-color-scheme/),
[Google BIMI setup](https://support.google.com/a/answer/10911320), and
[Google CMC change](https://www.valimail.com/blog/google-cmc-bimi-announcement/).

The options check of 10 November 2026 ran over the four decisions. Its
report is in `.context/branded-emails/options-check.md`. It added option E
to decision 1, options E to G to decision 3, and options D to F to
decision 4. It changed the recommendations of decisions 3 and 4.

## Decisions

### 1. Emails are bare plain text, with no brand

- **Answer:** The user chose C on 10 November 2026.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `worker/invitation-mailer.ts:33`, `worker/operator/approval-email.ts:12`, `worker/mail-sender.ts:26`.
- **Terms:**
  - **React Email:** an open-source library from the makers of Resend. It turns React components into HTML that email clients can show, and into plain text.
  - **Resend Templates:** a Resend feature since November 2025. It keeps a design in the Resend dashboard. Each send passes the template ID and the values to fill in.
  - **Idempotency key:** a request header. Resend sends only one email for each key within 24 hours. It refuses the same key with a different body.
- **Background:**
  - The invitation says "Cal invited you to join Example org on Conductive. Sign in with GitHub and accept your invitation:", then a link.
  - The approval email says "You can now use Conductive. Sign in with GitHub to get started:", then the app address. `docs/protocol/waitlist.md` fixes these words.
  - The app saves each approval email in D1, so each retry sends the same request with the same idempotency key.
  - Users write the org name and their GitHub name themselves.
- **Problem:** The emails show no brand. They do not say what Conductive is or why the person got the email. A person who does not know the product can take an invitation for spam or phishing.
- **Impact if no action:** Fewer invited people accept, and the first contact with the product looks unfinished.
- **Root question:** How should Conductive's emails look and read, so that a person trusts them and takes the next step?
- **Options:**
  - **A.** Keep plain text and rewrite the words. Add a clear subject, what Conductive is, who sent the invitation, what to do, and why the person got the email. There is still no logo or button. Effort: Small.
  - **B.** Write the HTML emails by hand in the Worker. One shared layout holds the logo, a heading, a button, the link, and a footer, and each email also gets a text part. This needs no new package. But we must do the escaping and handle email-client problems ourselves, such as buttons in Outlook. Effort: Medium.
  - **C.** Build the same layout from React Email components, and render the HTML and the text when the email is sent. JSX escapes the names, and the components handle email-client problems. This adds a package and puts the React server renderer into the Worker. The plan must test it in the Workers runtime. Effort: Medium.
  - **D.** Design both emails in Resend Templates, and send the template ID with the values. People who do not write code can change a design without a deploy. But the design is no longer in the repository, so it gets no code review, tests, or mockups. Each deployment also needs its own published templates. Effort: Medium.
  - **E.** Render the React Email templates to static HTML when the app is built, with a marker for each value. The Worker fills in the values with one escaping function. The catalogue and the sent email keep one source, and the Worker gets no React renderer. Cost: a build step, a drift check of the generated HTML, escaping in one hand-written function, and a generated variant for each conditional part. The options check added this option after the user's answer. Effort: Medium.
- **Left out:**
  - Change nothing. It does not meet the goal.
  - MJML or Maizzle, compiled at build time. E is better on every point, because it has the same build step and markers and needs no second template language.
  - BIMI, the brand logo next to the sender in the inbox. It needs DMARC enforcement, and the domain has no DMARC record. Gmail also needs a VMC, which needs a registered trademark, or a CMC, which needs 12 months of logo use. The logo dates from November 2026.
  - GitHub or in-app notices instead of email. Decisions 78 and 162 require both emails.
  - Cloudflare Email Service. It changes the provider, not the design, and it is in beta.
- **Wider fix:** C. One shared layout gives every email, including later ones, the brand, the escaping, and the app address of its deployment.
- **Previous examples:** No earlier design work. `plans/follow-ups/approval-email-deployment-origin.md` asks for one message builder for both emails. This change includes it.
- **Related:** Decision 2 changes the same code, `worker/mail-sender.ts`. Decision 4 exists because C changes the request of each approval email.
- **Recommendation:** C. Both emails get one branded layout in the TSX that the repository already uses, and the library handles escaping and email-client problems. E is the better choice if the Worker must stay free of React.
- **Action:** apply C, as the user chose.

### 2. Replies to the emails bounce

- **Answer:** The user chose B on 10 November 2026, with `hello@conductive.build` in place of the proposed `support@conductive.build`.
- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/mail-sender.ts:27`.
- **Terms:**
  - **MX record:** the DNS record that tells mail servers where to deliver mail for a domain.
  - **Reply-To:** an email header that sends replies to an address other than the sender.
- **Background:** Both emails come from `invites@mail.conductive.build`, and they set no Reply-To. `mail.conductive.build` has no MX record and no address record. The main domain, `conductive.build`, gets its mail through Google. The product already shows `abuse@conductive.build` and `legal@conductive.build`.
- **Problem:** A person who replies gets a bounce, for example when they ask who sent the invitation.
- **Impact if no action:** Questions from invited and approved people are lost, and the bounce makes the email look less real.
- **Root question:** Where should a reply to a Conductive email go?
- **Options:**
  - **A.** Leave replies as they are, and put a contact address in the footer, such as `abuse@conductive.build` for an unwanted invitation. Replies still bounce. Effort: Small.
  - **B.** Set Reply-To to a new address that a person reads. The user creates the mailbox or alias in Google Workspace. Effort: Small.
  - **C.** Send replies to an invitation to the inviter's verified email, and use B for approval emails. The invited person then sees the inviter's address, so the Privacy page must say so. Effort: Medium.
- **Left out:**
  - Receiving mail on `mail.conductive.build` through Resend. It adds a new system for a rare case, and B gets the same result with the Google mail that the domain already has.
  - An MX record that sends mail for `mail.conductive.build` to Google. B gets the same result with one header.
  - A sender on the main domain. It breaks the sender rule of `docs/protocol/waitlist.md`.
- **Wider fix:** B. The shared message builder sets the reply address of every branded email, so each later branded email gets it by default. The feedback email to the team keeps the reply address of the person.
- **Previous examples:** None found.
- **Related:** Decision 1 changes the same code. Decision 4 exists also because `reply_to` changes the request of each pending approval email.
- **Recommendation:** B. A person reads each question, and the address uses the Google mail that the domain already has.
- **Action:** apply B with `hello@conductive.build`, as the user chose.

### 3. Invitation emails can carry phishing text

- **Answer:** The user chose A on 11 November 2026.
- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `worker/http.ts:38`, `worker/app-api/feature-org.ts:21`, `worker/members/route.ts:79`, `worker/members/route.ts:137`, `worker/invitation-mailer.ts:35`.
- **Terms:**
  - **App access:** the right to use Conductive. A person gets it through an operator's approval, an invite code, or an accepted org invitation.
- **Background:**
  - A user with app access can create an org and invite any email address to it.
  - The invitation puts the org name in its subject and its text. It names the inviter with their GitHub name, or with the login when the account has no name.
  - The design of this plan also shows the org's initials in a tile.
  - Org creation and rename only trim the name and the initials, and refuse an empty name. Neither has a length limit or a character rule.
  - The GitHub name comes from GitHub at each sign-in. GitHub limits a login to 39 letters, digits, and hyphens.
  - The email passes the checks of its sender domain, so mail clients trust it as an email from Conductive.
  - React escapes the names in the HTML, so a name cannot add markup. A mail client can still turn a web address in the text into a link.
- **Problem:** A user can name an org with a message and a web address, such as "Your account is locked, go to example.net". Each invitation then carries that message to any address, in an email from Conductive. The inviter's GitHub name and the initials can carry a message too.
- **Impact if no action:** An attacker with app access can send phishing text from the domain of Conductive. Invite codes give app access, so app access is not hard to get. Complaints about such emails also hurt the delivery of every Conductive email.
- **Root question:** How do we keep an email from Conductive from carrying a message that a user chose, to people who did not ask for it?
- **Options:**
  - **A.** Change nothing. The waitlist and the operator's suspension already limit who can send. Effort: Small.
  - **B.** Limit an org name to 64 characters at creation and at rename. Cut the inviter's name in the email to the same length. A short message with a web address still fits. Effort: Small.
  - **C.** Do B, and also refuse an org name that holds a web address. An org that is named after its domain, such as "acme.com", gets refused. The inviter's GitHub name can still hold a web address. Effort: Small.
  - **E.** Show no free text that a user wrote. Name the inviter by GitHub login only. Leave out the org name and its initials, which the app shows after sign-in. The builder takes the login as a checked type, so a later email cannot add free text by accident. No name is refused. Cost: the email no longer names the org, so a person may trust it less. Effort: Small, while Milestone 1 has not drawn the invitation.
  - **F.** Keep the names, and pass each user-written value through one helper of the shared layout. The helper stops mail clients from turning the value into a link, for example with a word joiner after each dot. The message itself still arrives, and each mail client needs a one-time check. Effort: Small.
  - **G.** Do C, limit the initials to the length that the tile shows, and name the inviter by GitHub login only. The email keeps the org name. A message without a web address still fits in the org name. Effort: Small.
  - **D.** Limit the invitations of each admin to a fixed number each day. This limits the volume of any message, but not its text. It needs a counter in D1. Effort: Medium.
- **Left out:**
  - A check of each name by a model or a block list. Misspellings and look-alike letters get past both, so neither stops the message. E stops it with no check.
  - A hold of each invitation for review by the operator. It breaks decision 78, under which the app sends the invitation when an admin invites.
  - A report link in the email. It does not stop the email, and with decision 2 a reply already reaches a person.
  - A rule that only some admins may invite. It breaks the rule of `docs/protocol/orgs-and-members.md` that an admin invites.
- **Wider fix:** E. It makes the shared builder unable to carry free text, so no later email can carry a message either.
- **Previous examples:** None found.
- **Recommendation:** E. It is the only option that stops the message in every field, for existing orgs and later emails, with no refusal of a name. The first recommendation was C. G is the choice if the email must name the org, and D can cap the volume on top of it.
- **Action:** apply A, as the user chose. The email keeps the org name, the inviter's name, and the initials.

### 4. Approval emails that wait for a retry at the deploy

- **Answer:** The user chose F on 11 November 2026.
- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `migrations/202611091300_approval_emails.sql:1`, `worker/mail-sender.ts:26`, `worker/operator/approval-email.ts:33`.
- **Background:**
  - The app saves each approval email in D1, then sends it. A failed send stays pending, and the app sends it again with the same idempotency key for up to 24 hours.
  - A saved row holds the recipient, the subject, and the plain text. The mail sender adds the From line at each send.
  - With decisions 1 and 2, the request also gets the HTML and `reply_to`.
  - The deploy applies the migrations first, then deploys the new Worker. Between the two steps, the old Worker can still save rows of the old shape.
  - `worker/operator/README.md` promises that retries stay unchanged after a deployment.
- **Problem:** A row from before the new Worker gets a different request body under its old key. Suppose that Resend accepted an earlier attempt and its reply was lost. Each retry then gets 409 `invalid_idempotent_request`, and the row ends as failed although the email went. Resend's docs do not say whether a refused attempt keeps its key, so a refused email can also be lost.
- **Impact if no action:** A rare approval email ends as failed although it went, or it does not go. The person keeps app access and sees it at the next visit.
- **Root question:** What should happen to an approval email that waits for a retry when a deploy changes the request that the Worker sends?
- **Options:**
  - **A.** Send the saved text of an old row through the new sender. The body gains `reply_to` under the old key, with the risk of the problem above. A follow-up item removes this path after 24 hours. Effort: Small.
  - **B.** Do A, and keep the text-only path for good. Same risk as A. Effort: Small.
  - **C.** Make the migration mark each pending row as failed. The rare pending email is lost. A row that the old Worker saves during the deploy also fails. Effort: Small.
  - **D.** Send an old row with the exact request that the old code sent: the From line, the recipient, the subject, and the text, with no `reply_to` and no HTML. Resend then sees the same key and the same body. A follow-up item removes this path after 24 hours. That one email has no reply address. Effort: Small.
  - **E.** Do C, and merge only when the production database has no pending approval email. The user checks it. A row from an approval during the deploy is still lost. Effort: Small.
  - **F.** Save the whole request of each new approval email, as the JSON body that goes to Resend, in place of a column for the HTML. Each send and retry sends it unchanged, also after a later change to the sender, such as a new reply address or product name. An old row sends as in D, until a follow-up item removes that path after 24 hours. Effort: Medium.
- **Left out:**
  - Render the HTML for an old row at its next retry. A new body under the old key has the risk of the problem above.
  - A new idempotency key for an old row. It breaks the same-key rule of `docs/protocol/waitlist.md`, and it sends a second copy if an earlier attempt went.
  - Count a 409 `invalid_idempotent_request` as sent. Resend's docs do not say that only a sent email keeps its key.
  - Fill in the saved request of each pending row in the migration. It misses the rows that the old Worker saves during the deploy, so D's path is needed anyway.
- **Wider fix:** F. Each later change to the From line or the reply address causes the same case, and F keeps every pending retry unchanged.
- **Previous examples:** `migrations/202611072100_email_invitations.sql` discarded the pending invitations of the old shape. `migrations/202611072201_image_allocation_intent.sql` moved image build jobs that were in progress to a new phase.
- **Related:** Decisions 1 and 2 change the request.
- **Recommendation:** F. No email is lost, and no later change to the sender can break a pending retry. The first recommendation was A, which sends a new body under the old key. D is the smallest safe option.
- **Action:** apply F, as the user chose.

## Design

Each item below is my call, made on 10 November 2026, unless it names a
decision of the user. The mockup milestone shows the result to the user,
and a problem that the mockups show changes this section.

### Where the parts live

- The templates live in `docs/mockups/src/emails/`: one shared layout, the
  org invitation, the approval email, and one module with the words of
  both. They use only React Email components, inline styles, and the
  tokens of `docs/mockups/src/design/`. They use no `@firna/ui`, no CSS
  modules, and no fixtures, because the Worker imports them. Reason: the
  app already imports its shared parts from the mockup tree, and the
  Worker already reads `docs/mockups/src/brand.ts`. The catalogue and the
  sent email then share one source.
- The catalogue shows each email in `EmailFrame`, in
  `docs/mockups/src/components/emails/`. It draws a mail client: the
  sender, the reply address, the subject, and the email in an iframe whose
  `srcDoc` holds the static markup of the real template. Reason: an email
  is a full HTML document, and a page cannot hold one directly.
- Each template exports a function that returns its element, so that
  Worker files stay `.ts`. Reason: the knip project list reads `.ts` and
  `.mjs` files under `worker/`.

### The layout

- Each email has, in order: the logo and the product name, one heading,
  one or two short paragraphs, one button, the address of the button as
  a plain link, a divider, and the footer. The content is at most 480 px
  wide. Reason: developer tools commonly use this layout, as in the Vercel
  invitation template.
- Colours, fonts, and radii come from `docs/mockups/src/design/`. The
  email is light by default. It declares `color-scheme: light dark`, and
  it gives the dark palette to the email clients that read
  `prefers-color-scheme`. Reason: only about 42% of email clients read
  that query, and some invert colours on their own. A light base inverts
  more predictably.
- The logo is the app icon tile, `icon-192.png` of the app host, shown at
  28 px. The product name stands beside it as text. Reason: the lockup PNG
  has dark text on a clear background, which vanishes when a client
  darkens the email. The tile stays visible in both modes, and live text
  follows the colours of the client.
- The logo loads from the app address of the deployment, at a fixed path
  with no query. Reason: a fixed address identifies no reader.

### The words

The mockup review settles the final words. These are the proposal. They
follow the copy rules of the `product-ui` skill and the naming rules of
the product. With decision 3, the invitation keeps the org name, the
inviter's name, and the initials.

- The org invitation:
  - Subject: "Join Acme on Conductive", as today.
  - Preview line: "Cal invited you to join Acme."
  - The org's initials tile beside the org name, as the org rail shows
    it.
  - Heading: "Join Acme on Conductive".
  - Text: "Cal (@calummoore) invited you to join Acme." When the GitHub
    account has no name, the login stands alone.
  - Text: "Conductive gives every coding task its own cloud computer, where
    agents powered by Claude and Codex do the work." This follows the
    home page.
  - Button: "Accept invitation".
  - Under the button: "Sign in with a GitHub account that has
    sam@example.com as a verified email." Reason: the app shows an
    invitation only to an account with that verified email.
  - Footer: "This invitation went to sam@example.com. If you did not
    expect it, you can ignore this email. Questions? Reply to this email."
- The approval email:
  - Subject: "Your Conductive account is ready", as today.
  - Preview line: "Sign in with GitHub to get started."
  - Heading: "Your account is ready".
  - Text: "You can now use Conductive. Sign in with GitHub to get
    started."
  - Button: "Open Conductive".
  - Footer: "You got this email because you joined the Conductive
    waitlist. Questions? Reply to this email."
- The plain text part has the same words, with each link on its own line.

### Sending

- The sender stays "Conductive" at `invites@mail.conductive.build` for
  both emails, as `docs/protocol/waitlist.md` requires. The inviter's name
  never goes into the From line. Reason: users write their GitHub name, so
  it could pretend to be someone else.
- Both emails set Reply-To to `hello@conductive.build`, from decision 2.
  The message builder passes `replyAddress` of the words module to the
  mail sender, which already takes a reply address for each message.
- No email tracks the reader. Resend's open and click tracking stay off
  for `mail.conductive.build`, and no link or image holds an ID of the
  reader. Reason: the Privacy page does not cover tracking, and click
  tracking would send the invitation link through Resend.
- The text part comes from the words module, not from a conversion of the
  HTML. Reason: the text stays exact for text-only clients and for the
  tests.
- React escapes each user-written name in the HTML, so no name becomes
  markup. A mail client can still turn a web address in a name into a
  link. The user chose to keep this, in decision 3.
- One builder module in the Worker returns the subject, the HTML, and the
  text of an email, for the app address of the deployment. It loads
  React Email and the templates with a dynamic import when it builds an
  email. Reason: every request of the app runs through this Worker, and
  only an invitation or an approval needs the renderer.
- The Workers build of the React Email renderer imports `html-to-text`
  when it loads, and Prettier through a dynamic import. Milestone 3
  measures the Worker bundle against the size limit of Workers. Local
  workerd applies no CPU limit, so Milestone 3 records the render time as
  an estimate, and the post-merge check reads the CPU time of the first
  sends.
- The invitation keeps its delivery key: its ID and a hash of the full
  request body, which now includes the HTML. Reason: a repeated invitation
  with the same content still sends one email within 24 hours.
- The approval email saves its whole request, the JSON body that goes to
  Resend, in a new nullable `approval_emails.request` column, from
  decision 4. Each send and retry posts that body as it is. A row without
  a saved request, which the old Worker saved, sends the exact request of
  the old code: the From line, the recipient, the subject, and the text.
  Reason: Resend refuses a reused idempotency key with a different body.
- The approval email uses the app address of the request that approved
  it. This is option B of
  `plans/follow-ups/approval-email-deployment-origin.md`, so this change
  deletes that item.
- On a local app address, the builder still renders each email, and the
  sender writes its development line to the log, as today. Reason: local
  runs then use the renderer in the Workers runtime.

### Docs and tests

- A new protocol page, `docs/protocol/emails.md`, holds the rules of every
  email and the content of each one. `docs/protocol/waitlist.md` keeps
  when the approval email goes and its retries, and links to the new page.
  Reason: `waitlist.md` stays under its length target, and later emails
  get one home.
- The Privacy page gets no new recipient. A reply to
  `hello@conductive.build` is contact by email, like the existing
  `legal@conductive.build`. Milestone 2 still reads both legal pages in
  full, as the repository rule says.
- The comparison page does not change. The change ships, starts, or drops
  no listed feature.
- The tests extend the existing test of each email. A one-time check
  renders an email in the Workers runtime, and its output goes under
  `.context/branded-emails/`. Reason: the `testing` skill gives one test
  for each requirement, and it makes the proof of a runtime a one-time
  check.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The catalogue gets the two emails, at phone and desktop size, in the light
and dark schemes. The templates that it shows are the ones that the Worker
renders later.

- [x] Add React Email with `npm install react-email` in the root package,
      at the current 6.x release. Do not use `@react-email/components`,
      which npm marks as deprecated.
- [x] Create `docs/mockups/src/emails/` with the shared layout, its styles,
      the org invitation, the approval email, and the words module, as the
      design says.
- [x] Create `EmailFrame` in `docs/mockups/src/components/emails/`. Make
      the dark scheme of the catalogue show the dark colours of the email.
      If the strict build refuses an iframe, stop and report it.
- [x] Add the catalogue pages. `emails` is a folder without a screen of its
      own, because Mokly gives a folder with its own screen no title.
      `emails/invitation` shows the org invitation from Cal to
      `sam@example.com` for Acme, so that the flow goes on to Sam's
      waitlist screen. `emails/approval` shows the approval email for Sam
      Okafor. Use the existing fixtures. Add a variant with a long org name
      and a GitHub account without a name.
- [x] Add the approval email as a step of the Sign up flow. Add a flow for
      an org invitation that starts at the invitation email and uses the
      existing sign-in and waitlist screens.
- [x] Update `docs/mockups/README.md`, `docs/mockups/catalogue.md`, and
      `docs/mockups/design.md` for the emails.
- [x] Run `npm run mockups:check`. Smoke-test the new pages at both sizes
      and in both schemes. Screenshots: `.context/branded-emails/shots/`.
- [ ] Show the pages to the user, and apply the review.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the rules of the emails before the Worker changes.

- [ ] Create `docs/protocol/emails.md` for the emails to people: the org
      invitation and the approval email. Link to `docs/protocol/feedback.md`
      for the feedback email to the team. State the sender, the reply
      address, the parts of each email, the text part, the light design
      with dark colours, the escaped names, the app address of the
      deployment in each link, and no tracking. State the subject and the
      content of the org invitation and of the approval email, and link
      to the `emails` mockups. Give each
      decision in force with its rejected option and its reason.
- [ ] In `docs/protocol/waitlist.md`, replace the subject and the words of
      the approval email with a link to the new page. Keep when it goes,
      the saved message, and the retries.
- [ ] In `docs/protocol/orgs-and-members.md`, link the invitation
      requirement to the new page.
- [ ] Add the new page to the protocol lists in `docs/architecture.md` and
      `README.md`.
- [ ] In `docs/deployment.md`, under Secrets, say that
      `hello@conductive.build` must receive mail, that Resend's open and
      click tracking stay off, and that the logo loads from the app host.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact, such as
      "the text of each email" in the Resend item.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Invitation email and replies

Depends on: 2

The Worker renders the org invitation from the templates, and every email
gets the reply address. The approval email stays plain text until
Milestone 4.

- [ ] Add `"jsx": "react-jsx"` to `tsconfig.worker.json`, so that the
      Worker typecheck reads the templates. Do not add the DOM library.
      Run `npm run typecheck` and `npm run build`.
- [ ] Add the builder module beside `worker/mail-sender.ts`, as the design
      says.
- [ ] Make the mail sender send `html` when a message has it. Keep its
      sender, reply address, and attachments for the feedback email.
- [ ] Move the invitation mailer to the builder, and delete its inline
      text. The invitation route also passes the inviter's GitHub login
      and the org's initials.
- [ ] Extend `worker/invitation-mailer.test.ts`. Check the exact text
      part and reply address, each name escaped in the HTML, and the
      invitation link in the button and in the plain link. Keep the
      delivery key and local log cases.
- [ ] Measure the Worker bundle before and after, against the size limit
      of Workers. Render an invitation in the Workers runtime with
      `npm run preview` and a local invite, and record its render time.
      Save the results under `.context/branded-emails/`.
- [ ] Update `worker/README.md` and `worker/members/README.md`.

## Milestone 4: Approval email

Depends on: 3

The approval email uses the templates, saves its whole request, and links
to the app address of the deployment that approved the person.

- [ ] Add a migration that adds the nullable `approval_emails.request`
      column. Reserve a range for this plan in `migrations/README.md`, and
      describe the migration there.
- [ ] Build the approval email with the builder, from the app address of
      the approving request. Save its whole request in the grant batch.
      Delete `approvalEmailContent`.
- [ ] Let the mail sender post a saved request body as it is. Send the
      saved request on each retry. Send a row without a saved request with
      the exact request of the old code. Add the follow-up item that
      removes that path 24 hours after the deploy.
- [ ] Extend `worker/operator/waitlist-approval.test.ts`,
      `worker/operator/approval-retry.test.ts`, and
      `worker/operator/approval-local.test.ts`. Check the saved request,
      the link with the approving app address, the same request on a
      retry, and the exact old request for a row without a saved request.
- [ ] Delete `plans/follow-ups/approval-email-deployment-origin.md`, and
      name it in the commit.
- [ ] Update the approval email delivery section of
      `worker/operator/README.md`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and `npm run check`.
- [ ] Ask the user to confirm that `hello@conductive.build` receives mail.
      The merge deploys the change, so this happens before the merge.
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
      and the follow-up items that the change adds and deletes.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, send an invitation and approve a test account.
      Check both emails in Gmail on the web and on iOS, in Apple Mail, and
      in Outlook, in light and dark mode. Reply to one email, and check
      that the reply reaches `hello@conductive.build`. Read the CPU time of
      both sends in Workers Logs.
      `plans/follow-ups/waitlist-deployed-smoke-test.md` already checks
      that the approval email arrives.
