---
title: "Issues: explorations"
description: "Four ways that issues can live beside workspaces, for review."
---

# Issues: explorations

An issue holds a task before anyone starts work on it. It has no cloud
computer, so it costs nothing while it waits. These pages explore four
ways that issues can live beside the workspaces of an org. They are
explorations for review, not the spec. Each variation answers the same
three questions:

1. Where does an issue live before it has a workspace?
2. How does a person go from an issue to a workspace?
3. How do the issue and its workspace live together after the start?

Every variation uses the same sample data. The postcode issue, I-31
"Guest checkout drops the postcode", has no workspace at the start of
each flow. The other issues of Acme link to the workspaces of the list.

| Variation | Where issues live | The start | After the start |
| --- | --- | --- | --- |
| [A. Issues page](mock:app/issues/page) | A page of the org, beside Automations | Start workspace on the issue opens New workspace, filled in | A line under the workspace header links to the issue. The issue lists its workspaces, live. |
| [B. One list](mock:app/issues/one-list) | In the sections of the sidebar, beside the workspaces | Start in the message box of the issue | The row of the issue becomes the row of its workspace. The issue is the first tab. |
| [C. Issue as parent](mock:app/issues/parent) | The Issues page, then a tree in the sidebar | Start, with one workspace, two attempts, or a split | Workspaces show under their issue. The issue compares its attempts. |
| [D. Board](mock:app/issues/board) | A board of the org, one column for each state | A drop on In progress starts it at once | The card shows the live mark. The right column has an Issue tab. |

## The rules that every variation shares

- An issue has a label, such as `I-31`, a title, a description, an
  optional checklist, a state, a priority, an assignee, an optional
  repository, and a section.
- The workspaces of an issue move its state. A start makes it In
  progress, an open pull request makes it In review, and the merge makes
  it Done. Nobody moves the state by hand while a workspace works on it.
- The state circle has no grid of cells, so an issue never reads as a
  workspace with a cloud computer.
- The first message of the workspace is the issue. The agent can read and
  tick the issue with its tools.

## The flows

- [Start a workspace from an issue page](mock:user-flows/issue-page-start)
- [Start an issue in the workspace list](mock:user-flows/issue-one-list)
- [Compare two attempts at an issue](mock:user-flows/issue-attempts)
- [Start an issue from the board](mock:user-flows/issue-board)
