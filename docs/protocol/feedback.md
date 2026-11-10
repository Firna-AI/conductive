# Feedback

This doc holds the requirements and the decisions in force for feedback.
A person writes a message to the Conductive team in the Feedback dialog,
and can add screenshots. The Worker emails the message, the screenshots,
and the context of the page to the team inbox through Resend
(decision 270). The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue-palette.md#feedback)
draws the dialog at `app/feedback`, on desktop and on a phone.

## Terms

- **Team inbox:** the mailbox that gets each feedback email. The email
  provider of the operator hosts it. The Worker secret `FEEDBACK_EMAIL`
  holds its address.
- **Reply address:** the primary verified email of the GitHub account of
  the person, which the Worker keeps at each sign-in.
- **Draft:** the text and the screenshots in the dialog, until a send
  succeeds.

## Where feedback goes

- Each feedback message goes to the team inbox as one email, which Resend
  sends (decision 270). Reason: the person stays in the app, as in the
  Feedback dialog of Conductor, and the team replies from its inbox.
- These approaches were rejected (decision 270):
  - A mail link, a new issue on a public GitHub board, or a private board
    of an outside service, because each takes the person out of the app.
    The Mac app also drops `mailto:` addresses.
  - An issue in a private GitHub repository, because the GitHub API cannot
    attach a file to an issue.
  - A copy in the database of the app with a Feedback tab in the operator
    section, because that section shows no chat, file, or email address.
  - Another outside tool, such as a help desk or a chat channel, because
    it adds an outside service and a secret.
  - A hosted widget in the page, because the
    [content security policy](access-and-security.md#content-security-policy)
    loads no outside code (decision 67).
  - A workspace in an org of the team, because the Worker would then write
    into an org that the sender cannot reach.

## The entry point

- The Send feedback row of the command palette opens the dialog over the
  current page. [Help](command-palette-actions.md#help) states where the
  row shows, and its exceptions to the rules of the palette.
- The dialog has no address, as the New workspace dialog has none.
  Reason: the dialog sits over the current page.

## The dialog

- The Feedback dialog uses the dialog of the app: a dialog on desktop, and
  a sheet on a phone. It uses the wide layout. Reason: the message box
  needs more room than a question.
- Its title is "Send feedback", as the row.
- In order, it holds the message box, the context line, the reply line,
  Cancel, and Send.
- The button is Send. Reason: the button repeats only the verb of the
  title.
- The message box takes the focus when the dialog opens. Its empty text
  says "Report a bug, share an idea, or ask a question".
- The message box follows [the send key](create-a-workspace.md#the-send-key)
  of every composer. Reason: one key rule in every composer.
- Send waits for text that is not blank.
- On a computer, Send shows the hint of the Enter key, as Create of the
  New workspace dialog does. A phone shows no hint, because Enter adds a
  line there.
- Escape, Cancel, and a press outside close the dialog, except while a
  send runs.

## Screenshots

- Add screenshots opens the file picker. A paste of an image into the
  message box adds a screenshot too, and so does a drop on the dialog.
- Each screenshot shows as a chip with its name, its size, and Remove.
- The chips sit above the text inside the message box, and Add screenshots
  sits under the text. Reason: every composer puts its files there, so a
  paste adds the chip where the person looks.
- The dialog takes only PNG, JPEG, GIF, and WebP images (decision 274).
  It finds the type from the first bytes of each file, with the same check
  as the Worker. So a renamed file of another type fails at once.
- Reason: the team then opens only images of these four types, whatever
  a crafted request sends. The screenshot tools of macOS, Windows, and
  Linux save PNG or JPEG files.
- The screenshots of one message can contain at most 7 MB in all, or
  7,000,000 bytes. Reason: the body of the route can contain at most
  10 MB, and base64 makes the screenshots a third larger.
- The limit counts in units of 1000, as the
  [limit of a chat file](messages-and-attachments.md#attachments) does.
  Reason: one rule for the limits of the app.
- The dialog refuses a file that passes the limit or has another type, and
  keeps the other screenshots.
- A notice under the message box says "<name> wasn't added". Then it says
  "Together, the screenshots can be up to 7 MB." or "Add a PNG, JPEG, GIF,
  or WebP image."
- The notice gives no size of the file, as the notice of a chat file over
  its limit gives none. Reason: the chips count sizes in units of 1024.
- The dialog removes the metadata of each image before the send, such as
  the place where a photo was taken. Reason: a screenshot needs none, and
  a photo can hold the location of the person.
- These approaches were rejected (decision 274):
  - Any file that says it is an image, because an SVG file with a script,
    or a file with a false type, then reaches the team.
  - A conversion of other images to PNG in the dialog, because the
    screenshot tools already save PNG or JPEG files.
  - A redraw of each screenshot through the Images service of Cloudflare,
    because it needs a new binding and costs money above a free allowance.
  - A malware scan, because it needs a new outside service and finds only
    known attacks.
  - An image decoder in the Worker, because one large decoded screenshot
    can hold half of the memory of an isolate.

## What a message carries

- The dialog sends the text, the screenshots, the ID of the org of the
  palette, the ID of the open workspace, the app version, and whether the
  page runs in the Mac app (decision 271).
- The app version is the version number of the app and the short commit
  of its build. The web app and the Mac app both give it.
- The Worker adds the user ID, the GitHub login, the numeric GitHub ID,
  the `User-Agent` header of the request, and the time of the send.
- The Worker keeps the org ID only when the person is a member of that
  org. It keeps the workspace ID only when the workspace belongs to that
  org. Otherwise it leaves out that ID, and sends the rest. Reason: the
  email must not point the team at an org that the person cannot reach.
- The message carries no page address, and no name of an org or a
  workspace. Reason: the address of a file view holds the file path, and a
  name can hold private words. The IDs let the team find the org in the
  operator section.
- The context line says "The message also includes the current org, the
  open workspace, the app version, and your browser." Its words stay the
  same on each page. Reason: a page without an open workspace sends no
  workspace ID, so the line stays true.
- Reason for the screenshots and the context: screenshots carry most bug
  reports about screens, and the context lets the team find the workspace.
- These approaches were rejected (decision 271):
  - The text alone, or the text and the context without screenshots.
  - A kind that the person picks, such as bug, idea, or question.
  - The state and the cloud computer ID of the open workspace.
  - An automatic capture of the page, because a capture inside the page
    shows the frames of a port preview and of the live desktop as blank.
    The Mac app does not let the page capture the screen.
- The recent errors of the app, behind a checkbox as in Conductor, can
  come later.

## The reply address

- The team replies to the reply address of the person (decision 272).
- The reply line names that address before the send: "The team replies to
  <address>."
- Without a reply address, the line says "To get a reply, add a verified
  email on GitHub, then sign in again." Reason: the Worker reads that email
  at each sign-in.
- Reason: the person types nothing, and sees which address the team gets.
- These approaches were rejected (decision 272):
  - No reply address, with only the GitHub login in the email.
  - An email field in the dialog, also only for an account without a
    primary verified email.
  - A menu of the verified emails of the person.
  - A read of the emails from GitHub each time that the dialog opens.
  - A reply inside the app, because it needs a stored copy of each message.

## A send

- While a send runs, Send shows a spinner and "Sending". Cancel and Add
  screenshots are off. Escape and a press outside do nothing, as in the
  New workspace dialog while it creates. Reason: a failure then shows
  beside the kept draft.
- After a send, the dialog closes, and a toast says "Thanks for your
  feedback", in the success tone.
- A failed send keeps the draft. A notice under the message box says "The
  feedback wasn't sent", then the message of the error. Send stays on, and
  a new press of Send tries again.
- A repeat of a send of the same draft sends one email, also after a lost
  reply. A send of a changed draft sends a new email.
- A close without a send keeps the draft in the memory of the tab. The next
  open of the dialog shows it, and a send clears it. Reason: an Escape by
  mistake loses nothing, and the browser keeps nothing in its storage.

## The routes

- `GET /api/feedback` gives the reply address of the person, or none.
  Reason: the feature owns its read. The waitlist state gives the same
  address, but a change of the waitlist must not change the dialog.
- `POST /api/feedback` sends one message. Its JSON body holds a draft ID,
  the text, the context, and the screenshots, each with its bytes in
  base64. [Request bodies](access-and-security.md#request-bodies) gives its
  body limit.
- A person without app access gets HTTP 403 with the code
  `access_required` from both routes, as
  [What a person who waits can reach](waitlist.md#what-a-person-who-waits-can-reach)
  says. Reason: such a person sees only the waitlist screen.
- A member of a suspended org can send feedback. Reason: feedback changes
  no org.
- The Worker refuses blank text with HTTP 400, and screenshots over
  7,000,000 bytes in all with HTTP 413.
- It refuses a file whose first bytes are not a PNG, JPEG, GIF, or WebP
  image with HTTP 400 (decision 274). Reason: the dialog never sends these,
  so only a crafted request meets these refusals.
- Without a team inbox, a send gets HTTP 503 on every origin, also on a
  local app origin.
- When Resend refuses the email, the send gets HTTP 502. A deployed origin
  without the Resend key gives HTTP 502 too, as for an org invitation.
- The dialog shows each error.
- The app sets no limit on how often a person sends (decision 276). An
  operator suspends a person who misuses it, as
  [Suspend a user](operator-actions.md#suspend-a-user) says.
- Risk: the feedback emails share the Resend account of the invitation and
  approval emails. A person who sends in a loop can use up its send quota.
  The other emails then fail. An approval email tries again for 24 hours,
  then stops.
- A limit of 10 feedback sends in an hour for each person can come later.
  It would count only feedback emails. A limit only in the dialog was
  rejected, because a crafted request skips it.

## The email

- The email comes from `Conductive feedback <feedback@mail.conductive.build>`.
- It goes to the team inbox. Reason: a Worker secret holds the address, so
  a personal address stays out of the repository.
- Its reply address is the reply address of the person, when the Worker
  has one.
- Its subject is "Feedback from <login>", with the GitHub login of the
  person.
- Its body is plain text. It holds the message, then the context, with
  links to the operator pages of the user and the org.
- Each screenshot goes as an attachment. The Worker names each attachment,
  and gives its media type, from the type that it found in the first bytes
  (decision 274). No name and no media type from the request reach the
  email.
- Reason: Resend takes the type of an attachment from its file name,
  unless the Worker gives the type. So a name from a request could give
  the bytes another type.
- The same rule holds for each attachment of every email of the Worker,
  also of a later email.
- On a local app origin, the Worker writes the email of a valid send to
  its log and sends nothing, as it does for the other emails. Such a send
  needs no Resend key, but it needs a team inbox, as
  [The routes](#the-routes) says.
- The Worker keeps no copy of feedback. Outside a local app origin, its
  log holds no feedback text.

## The Terms and the Privacy page

- The Terms let the operator use feedback to improve Conductive, with no
  duty to the sender (decision 273). This paragraph is in their section
  "Your work".
- A new Terms revision applies this paragraph at the next sign-in of each
  person, as [Sign-in](access-and-security.md#sign-in) says. Risk: until
  then, at most 7 days later, a send falls under the earlier revision.
- The dialog shows no text about the Terms. A line near Send and a
  checkbox before Send were rejected. A checkbox adds a step and a gate to
  each send.
- The Privacy page names the feedback data, its route through Resend to
  the team inbox, and the reply address.
- It says that the team keeps each feedback email while it helps to
  improve Conductive (decision 275). The team deletes the email when it
  stops helping, or when the sender asks.
- It names the host of the team inbox by its kind, the email provider of
  the operator. Reason: a move of the team inbox to another host then
  needs no change of the page.
- A named host, and a fixed keep time such as 2 years, were rejected. A
  fixed time needs a delete rule in the inbox.
