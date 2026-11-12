# Workspace links

This doc holds the requirements and the decisions in force for links to a
workspace. It covers Copy link in the workspace header and in the menus,
and the chips that
show a workspace link or a session link in chat text and in the message
field of each composer.
[Workspace numbers and links](workspaces-and-sandboxes.md#workspace-numbers-and-links)
gives the number, the label, and the link of each workspace. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue.md) draws these screens at
`app/workspace-links`, in New workspace, and in the flows
`user-flows/link-a-workspace` and `user-flows/open-a-session-link`.

## Copy link

- The label of the number in the workspace header is the Copy link button,
  on desktop and on a phone (decision 212).
- The button shows the label alone, with no link icon. When a pointer is
  over the button, it shows a hover effect.
- The accessible name of the button is "Copy link to" and the label, such
  as "Copy link to W-395".
- A press copies the link of the workspace, also in the Mac app. The copy
  holds no path of a tab, such as an open file. Reason: the link names the
  workspace.
- After the copy, a note under the button says "Link copied" for a moment.
  Reason: "Copied" alone could mean that only the number was copied.
- When the copy fails, the note says "The link didn't copy. Try again."
- The button keeps its label in both cases. The note is a status that
  screen readers hear. It lies over the content, so nothing moves.
- On desktop, the button comes after the name. On a phone, it starts the
  line under the name. Reason: the number joins the other names of the
  workspace, in the same order on both sizes.
- A button at the right end of the phone header was rejected, because it
  left the name too little room.
