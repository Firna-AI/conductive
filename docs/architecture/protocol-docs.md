# Protocol docs

The protocol docs hold the requirements and the decisions in force of each
feature. The [architecture doc](../architecture.md) describes the components
that meet them, and gives the terms and the meaning of a decision number.
This page lists each protocol doc and what it covers.

- [Workspaces and sandboxes](../protocol/workspaces-and-sandboxes.md): the
  providers, the account of each org, the org image, the life of a
  workspace, and the disk flushes of a sandbox.
  - [Provider accounts](../protocol/provider-accounts.md): the account of
    each org, its weights, and the regions of the accounts.
  - [Sandbox software](../protocol/sandbox-software.md): the releases of the
    app's own software, the updates of each sandbox, the install in a
    build, and the software image.
  - [Create a workspace](../protocol/create-a-workspace.md): New workspace as a
    page or as a dialog, its Capabilities icon, the create, the branch, and
    a failed first start.
    - [New workspace notices](../protocol/new-workspace-notices.md): the
      notice before the first good build, and the notice of a waiting
      repository.
  - [Repository folders](../protocol/repository-folders.md): the folder and the
    shell variable of each repository in a sandbox, and the context folder
    of each workspace.
  - [Life of a workspace](../protocol/workspace-life.md): the start steps,
    the time limits, the states, the archive, the restore, the removal from
    the list after 14 days, and Continue.
    - [Workspace list marks](../protocol/workspace-marks.md): GitHub colours,
      agent motion, unread output, and reduced motion.
    - [Stop and resume](../protocol/stop-and-resume.md): the stop of an
      idle sandbox, the resume, the starts from the agent tools, and the
      restart near day 14 of a stop.
    - [Restart the software](../protocol/restart-the-software.md): Restart
      in the workspace header, what it restarts, and the download of the
      newest release before it.
  - [Continue](../protocol/continue.md): the next task of a workspace after a
    merge, on a new branch with the same sandbox and sessions.
  - [Repository change](../protocol/repository-change.md): the move of a
    workspace to another repository of its org, on a new branch with the
    same sandbox and sessions.
  - [Workspace menu](../protocol/workspace-menu.md): the menu of a workspace
    row, which moves, reassigns, renames, and archives the workspace.
  - [Sub-workspaces](../protocol/sub-workspaces.md): the parent link, when
    to nest, the depth limit, the nested rows of the list, an archived parent, the moves
    of a tree, and the agent context.
    - [Parent changes](../protocol/parent-changes.md): the moves that nest
      a workspace under another parent or take it out of its tree, the
      place of the moved tree, and the refusals.
  - [Workspace tools](../protocol/workspace-tools.md)
    - [Terminal](../protocol/terminal.md): the terminals of a workspace
      and their tabs.
      - [Terminal shell](../protocol/terminal-shell.md): the shell of each
        terminal, its connection, its end, its command history, and what
        an out-of-memory kill ends.
      - [Terminal screen](../protocol/terminal-screen.md): the screen of
        each terminal, its output history, its selection, its size, and its
        keys.
      - [Terminal links](../protocol/terminal-links.md): the links in the
        output of a terminal.
    - [Temporary tabs](../protocol/temporary-tabs.md): the one file or diff
      tab that the next press replaces, what opens and keeps it, and its
      mark in the saved view.
    - [File row menu](../protocol/file-row-menu.md): the menu of a row of
      All files and Changes, with Add to chat and Copy path, Copy path in
      the tab menu of a file or diff tab, and the paths whose label hides a
      secret value.
    - [Port previews](../protocol/port-previews.md): detected servers, manual
      opening, the open from a local address in the chat, preview tabs,
      and the relay requirement.
