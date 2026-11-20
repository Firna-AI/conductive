# Workspace protocol docs

This page lists the protocol docs that belong to
[Workspaces and sandboxes](../protocol/workspaces-and-sandboxes.md), and
what each covers. [Protocol docs](protocol-docs.md) lists the other
protocol docs.

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
- [Org skills](../protocol/org-skills.md): the skills repository of an
  org and the skills that load, with the linked pages
  [the copy](../protocol/org-skills-copy.md),
  [the list of skills](../protocol/org-skills-list.md), and
  [repository trust](../protocol/org-skills-trust.md).
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
  - [HTML file preview](../protocol/html-file-preview.md): the Preview
    and Source switch of an HTML file tab, the files preview of a
    workspace, and the files that a page can load.
    - [File server](../protocol/file-server.md): the file server of the
      agent runner, which serves the page and its files.
  - [Port previews](../protocol/port-previews.md): detected servers, manual
    opening, the open from a local address in the chat, preview tabs,
    and the relay requirement.