- The menu of each workspace row also has Copy link, which copies the
  same link, as [Copy link](workspace-menu.md#copy-link) says.
- The tab menu of each session tab has Copy link too. It copies the link
  of that session, as
  [Session links](agents-and-sessions.md#session-links) says.

## Chips

- A chip is a small rounded box in a line of text. It shows the list mark,
  the label of the number, and the current name of one workspace
  (decision 211).
- A chip changes when the name, the state, or the GitHub state of its
  workspace changes. This holds also on a phone, where the workspace list
  is not on the screen.
- Reason: the mark shows the live state, which matters when one workspace
  waits for another.
- The marks mean what they mean in the workspace list, as
  [The list mark](workspace-life.md#the-list-mark) says. A chip of an
  archived workspace shows that the workspace is archived.
- A chip keeps the height of its line of text. A long name is cut short,
  and the chip gives the whole name as its title.
- A chip never makes a message wider than its column. Reason: a long chip
  must not push a message past the edge of a phone screen.
- A chip shows only data that the app already shows the reader. No link
  makes the app send a request that reaches another org.

### Which links show as chips

- A link shows as a chip only when it meets all these rules:
  - It has the origin of the workspace links. This holds also in the Mac
    app, whose page has another origin.
  - Its path leads to a page of one workspace: the workspace or one of its
    tabs.
  - That workspace belongs to the org of the chat or of New workspace, and
    the reader may see it. An archived workspace counts too.
- In this doc, a workspace link is a link that meets these rules.
- A session link is a workspace link whose path names one session of that
  workspace, as [Session links](agents-and-sessions.md#session-links)
  says. It shows as a [session chip](#session-chips).
- Reason: people also copy the address bar, which can hold the path of a
  tab.
- The app resolves each link as a browser does before it looks for the
  workspace. So a chip always shows the workspace whose page a press
  opens, also for a link with `..` or other odd parts.
- Every other link stays plain text. Examples are a link to another org, to
  an unknown or removed workspace, or to a workspace that the reader may
  not see.
- Reason: a person sees only the workspaces of the orgs where they are a
  member, as
  [Orgs and workspaces](isolation.md#orgs-and-workspaces) says.
- A link of an earlier app domain stays plain text too. Reason: no change of
  the domain is planned, and a plain link still works where the old domain
  forwards to the new one.
- Text such as `W-395` stays text, also when a workspace of the org has
  that label (decision 211).
- Typed labels that become chips or links were rejected, because the
  message field then shows them as text, not as chips. A label meant as
  plain text would also become a link.

### Session chips

- A session chip shows the list mark and the label of the workspace of
  its session (decision 261). Then it shows the icon of a session tab and
  the title of the session.
- The mark and the label follow the rules of a chip above. The icon tells
  a session chip from a workspace chip, whose name takes the same place.
- A session without a title shows "Untitled". A long title is cut short,
  and the chip gives the whole title as its title. Screen readers hear
  "Session" before the title.
- A session of the workspace of the chat shows its current title. A
  session of another workspace shows its title from the load of the chat.
  Reason: the app gets no live updates from another workspace.
- The chip of a closed session looks like the chip of an open session.
- A link to a session that its workspace does not hold shows the chip of
  that workspace. Reason: the link still opens that workspace.
- A press on a session chip opens its session, as
  [Session links](agents-and-sessions.md#session-links) says.
- In the message field, a session chip works as the chip of a workspace
  does.
- Reason: a `Sent by:` line must name the session that sent its message,
  and a workspace chip alone does not name it.
- A session link that shows as the chip of its workspace was rejected,
  because the chip then does not name the session.
- A title from the text of a Markdown link was rejected. Any member or
  agent can write that text, and a chip shows only data that the app
  already shows.
- A session chip without the label of its workspace was rejected, because
  a link to another workspace then hides where the work is.
- A number for each session was rejected. It needs the number, a migration
  of the older sessions, and new session tabs.

## Messages and answers

- A workspace link in a sent message or in an agent answer shows as a chip
  (decision 211).
- A Markdown link whose target is a workspace link, such as
  `[W-395](<link>)`, shows as the chip alone. Reason: an agent often writes
  links in Markdown.
- A link in inline code or in a code block stays code. Reason: code shows
  exact text.
- A chip in a message or an answer is a link of the app. A press opens the
  page that its link names, in the same window, as the other links of the
  app do.
- In the Mac app, [Navigation](desktop-app.md#navigation) states where the
  page opens.
- A long word, such as a long link that stays plain text, breaks to fit the
  line. Reason: a long link must not pass the edge of a phone screen.
- A sent message keeps the plain link of each chip. The agent gets that
  link in the text of the message.
- Reason: the link names the workspace by its ID, so its label and its name
  can change later (decision 212).
- Workspaces in a field of their own in the message were rejected, because
  the chip then leaves the sentence.
- The agent tools give the agent the number and the link of each
  workspace, as [Create and list calls](agent-tools.md#create-and-list-calls)
  says. They also give the link of each session that they name, as
  [The calls](session-calls.md#the-calls) says.

## The message field

- The message field of each composer turns each pasted workspace link into
  a chip at once (decision 211). The composers are the chat of a
  workspace, the New workspace page, and the New workspace dialog.
- A chip that shows only after Send was rejected, because the person then
  sees a long address until Send.
- A paste works also in the Mac app, which gives the page no clipboard
  read, as [Permissions](desktop-commands.md#permissions) says.
- The field holds plain text and chips: workspace chips, the chips of
  [files and folders](file-mentions.md#chips-of-files-and-folders), and
  the chips of attached files, as
  [The chip in the field](message-attachments.md#the-chip-in-the-field)
  says. A paste of formatted text keeps only its text.
- A chip in the field is one unit of the text. Backspace and Delete remove
  it whole, and the arrow keys step over it.
- A chip in the field shows its list mark in a cell at its start. A
  pointer over the cell turns the mark into a × that removes the chip, as
  [Remove a chip of the composer](file-mentions.md#remove-a-chip-of-the-composer)
  says (decision 215).
- A press on the rest of a chip in the field places the caret, as in other
  text. It opens nothing.
- Typing, input methods, undo, and the touch keyboard of a phone work
  around a chip as in a plain text field.
- A cut and a paste, or a drag, inside the same field keeps each chip as a
  chip. Reason: the drag of the browser carries only the words that a chip
  shows. The chip would then become text, and an attached file would leave
  the draft.
- [The send key](create-a-workspace.md#the-send-key) applies to the field,
  as to each composer.
- The draft keeps the plain link of each chip. When a draft comes back, its
  workspace links show as chips again. Examples are a failed send and a
  draft that moves to a new session.
