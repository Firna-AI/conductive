# Repository, section, and model lists

This doc holds the requirements and the decisions in force for the lists
that a create call of the workspace tools takes. These are the lists of
the repositories, the sections, and the models. It belongs to
[Workspace calls](workspace-calls.md), which states the create call.
[Agent tool access](agent-tool-access.md) states what each call reaches.
The terms are those of the [architecture doc](../architecture.md#terms).

## The lists

Three list calls give the repositories, the sections, and the models that
a create call takes, with their IDs.

| List | MCP tool | CLI command | Route |
| --- | --- | --- | --- |
| Repositories | `list_repositories` | `conductive repositories list` | `GET /v1/tools/repositories` |
| Sections | `list_sections` | `conductive sections list` | `GET /v1/tools/sections` |
| Models | `list_models` | `conductive models list` | `GET /v1/tools/models` |

- One call that returns all three lists was rejected, because most create
  calls need only the repository.
- Each list call needs only the workspace token, as the
  [workspace list](workspace-calls.md#list-the-workspaces) does. It needs
  no active turn.
- Reason: the calls read data that every member of the org already sees,
  and they start no work.

## Repositories

- The repository list returns exactly the repositories that a create call
  accepts at that time. These are the repositories of the newest good org
  image of the org of the calling workspace.
- A list of the repositories that the org chose was rejected, because a
  chosen repository that no image holds yet fails the create.
- Each entry gives the repository ID that a create call takes, the GitHub
  name, such as `acme/web`, and the default branch.
- Each entry also says whether it is the repository of the calling
  workspace.
- The list is in the
  [repository order](orgs-and-members.md#repository-order) of the org.
  A repository of the image that the org no longer chose goes at the
  end, in the order of the GitHub names (repository-order decision 2 B).
- Reason: an agent then sees the same order and the same first
  repository as the people of the org.
- When the org has no good image, the call fails with HTTP 409
  `image_required`, the same error as a create.
- Reason: an empty list would hide why no create can work.

## Sections

- The section list returns every section of the org of the calling
  workspace, in the order of the sidebar.
- Each entry gives the section ID and the name.
- Each entry also says whether it is the default section, the section that
  a create of a top-level workspace uses when it names none.
- [Sections](section-and-preview-calls.md#sections) states the calls that
  create and delete a section.

## Models

- The model list returns the models that the app offers, in the order of
  the app's model setting. The model picker of the app offers the same
  models.
- Each entry gives the agent, the model ID, the label, the efforts of the
  model, and whether the model has fast mode.
- The answer also gives the default choice. A create uses it for the model
  or the effort that the call does not name. Its fast mode is always off,
  because a create runs fast only when the call asks for it.
- The default choice is the saved default of the owner of the calling
  workspace. Without a saved default, it is the default choice of the app.
- The default choice is `null` when the owner has no saved default and the
  app has no valid default choice.
- When the app has no valid model list, the call fails with HTTP 503
  `models_unavailable`, as the app's own model route does.
