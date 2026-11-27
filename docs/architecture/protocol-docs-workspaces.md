# Workspace protocol docs

This page lists the protocol docs that belong to
[Workspaces and sandboxes](../protocol/workspaces-and-sandboxes.md), and
what each covers. [Protocol docs](protocol-docs.md) lists the other
protocol docs.

- [Provider accounts](../protocol/provider-accounts.md): the account of
  each org and of each workspace, the weights, and the regions of the
  accounts.
  - [Switch account](../protocol/switch-account.md): the switch of an org
    to another provider account by an operator, its switch build, what
    members see of it, and its box on the page of the org.
- [Sandbox software](../protocol/sandbox-software.md): the releases of the
  app's own software, the updates of each sandbox, the install in a
  build, and the disk hold.
  - [Software image](../protocol/software-image.md): the software image
    that a first build starts from, its build at each deploy, and the
    images that the app keeps.
- [Create a workspace](../protocol/create-a-workspace.md): New workspace as a
  page or as a dialog, its Capabilities icon, the create, the branch, and
  a failed first start.
  - [Create a workspace: the preference](../protocol/create-a-workspace-preference.md):
    the tabs of the Account page, and the choice of how New workspace
    opens, with its save and its default.
  - [Create a workspace: the dialog](../protocol/create-a-workspace-dialog.md):
    the parts of the dialog, its section, its notices, its close, and its
    draft.
  - [Start from a branch](../protocol/start-from-a-branch.md): the branch
    control of New workspace, its dropdown, the target choice, and the
    branch check of a create with its refusals.
  - [New workspace notices](../protocol/new-workspace-notices.md): the
    notice before the first good build, and the notice of a waiting
    repository.
- [Base branches](../protocol/base-branches.md): the base branch of each
  workspace, a base branch that GitHub deleted, the base of a queued
  workspace, and the branch of a pull request run.
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
    - [Disk line](../protocol/disk-line.md): the disk line that keeps each
      saved disk small enough to resume, the line of each provider, the
      hold that keeps it, a disk above the line, and when the line
      applies.
  - [Restart the software](../protocol/restart-the-software.md): Restart
    in the workspace header, what it restarts, the download of the newest
    release before it, and the automatic restart of an agent runner that
    stays away while a message waits.
- [Continue](../protocol/continue.md): the next task of a workspace after a
  merge, on a new branch with the same sandbox and sessions.
- [Repository change](../protocol/repository-change.md): the move of a
  workspace to another repository of its org, on a new branch with the
  same sandbox and sessions.
- [Workspace menu](../protocol/workspace-menu.md): the menu of a workspace
  row, which moves, reassigns, renames, and archives the workspace, and
  adds it to the merge queue or removes it.
- [Sub-workspaces](../protocol/sub-workspaces.md): the parent link, when
  to nest, the depth limit, the section of a new sub-workspace, and the
  agent context.
  - [Sub-workspaces in the list](../protocol/sub-workspace-list.md): the
    nested rows of the list, an archived or a queued parent, and the moves
    of a tree.
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
  - [Temporary tabs](../protocol/temporary-tabs.md): the one file, diff,
    or skill tab that the next press replaces, what opens and keeps it,
    its mark in the saved view, and the skill tabs in the saved view.
  - [File row menu](../protocol/file-row-menu.md): the menu of a row of
    All files and Changes, with Add to chat and Copy path, Copy path in
    the tab menu of a file or diff tab, and the paths whose label hides a
    secret value.
  - [HTML file preview](../protocol/html-file-preview.md): the Preview
    and Source switch of an HTML file tab, the files preview of a
    workspace, and the files that a page can load.
    - [File server](../protocol/file-server.md): the file server of the
      agent runner, which serves the page and its files.
      - [File server fonts](../protocol/file-server-fonts.md): the system
        fonts, the font stylesheet, and its link in each HTML page.
    - [Files of an HTML page](../protocol/html-page-files.md): the files
      and the system fonts that a page can load, and the cases that do
      not show as the agent saw them.
  - [Pictures in file tabs](../protocol/file-pictures.md): the PNG, JPEG,
    GIF, and WebP files that a file tab shows as a picture, the zoom bar,
    the expanded view, and the cases that show no picture.
  - [File reports](../protocol/file-reports.md): the limits, the listed
    entries and changes, the omitted totals, the parts, the revisions,
    the tree updates, the repairs, and the rollout of the runner's
    reports of the file tree and the branch changes.
  - [Port previews](../protocol/port-previews.md): detected servers, manual
    opening, the open from a local address in the chat, preview tabs,
    and the relay requirement.