- [Chat and events](../protocol/chat-and-events.md): sessions, messages, what
  the chat shows, and the events.
  - [Messages and attachments](../protocol/messages-and-attachments.md)
    - [Message attachments](../protocol/message-attachments.md): the size
      limit, the upload, the storage, and the deletion of the files of a
      message, and their chips and their drop in the message field.
      - [Attachment transfers](../protocol/attachment-transfers.md): the
        transfer of each file into the cloud computer, the deletion of its
        stored copy, the check of a later message, and what the agent gets.
    - [Fast mode](../protocol/fast-mode.md): the Fast switch of the model
      menu, the models that show it, who may turn it on, and the speed of a
      turn that cannot run fast.
    - [Dropped answers](../protocol/dropped-answers.md): the continue
      message of a Claude turn after its model answer drops.
  - [File mentions](../protocol/file-mentions.md): the list of `@` in the
    composer, the chips of files and folders, Add to chat, the sent chips
    of attached files, and the removal of each chip of the composer.
    - [File mentions: files in answers](../protocol/file-mentions-answers.md):
      the file chips, the file links, and the pictures in the answers of
      the agents, and their line targets.
  - [Agent runner](../protocol/agent-runner.md): the connection of the runner,
    its events and their limits, its turns, what an out-of-memory kill ends,
    the background work of Claude turns with its note and its time limit,
    its port reports, and the repair of lost workspace updates.
    - [Background work of Claude turns](../protocol/background-work.md):
      the wait of a Claude turn for background work, its note, and its time
      limit.
    - [Listening ports](../protocol/listening-ports.md): the scanner's
      eligibility, labels, limits, and full reports.
    - [Lost workspace updates](../protocol/lost-workspace-updates.md): the
      reports that belong to no session, the repair request after a refused
      update, and the notice of a failed repair.
    - [Runner warnings](../protocol/runner-warnings.md): the warnings of the
      Worker for runner connections and for turn ends with no Stop request,
      and the process-start ID of the runner.
  - [Session transcripts](../protocol/session-transcripts.md): copying a
    session as concise or full Markdown, and the text of a copy.
    - [Transcript routes](../protocol/transcript-routes.md): the route of
      a copy.
    - [Transcript reads by agents](../protocol/transcript-reads.md): the
      route of `read_session`, and the parts of a long text.
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
        workspace and of each workspace, with its secrets part and Mac
        access.
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
  - [Attachment uploads](../protocol/attachment-uploads.md): the upload of
    an attached file in parts, with the gate rules and the body limit of
    its routes.
  - [Step timing](../protocol/step-timing.md): the `Server-Timing` header of
    the preview replies and of the create reply, and what it may hold.
- [Model gateway](../protocol/model-gateway.md): the turn token, and the
  Worker routes that add the agent login to each model request.
  - [Model gateway: requests and answers](../protocol/model-gateway-requests.md):
    the upstream of each login, what passes to it and back, the own
    endpoints, the streams, and the risks.
- [GitHub banner](../protocol/github-banner.md): the pull request bar, its
  actions, Merge, and its events.
  - [The GitHub state](../protocol/github-summary.md): the four summary
    values for workspace list marks and their order.
  - [Repository changes on GitHub](../protocol/repository-changes-on-github.md):
    a new name or default branch of a repository, the saved values, and the
    build that the change starts.
- [Agent tools](../protocol/agent-tools.md): the tools that agents use in a
  sandbox, and Mac commands.
  - [Agent tool access](../protocol/agent-tool-access.md): what each call
    reaches, which calls need an active turn, and the rights of the sender.
  - [Workspace calls](../protocol/workspace-calls.md): the calls that
    create, list, get, rename, move, and archive workspaces.
    - [Repository, section, and model lists](../protocol/create-call-lists.md):
      the lists that a create call takes.
  - [Session calls](../protocol/session-calls.md): the calls that start,
    list, message, and read the sessions of the org.
    - [Session management](../protocol/session-management.md): the calls
      that get, rename, close, and stop a session, and get a message.
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
- [Workspace links](../protocol/workspace-links.md): Copy link, and the chips
  that show workspace links in chat.
- [Chat Markdown](../protocol/chat-markdown.md): the formatting of agent
  messages in the chat, with their headings and lists, and their lines in
  the work of a turn.
  - [Chat tables](../protocol/chat-tables.md): the tables of agent
    messages, their short rows and wide tables, and the table rules that
    they share with the file preview.
  - [Chat links](../protocol/chat-links.md): the links of agent messages
    and of sent messages, the labels of Markdown links, local addresses,
    and links in code.
- [GitHub tokens](../protocol/github-tokens.md): the git and CLI account
  scope of a cloud computer, the author of each commit in a sandbox, and the
  GitHub actions of the Worker as a member, and the GitHub tokens that an
  image job uses to copy the repositories.
- [Agent instructions](../protocol/agent-instructions.md): the text that each
  agent session gets.
  - [Message lines](../protocol/message-lines.md): the sender line, the
    repository line, and the branch line of each message, and the access
    of a turn, which does not depend on the sender line.
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
- [Automations](../protocol/automations.md): automations and their schedules, with the
  linked pages [Automation runs](../protocol/automation-runs.md),
  [Pull request runs](../protocol/pull-request-runs.md), and
  [Base branches](../protocol/base-branches.md).
