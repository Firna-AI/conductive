# Protocol docs

The protocol docs hold the requirements and the decisions in force of each
feature. The [architecture doc](../architecture.md) describes the components
that meet them, and gives the terms and the meaning of a decision number.
This page lists each protocol doc and what it covers.

- [Workspaces and sandboxes](../protocol/workspaces-and-sandboxes.md): the
  providers, the account of each org, the org image, the life of a
  workspace, and the disk flushes of a sandbox.
  [Workspace protocol docs](protocol-docs-workspaces.md) lists the docs
  that belong to it.
- [Chat and events](../protocol/chat-and-events.md): sessions, messages, what
  the chat shows, and the events.
  [Chat protocol docs](protocol-docs-chat.md) lists the docs that belong to
  it.
- [Access and security](../protocol/access-and-security.md): sign-in, the
  gates, the secrets, and the isolation of sandboxes and previews.
  [Access protocol docs](protocol-docs-access.md) lists the docs that
  belong to it.
- [Model gateway](../protocol/model-gateway.md): the turn token, and the
  Worker routes that add the agent login to each model request.
  - [Model gateway: requests and answers](../protocol/model-gateway-requests.md):
    the upstream of each login, what passes to it and back, the own
    endpoints, the streams, and the risks.
  - [Model gateway: long waits](../protocol/model-gateway-long-waits.md):
    the error that ends a Codex turn when the upstream asks for a long
    wait.
- [GitHub banner](../protocol/github-banner.md): the pull request bar, its
  actions, Merge, and its events.
  - [The GitHub state](../protocol/github-summary.md): the four summary
    values for workspace list marks and their order.
  - [GitHub banner: checks and layouts](../protocol/github-banner-layouts.md):
    the Checks tab, and where the bar and its parts show on desktop and on
    a phone.
  - [Repository changes on GitHub](../protocol/repository-changes-on-github.md):
    a new name or default branch of a repository, the saved values, and the
    build that the change starts.
- [Agent tools](../protocol/agent-tools.md): the tools that agents use in a
  sandbox, and Mac commands.
  - [Agent tool access](../protocol/agent-tool-access.md): what each call
    reaches, which calls need an active turn, and the rights of the sender.
  - [Workspace calls](../protocol/workspace-calls.md): the calls that
    create, list, get, rename, move, and archive workspaces, and change
    their target branch.
    - [Repository, section, and model lists](../protocol/create-call-lists.md):
      the lists that a create call takes.
    - [Workspace management](../protocol/workspace-management.md): the
      calls that rename, move, and archive one workspace, and change its
      target branch.
  - [Session calls](../protocol/session-calls.md): the calls that start,
    list, message, and read the sessions of the org.
    - [Session management](../protocol/session-management.md): the calls
      that get, rename, close, and stop a session, and get a message.
    - [Session watches](../protocol/session-watches.md): the call that
      watches one turn of a session, and the wake that tells the calling
      session of its end.
    - [The `Sent by:` line](../protocol/sent-by-line.md): the line that ends
      the text of each tool message.
  - [Section and preview calls](../protocol/section-and-preview-calls.md):
    the calls that create and delete sections, and list, open, and close
    port previews.
  - [Secret requests](../protocol/secret-requests.md): the calls that list
    the secrets of the org and run a command with secrets.
  - [Names from the workspace tools](../protocol/tool-names.md): the rule
    for the names and titles that the calls give.
  - [Mac command requests](../protocol/mac-command-requests.md): the
    requests of agents to run a command on a Mac, their results, who
    answers them, and what the chat shows.
- [Orgs and members](../protocol/orgs-and-members.md): orgs, sections,
  roles, and the first run.
  - [Org rail order](../protocol/org-rail-order.md): the order of the orgs
    in the rail that each person keeps, how the person changes it, what a
    tile opens, and the workspace list of a hidden sidebar.
  - [Repository order](../protocol/repository-order.md): the order of the
    chosen repositories of an org, its default repository, and the moves
    of an admin.
  - [Get started](../protocol/get-started.md): the first run, its steps,
    the agent step, the state of the first build in its org step, and its
    finish.
  - [Delete org](../protocol/delete-org.md): the end of an org, its restore
    within 7 days, and the delete of its data.
  - [Sections](../protocol/sections.md): the sections of an org, the moves
    of workspaces between them, the Archived group, and the rows of the
    workspace list.
- [Pricing](../protocol/pricing.md): the plans and their cloud hours, the
  extra hours, the seller and the tax, the pricing page, and the planned
  billing changes. Use is free until billing starts.
- [Mac app](../protocol/desktop-app.md): the shell for macOS, its sign-in, and
  Mac commands.
  - [Mac packages and updates](../protocol/desktop-packages-and-updates.md)
  - [Mac app sign-in](../protocol/desktop-sign-in.md)
  - [Permissions and Mac commands](../protocol/desktop-commands.md)
- [Operator actions](../protocol/operator-actions.md): the operator, the
  suspension of a user or an org, the lift of a suspension, and abuse
  reports.
  - [Org suspension](../protocol/operator-org-suspension.md): the
    suspension of an org, and what its members keep.
- [Operator section](../protocol/operator-section.md): the pages of the
  operator in the web app, their counts, their searches, and the weights
  of new orgs.
  - [Operator section: the Overview](../protocol/operator-overview.md): the
    live counts of the Overview, and the long runs of cloud computers.
  - [Waitlist tabs of the operator section](../protocol/operator-waitlist-tabs.md):
    the Waitlist tab, Approve, the Invite codes tab, and the pause.
