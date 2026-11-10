# Protocol docs

The protocol docs hold the requirements and the decisions in force of each
feature. The [architecture doc](../architecture.md) gives the components,
the terms, and the meaning of a decision number.

- [Workspaces and sandboxes](workspaces-and-sandboxes.md): the org image
  and the life of a workspace.
  - [Create a workspace](create-a-workspace.md): New workspace as a page or
    as a dialog, the create, the branch, and a failed first start.
  - [Repository folders](repository-folders.md): the folder and the shell
    variable of each repository in a sandbox.
  - [Life of a workspace](workspace-life.md): the start steps, the time
    limits, the states, the stop and resume, the archive, and Continue.
  - [Continue](continue.md): the next task of a workspace after a merge, on
    a new branch with the same sandbox and sessions.
  - [Workspace menu](workspace-menu.md): the menu of a workspace row, which
    moves, reassigns, renames, and archives the workspace.
  - [Workspace tools](workspace-tools.md)
- [Chat and events](chat-and-events.md): sessions, messages, what the chat
  shows, and the events.
  - [Messages and attachments](messages-and-attachments.md)
  - [Agent runner](agent-runner.md): the connection of the runner, its
    events and their limits, its turns, and the repair of lost workspace
    updates.
- [Access and security](access-and-security.md): sign-in, the gates, the
  secrets, and the isolation of sandboxes and previews.
  - [Isolation of orgs and sandboxes](isolation.md)
  - [Tokens and secrets](tokens-and-secrets.md)
  - [Terminal, previews, and desktop](terminal-previews-and-desktop.md)
- [GitHub banner](github-banner.md): the pull request bar, its actions,
  Merge, and its events.
- [Agent tools](agent-tools.md): the tools that agents use in a sandbox.
- [Orgs and members](orgs-and-members.md): orgs, sections, roles, the first
  run, and the end of an org.
- [Mac app](desktop-app.md): the shell for macOS, its sign-in, and Mac
  commands.
  - [Mac packages and updates](desktop-packages-and-updates.md)
  - [Mac app sign-in](desktop-sign-in.md)
  - [Permissions and Mac commands](desktop-commands.md)
- [Operator actions](operator-actions.md): the operator, the suspension of
  a user or an org, the lift of a suspension, and abuse reports.
- [Operator section](operator-section.md): the pages of the operator in the
  web app, their counts, and their searches.
- [Command palette](command-palette.md): the key and the search that finds
  the workspaces, the actions, and the settings.
- [Command palette: empty and unavailable states](command-palette-states.md):
  what the palette shows while its workspace data loads or did not load,
  and when a tab or a search has no row.
- [Org image](org-image.md): the org image, its builds and its refreshes,
  and the first build of a new org.
- [Agents and sessions](agents-and-sessions.md): the agents and their
  logins, the sessions, and the names of workspaces and sessions.
- [Workspace links](workspace-links.md): Copy link, and the chips that show
  workspace links in chat.
- [Chat Markdown](chat-markdown.md): the formatting of agent messages in
  the chat, with their tables.
- [GitHub tokens](github-tokens.md): the git and CLI account scope of a
  cloud computer, and the GitHub actions of the Worker as a member.
- [Agent instructions](agent-instructions.md): the text that each agent
  session gets, the sender line and the branch line of each message, and
  the base prompt of Claude agents.
- [Waitlist](waitlist.md): app access, the waitlist screen, the ways in,
  the pause, and the approval email.
- [Invite and referral codes](waitlist-codes.md): the codes of the
  waitlist, the join link, and the use of a code.
- [Conductor Cloud comparison](conductor-cloud-comparison.md): the public
  page for people who move from Conductor Cloud, with the status of each
  Conductor Cloud feature.
