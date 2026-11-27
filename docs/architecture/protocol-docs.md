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
  [Chat protocol docs](protocol-docs-chat.md) lists the docs that belong
  to it.
- [Access and security](../protocol/access-and-security.md): sign-in, the
  gates, the secrets, and the isolation of sandboxes and previews.
  - [Isolation of orgs and sandboxes](../protocol/isolation.md)
    - [The app's provider keys](../protocol/provider-keys.md): the Boat key
      and the E2B key.
    - [Version pins](../protocol/version-pins.md): the runner version that
      a workspace accepts, the version pin, and the risks of the turn
      token in a sandbox.
    - [The share setting](../protocol/share-setting.md): whether the
      messages of other members can run on a personal login, its default,
      its checks, and its risks.
  - [Tokens and secrets](../protocol/tokens-and-secrets.md)
    - [Tool detail secrets](../protocol/tool-detail-secrets.md): the filter
      of secret values before the cut of a long tool detail, and the risk
      of older runners and fallback connections.
    - [Answer text secrets](../protocol/answer-text-secrets.md): the held
      end of an unfinished answer, the saved state of its filter, and a
      longer value that shows as two masks.
    - [Own endpoint logins](../protocol/own-endpoint-logins.md): the
      endpoint and the key of each agent, the model list of the endpoint,
      and the addresses that the app accepts.
    - [Org logins](../protocol/org-logins.md): the login that an admin
      connects for each agent of an org, the Agents tab of the org
      settings, and the default login of a new session.
    - [Secrets](../protocol/secrets.md): the secrets of an org that agents
      use in one command, their storage, the Secrets tab, the rights,
      Reveal, the mark for all agents, the grants, and their risks.
      - [Capabilities](../protocol/capabilities.md): the control of New
        workspace, of each workspace, and of an automation, with its
        secrets part.
        - [Mac access](../protocol/mac-access.md): the requests that agents
          can always send to a Mac, the Mac access switch of the Mac app,
          the grant that it starts on this Mac, and the risks.
        - [Capabilities: what agents learn](../protocol/capabilities-agents.md):
          the facts of a session that its agent learns, the change note of
          each change, where the note goes, what the chat shows, and older
          runners.
      - [Secret variables](../protocol/secret-variables.md): the names of
        new secrets, the variable name of each secret, the command
        environment, conflicting variable names, and older tools.
      - [Secret requests](../protocol/secret-requests.md): the calls that
        list the secrets and run a command with secrets, the requests and
        their time limit, temporary values, and what the chat shows.
        - [Late secret requests](../protocol/secret-late-answers.md): the
          requests after the wait of their tool call ends, and their late
          answers.
  - [Terminal, previews, and desktop](../protocol/terminal-previews-and-desktop.md)
    - [Preview grants](../protocol/preview-grants.md): the launch address
      of a preview, its one-use grant, the authorizer, the browser launch,
      the credential cookie, and a launch at a path.
  - [Attachment uploads](../protocol/attachment-uploads.md): the upload of
    an attached file in parts, with the gate rules and the body limit of
    its routes.
  - [Step timing](../protocol/step-timing.md): the `Server-Timing` header of
    the preview replies and of the create reply, and what it may hold, and
    the job step records of builds and starts.
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
  - [GitHub banner: merge and after](../protocol/github-banner-merge.md):
    Merge, Ready for review, Continue and Archive after the merge, and the
    merge record.
- [Merge queue](../protocol/merge-queue.md): the queue of each repository,
  who may join, member stacks, the leave, the merge, and the failures.
  - [Merge queue: the GitHub stack](../protocol/merge-queue-stack.md): the
    stack of a queue, its restacks, the restack turns, and the re-order.
  - [Merge queue in the app](../protocol/merge-queue-in-the-app.md): the
    Merge queue group of the list, Add to merge queue, the bar of a queued
    workspace, Remove from queue, Merge on a queued workspace, its prompts,
    and the commands.
- [Agent tools](../protocol/agent-tools.md): the tools that agents use in a
  sandbox, and Mac commands.
  - [Agent tool access](../protocol/agent-tool-access.md): what each call
    reaches, which calls need an active turn, and the rights of the sender.
  - [Workspace calls](../protocol/workspace-calls.md): the calls that
    create, list, get, rename, move, and archive workspaces.
    - [Repository, section, and model lists](../protocol/create-call-lists.md):
      the lists that a create call takes.
    - [Workspace management](../protocol/workspace-management.md): the
      calls that rename, move, and archive one workspace.
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
    of workspaces between them, the Archived group, the place of the Merge
    queue group, and the rows of the workspace list.
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
    - [Keyboard shortcuts: the keys of the browsers](../protocol/keyboard-shortcuts-browser-keys.md)
  - [Keyboard shortcuts: fixed keys and text keys](../protocol/keyboard-shortcuts-fixed-keys.md)
  - [Keyboard shortcuts: the hosts](../protocol/keyboard-shortcuts-hosts.md)
  - [Keyboard shortcuts: matching a press](../protocol/keyboard-shortcuts-matching.md)
  - [Keyboard shortcuts: the settings tab](../protocol/keyboard-shortcuts-tab.md)
- [Settings](../protocol/settings.md): the one place for Account settings
  and the org settings, as a dialog on a desktop and as screens on a
  phone, with its addresses and its ways in.
- [Account stats](../protocol/account-stats.md): the Stats tab of
  Account settings, its counts of the person signed in, and its reads.
- [Org image](../protocol/org-image.md): the org image, its builds and its
  refreshes, and the first build of a new org.
  - [Repository changes of the org image](../protocol/org-image-repositories.md):
    the waiting and the removed repositories, the adds and the removals of
    an admin, their builds, and the repository notice.
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
  scope of a cloud computer, the author of each commit in a sandbox, the copy
  and lookup of the skills repository, and the GitHub actions of the
  Worker as a member.
  - [GitHub tokens: image builds](../protocol/github-tokens-image-builds.md):
    the GitHub tokens that an image job uses to copy the repositories.
  - [GitHub tokens: the Worker as a member](../protocol/github-tokens-worker.md):
    the merges, Ready for review, the branch reads, the fetches of Continue
    and of a moved base, and the steps of the merge queue.
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