- [Command palette](../protocol/command-palette.md): the key and the search
  that finds the workspaces, the actions, and the settings.
- [Command palette: empty and unavailable states](../protocol/command-palette-states.md):
  what the palette shows while its workspace data loads or did not load,
  and when a tab or a search has no row.
- [Command palette: actions and settings](../protocol/command-palette-actions.md):
  the actions that the palette offers, their order and their groups, the
  Help group with Send feedback, and the rows of the Settings tab.
- [Feedback](../protocol/feedback.md): the Feedback dialog that Send
  feedback opens, its screenshots and context, the reply address, the
  routes, and the email to the team inbox.
  - [Feedback: the send limit](../protocol/feedback-send-limit.md): how
    often a person can send feedback, the repeats of one draft, the
    notice of a refused send, and the record of each send.
- [Keyboard shortcuts](../protocol/keyboard-shortcuts.md): the commands that
  keys run, where a key goes, and where the changes of a person live.
  - [Keyboard shortcuts: the keys](../protocol/keyboard-shortcuts-keys.md)
  - [Keyboard shortcuts: fixed keys and text keys](../protocol/keyboard-shortcuts-fixed-keys.md)
  - [Keyboard shortcuts: the hosts](../protocol/keyboard-shortcuts-hosts.md)
  - [Keyboard shortcuts: matching a press](../protocol/keyboard-shortcuts-matching.md)
  - [Keyboard shortcuts: the settings tab](../protocol/keyboard-shortcuts-tab.md)
- [Account stats](../protocol/account-stats.md): the Stats tab of the
  Account page, its counts of the person signed in, and its reads.
- [Org image](../protocol/org-image.md): the org image, its builds and its
  refreshes, and the first build of a new org.
- [Agents and sessions](../protocol/agents-and-sessions.md): the agents and
  their logins, the sessions, and the names of workspaces and sessions.
  - [The tab row](../protocol/tab-row.md): the order of the tabs of the
    centre column, their moves, the scroll of the row, the place that each
    tab keeps, and the tab menu.
  - [Workspace and session names](../protocol/workspace-and-session-names.md):
    the missing and the automatic names of workspaces and sessions, and
    the title that a small model gives a new workspace.
  - [Explain](../protocol/explain.md): Explain on a selection of chat
    text, its key, the written prompt, the explanation and its anchor, the
    marks in the parent chat, the popover, a closed explanation, and
    read-only workspaces.
- [Model favourites](../protocol/model-favourites.md): the favourites of
  each member, the rows and the marks of the model menu, All models, the
  hidden favourites, and the Favourites section of Preferences.
  - [Model favourites: the account](../protocol/model-favourites-account.md):
    the starting favourites and the account routes.
- [Workspace links](../protocol/workspace-links.md): Copy link, and the chips
  that show workspace links in chat.
- [Chat Markdown](../protocol/chat-markdown.md): the formatting of agent
  messages in the chat, with their headings, lists, quotes, and line
  breaks.
  - [Chat tables](../protocol/chat-tables.md): the tables of agent
    messages, their short rows and wide tables, and the table rules that
    they share with the file preview.
  - [Chat links](../protocol/chat-links.md): the links of agent messages
    and of sent messages, the labels of Markdown links, the images of
    agent messages, local addresses, and links in code.
  - [Chat message lines](../protocol/chat-message-lines.md): how each agent
    message shows as one line in the work of a turn, closed and open, with
    its tables, headings, quotes, rules, and line breaks.
- [GitHub tokens](../protocol/github-tokens.md): the git and CLI account
  scope of a cloud computer, the copy and lookup of the skills repository,
  and the GitHub actions of the Worker as a member.
  - [GitHub tokens: commit author](../protocol/github-tokens-commit-author.md):
    the author and the committer of each commit in a sandbox.
  - [GitHub tokens: image builds](../protocol/github-tokens-image-builds.md):
    the GitHub tokens that an image job uses to copy the repositories.
- [Agent instructions](../protocol/agent-instructions.md): the text that each
  agent session gets, and the skills of a message.
  - [Session instructions](../protocol/session-instructions.md): the same
    instructions for the life of a session, and how each agent gets them.
  - [Message lines](../protocol/message-lines.md): the sender line, the
    repository line, and the branch line of each message, the app header
    of a change note, and the access of a turn, which does not depend on
    the sender line.
  - [Agent instructions: facts that change](../protocol/agent-instructions-changes.md):
    the branches, the parent, the depth, and the capabilities, which can
    change during a session.
  - [Base prompts](../protocol/base-prompts.md): the base prompt of Claude
    agents and the base instructions of Codex agents.
  - [Agent instructions: how each agent gets them](../protocol/agent-instructions-delivery.md):
    the system instructions of each agent, and the ways that were rejected.
- [Waitlist](../protocol/waitlist.md): app access, the waitlist screen, the
  ways in, the approval email, and the record of app access.
- [Invite and referral codes](../protocol/waitlist-codes.md): the codes of
  the waitlist, the join link, and the use of a code.
- [Sign-ups](../protocol/sign-ups.md): the pause, the waitlist switch, open
  sign-up, and the main action of the marketing site.
- [Website docs](../protocol/website-docs.md): the public guides of the
  marketing site, their addresses and navigation, and the rules for their
  words.
- [Automations](../protocol/automations.md): automations, their chosen
  secrets, and their schedules, with the linked pages
  [Automation runs](../protocol/automation-runs.md),
  [Pull request runs](../protocol/pull-request-runs.md), and
  [Automation risks](../protocol/automation-risks.md).
