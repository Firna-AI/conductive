# Section and preview calls

This doc holds the requirements and the decisions in force for the calls
of the workspace tools that change the sections of the org and the port
previews of a workspace. It belongs to [Agent tools](agent-tools.md).
[Agent tool access](agent-tool-access.md) states what each call reaches,
which calls need an active turn, and the rights of the sender. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The calls

| Call | MCP tool | CLI command | Route | Needs |
| --- | --- | --- | --- | --- |
| Create a section | `create_section` | `conductive sections create` | `POST /v1/tools/sections` | An active turn |
| Delete a section | `delete_section` | `conductive sections delete` | `POST /v1/tools/sections/{sectionId}/delete` | An active turn |
| List the previews of a workspace | `list_previews` | `conductive previews list` | `GET /v1/tools/workspaces/{workspaceId}/previews` | The workspace token |
| Open a preview | `open_preview` | `conductive previews open` | `POST /v1/tools/workspaces/{workspaceId}/previews` | An active turn |
| Close a preview | `close_preview` | `conductive previews close` | `POST /v1/tools/workspaces/{workspaceId}/previews/{previewId}/close` | An active turn |

- [Sections](workspace-calls.md#sections) states the list of the sections.

## Sections

- `create_section` and `delete_section` change the sections of the org of
  the calling workspace, as every member can in the app. Reason: the
  sections of Conductive belong to the org.
- Calls for personal sections were left out (decision 277), because
  Conductive has no personal sections.
- `create_section` takes a name. A name that is blank after its spaces at
  the start and at the end gets HTTP 400 with the error code
  `invalid_input`, as the section route of the app does.
- The new section comes at the end of the sections of the org, as New
  section in the app does.
- The reply gives the new section with its ID and its name, as the section
  list gives them.
- `delete_section` takes a section of the org. It makes the same change as
  Delete section in the app.
- So each workspace of the section moves to the default section, also each
  archived one, as [Sections](orgs-and-members.md#sections) says. Each
  routine of the section moves there too, as
  [A routine](routines.md#a-routine) says.
- The default section cannot be deleted. A delete of it changes nothing,
  as in the app.
- An unknown section gets HTTP 404 with the error code
  `section_not_found`.
- The reply says whether the call deleted the section.

## Previews

- `list_previews` takes a workspace. It gives each open preview of that
  workspace, with its ID, its port, its link, and the time when it ends.
  Reason: Conductor's `preview get` gives the preview of a workspace.
- The list also holds the previews that members opened in the app.
- `open_preview` takes a workspace and a port. It opens a preview of that
  port, as a member does in the app, with the checks of
  [Port previews](port-previews.md). Reason: Conductor's `preview set`
  opens a preview.
- Each call opens a new preview, as each open in the app does.
- The reply gives the preview with its link. The link is the launch
  address of the preview on the app origin. So each load of the link needs
  a sign-in and access to the workspace, as
  [Port previews](terminal-previews-and-desktop.md#port-previews) says.
- Each preview that `open_preview` opens needs a sign-in. The call has no
  choice that opens a preview without a sign-in.
- Reason: sandbox code must not make its own server public through an
  agent.
- A preview opens only while the cloud computer of its workspace runs.
  Otherwise the call gets HTTP 409 with the error code `sandbox_not_ready`,
  as the app does. The call starts no cloud computer.
- A workspace whose owner is suspended refuses a new preview with the
  refusal of a resume, as
  [Sandbox access](suspension-workspaces.md#sandbox-access) says. Its
  previews can still be listed and closed.
- A preview ends as each preview does: when a member or an agent closes
  it, when the cloud computer stops, and after 24 hours.
- `close_preview` takes a workspace and a preview ID. It closes that
  preview for each viewer, as Close preview in the app does. Reason:
  Conductor's `preview delete` closes a preview.
- A close of a preview that is already closed, or that the workspace does
  not have, changes nothing, as in the app. Its reply says that no preview
  closed.
