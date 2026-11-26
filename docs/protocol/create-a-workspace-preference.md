# Create a workspace: the preference

This doc holds the requirements and the decisions in force for the
preference that chooses how New workspace opens, as the page or as the
dialog. It covers the tabs of the Account page, the New workspaces
section, the save of the choice, and its default. It belongs to
[Create a workspace](create-a-workspace.md), which covers the rest of New
workspace, the create, the branch, and a failed first start. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The Account page

- The Account page has five tabs, General, Agents, Preferences, Keyboard
  shortcuts, and Stats, each with its own address. Agents holds the logins
  of Claude and Codex (the user asked on 13 November 2026). General holds
  the other sections of the account.
  [Keyboard shortcuts: the settings tab](keyboard-shortcuts-tab.md) gives
  the fourth tab. [Account stats](account-stats.md) gives the fifth tab.
  The Mac app adds [This Mac](desktop-commands.md#saved-choices) as the
  sixth tab.
- Preferences starts with the Favourites section, which
  [Model favourites](model-favourites.md#the-favourites-section) states.
  The New workspaces section follows, with Model and effort and the choice
  of how New workspace opens (decision 142 of PR #73).
- Reason: all the settings of new workspaces then sit together. The
  section on General, with only the new choice on Preferences, was
  rejected, because the user then looks in two places.
- Model and effort also saves fast mode, with the Fast switch of its menu.
  New workspace starts from the saved choice with its fast mode, as
  [Fast mode](fast-mode.md#saved-defaults-new-workspaces-and-automations)
  says.

## The choice

- The choice offers the page and the dialog. Each change saves at once, as
  a change of Model and effort does.
- When a save fails, the choice keeps the saved value, and an error shows
  under it. A toast was rejected, because the error under the choice is
  closer to it.
- The choice belongs to the account. So it applies in each browser and in
  the Mac app.
- Reason: a setting of the Account page that holds in one browser only
  would surprise the user. A choice in the storage of the browser was
  rejected for that reason.
- Without a saved choice, such as for a new account, New workspace opens
  as the dialog. The user asked for the dialog as the default for new
  users on 12 November 2026.
- Each account that existed before that change keeps the page, as its
  saved choice. Reason: the user asked for the new default for new users
  only. A default that also moved the existing accounts to the dialog was
  rejected, because their New workspace would change without their choice.
- A save of the choice saves no model. A user who never chose Model and
  effort keeps the default model and effort of the app.
- An open app uses a choice that the user saved in another browser or in
  the Mac app after its next start, as for Model and effort.
- Reason: a saved copy of that default would hold the model for the user
  when the app changes its default.
