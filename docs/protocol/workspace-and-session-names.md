# Workspace and session names

This page belongs to [Agents and sessions](agents-and-sessions.md). It
holds the requirements and the decisions in force for the names of
workspaces and sessions. It also holds the title that a small model gives
a new workspace from its first message. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A title image decision number, such as title image decision 1,
names the dated record of one decision of the change that leaves the
names of attached images out of titles.

- On this page, a name is the name of a workspace or the title of a
  session.
- A new workspace has no name (decision 182). Each new session has no name
  either (decision 185).
- The app shows "Untitled" in place of a missing name.
- In the workspace record, a missing name is null in `name`. In the session
  record, a missing name is null in `title`.
- An automatic name is a name that the app gives on its own. These names
  are automatic:
  - the title of a workspace, as
    [The title of a new workspace](#the-title-of-a-new-workspace) says
  - a workspace name that the agent runner reports, as
    [Lost workspace updates](agent-runner.md#lost-workspace-updates) says
  - the title that a session takes, as
    [Sessions](agents-and-sessions.md#sessions) says
- The app gives an automatic name only to a workspace or a session that has
  no name (decision 182). So no automatic name replaces a name that a
  member or the app gave.
- A member names a workspace with Rename in the
  [menu of its row](workspace-menu.md#rename), or with a double click on
  its row in the sidebar.
- The app gives no automatic name in an archived workspace, or in a
  workspace of a deleted org.
- A workspace name can also name the branch, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says.
- Reason: a missing name shows that no one named the workspace or the
  session yet. A text comparison with "New session" or the city name of
  the branch was rejected. A member can type the same text and then lose
  that name.
- Reason: an archived workspace shows its chat read-only (decision 16).

## The title of a new workspace

- For a workspace with no name, the app asks a small model of Workers AI
  for a title after accepting its first message (decision 184). The request asks
  for three to five words. Workers AI is the model service of Cloudflare,
  on the account that hosts the app.
- The model writes the title from the text of that message. It leaves out
  the `---` line and the `Sent by:` line of a message from the agent tools.
  Reason: the title names the task, not its sender.
- In that text, each mention of one of its attached files that is not an
  image becomes the name of the file (decision 262 D). The request holds no other data of the
  workspace. It uses no agent login of a member. The chat does not show it.
- Reason: a path makes a poor title. A request with the copy path of each
  file was rejected for that reason.
- Each mention of an attached image goes out of that text, with no name
  (title image decision 1 A). An image is an attached file of the kind
  `image`, such as a screenshot. The spaces and tabs after the mention go
  out with it.
- Reason: image names such as "Screenshot 2026-11-16 at 10.23.45.png" do
  not name the task. The model put "Screenshot" in many titles. The text
  of the message says what the image shows.
- The names of all attached files out of the text were rejected, because
  names such as `crash.log` can name the task. Images sent to a model that
  reads images were rejected, because each title then needs a larger model,
  and costs more and takes longer. A filter for only generic names, such as
  "Screenshot", was rejected, because the operating system translates them.
  A request that asks the model to ignore the names was rejected, because
  the small model does not follow such rules reliably.
- The reply to the message does not wait for the title. The workspace
  then takes the title as its name, by the rules at the start of this
  page.
- When the request fails, the name of the workspace does not change. The
  app then asks again when it accepts the next message with text in the
  workspace. It asks only while the workspace has no name.
- A later request also uses the text of the first message. Only when the
  first message has no text does it use the text of the message that
  starts it.
- A first message with no text starts no request. The next message with
  text in the workspace then starts it.
- For the title request, a message whose text holds only the mentions of
  its own attached files counts as a message with no text. The same holds
  for a session title, as [Sessions](agents-and-sessions.md#sessions) says.
- Reason: the name shows within seconds, while the sandbox starts, and the
  operator chooses the model and its speed.
- A request in the sandbox on the agent login of the member was rejected.
  The name then waits for the sandbox, and each title spends the
  subscription of the member.
- A Claude model with an API key of the operator was rejected, because it
  sends each first message to another company. A name from the first
  words of the message, with no model, was rejected, because such names
  are weaker.
- The request also asks for plain words with no underscores (decision 255).
- The app changes each underscore of the answer to a space. The title then
  follows the rule of a title from a message, as
  [Sessions](agents-and-sessions.md#sessions) says. So each run of spaces
  becomes one space.
- The title keeps its hyphens and its letter case, because words such as
  "sign-in", "GitHub", and "iOS" need them.
- This rule covers only a title that the model writes. A session title from
  a member's message keeps its underscores. A name from a create call keeps
  them too, as [Create and list calls](agent-tools.md#create-and-list-calls)
  says.
- Reason: the model writes names such as `add_conductive_app`, also when
  the request asks for spaces. A change of the request alone was rejected
  for that reason.
- A larger model was rejected, because no model is sure to keep the format,
  and each title then costs more and takes longer.
- A change of the shown name only was rejected, because the stored name
  then keeps the underscores. A refusal of a title with underscores was
  rejected, because the workspace then stays "Untitled".
- A split of a one-word title at each hyphen, dot, and slash was rejected,
  because it changes names such as "Node.js".
- The same rule for a session title from a member's message was rejected,
  because a member can write `user_id` on purpose.
- A title that keeps a word with underscores from the first message was
  rejected, because the name then holds underscores that no member asked
  for. A member who wants underscores names the workspace with Rename.
