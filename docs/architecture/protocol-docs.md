# Protocol docs

The protocol docs hold the requirements of each feature. The
[architecture doc](../architecture.md) describes the components that meet
them, and this page lists each protocol doc and what it covers.

- [Workspaces and sandboxes](../protocol/workspaces-and-sandboxes.md): the
  providers, the account of each org, the org image, and the life of a
  workspace.
  - [Create a workspace](../protocol/create-a-workspace.md): New workspace as a
    page or as a dialog, the create, the branch, and a failed first start.
  - [Repository folders](../protocol/repository-folders.md): the folder and the
    shell variable of each repository in a sandbox.
  - [Life of a workspace](../protocol/workspace-life.md)
  - [Workspace menu](../protocol/workspace-menu.md): the menu of a workspace
    row, which moves, reassigns, renames, and archives the workspace.
  - [Workspace tools](../protocol/workspace-tools.md)
    - [Port previews](../protocol/port-previews.md): detected servers, manual
      opening, preview tabs, and the relay requirement.
- [Chat and events](../protocol/chat-and-events.md): sessions, messages, what
  the chat shows, and the events.
  - [Messages and attachments](../protocol/messages-and-attachments.md)
  - [File mentions](../protocol/file-mentions.md): the list of `@` in the
    composer, the chips of files and folders, and the removal of each chip
    of the composer.
  - [Agent runner](../protocol/agent-runner.md): the connection of the runner,
    its events and their limits, its turns, its port reports, and the repair
    of lost workspace updates.
    - [Listening ports](../protocol/listening-ports.md): the scanner's
      eligibility, labels, limits, and full reports.
- [Access and security](../protocol/access-and-security.md): sign-in, the
  gates, the secrets, and the isolation of sandboxes and previews.
  - [Isolation of orgs and sandboxes](../protocol/isolation.md)
    - [The app's provider keys](../protocol/provider-keys.md): the Boat key
      and the E2B key.
  - [Tokens and secrets](../protocol/tokens-and-secrets.md)
  - [Terminal, previews, and desktop](../protocol/terminal-previews-and-desktop.md)
- [Model gateway](../protocol/model-gateway.md): the turn token, and the
  Worker routes that add the agent login to each model request.
- [GitHub banner](../protocol/github-banner.md): the pull request bar and its
  events.
- [Agent tools](../protocol/agent-tools.md): the tools that agents use in a
  sandbox.
- [Orgs and members](../protocol/orgs-and-members.md): orgs, sections,
  roles, the first run, and the end of an org.
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
  - [Waitlist tabs of the operator section](../protocol/operator-waitlist-tabs.md):
    the Waitlist tab, Approve, the Invite codes tab, and the pause.
- [Command palette](../protocol/command-palette.md): the key and the search
  that finds the workspaces, the actions, and the settings.
- [Command palette: empty and unavailable states](../protocol/command-palette-states.md):
  what the palette shows while its workspace data loads or did not load,
  and when a tab or a search has no row.
- [Org image](../protocol/org-image.md): the org image, its builds and its
  refreshes, and the first build of a new org.
- [Agents and sessions](../protocol/agents-and-sessions.md): the agents and
  their logins, the sessions, and the names of workspaces and sessions.
- [Workspace links](../protocol/workspace-links.md): Copy link, and the chips
  that show workspace links in chat.
- [Chat Markdown](../protocol/chat-markdown.md): the formatting of agent
  messages in the chat, with their tables.
- [GitHub tokens](../protocol/github-tokens.md): git and CLI account scope,
  and the author of each commit in a sandbox.
- [Agent instructions](../protocol/agent-instructions.md): the text that each
  agent session gets, the sender line of each message, and the base
  prompt of Claude agents.
- [Waitlist](../protocol/waitlist.md): app access, the waitlist screen, the
  ways in, the pause, and the approval email.
- [Invite and referral codes](../protocol/waitlist-codes.md): the codes of
  the waitlist, the join link, and the use of a code.
- [Website docs](../protocol/website-docs.md): the public guides of the
  marketing site, their addresses and navigation, and the rules for their
  words.
- [Conductor comparison](../protocol/conductor-comparison.md): the public
  page for people who move from Conductor, with the status of each
  Conductor feature.
