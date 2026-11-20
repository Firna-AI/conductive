# Model favourites

Status: Active. On branch `calummoore/model-configuration-variations-v2-87rl`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The model menu asks for a model and then an effort. It offers each model of
the deployment's model list, which holds 10 models today. A member uses a
few choices most of the time. This change adds favourites: up to five full
choices, each a model, an effort, and fast mode, that the model menu lists
first. A favourite shows what it runs, such as "Opus 5.5 Max Fast". It has
no name of its own. All models opens a submenu with every model. The
efforts and the Fast switch stay in the menu, so a member can change them
after a pick. Preferences gets a Favourites section, which is the only
place that adds, orders, and removes favourites. The visual spec is
`app/model-favourites` in the mockup catalogue, which
[PR #465](https://github.com/Firna-AI/conductive/pull/465) added.

The change does not cover keys that pick a favourite, favourites of an org,
or favourites in the agent tools. The agent tools keep their model list and
the saved default.

Contract owners:

- [Model favourites](../docs/protocol/model-favourites.md), a new protocol
  doc that Milestone 2 adds.
- [Fast mode](../docs/protocol/fast-mode.md), for the rows of the model
  menu.
- [Create a workspace](../docs/protocol/create-a-workspace.md#the-preference),
  for the Preferences tab.
- [Own endpoint logins](../docs/protocol/own-endpoint-logins.md), for the
  models that a picker hides.
- [Model inputs](../docs/deployment/models.md), for the deployment
  settings of the models.

## Decisions

- 16 November 2026: the user chose favourites, up to five set choices that
  show the real model names, the effort, and Fast, with no names of their
  own. The user can still change the effort and Fast after a pick, and can
  still choose any model in a submenu. The user rejected six other ideas,
  which `app/model-choice` drew for review:
  - Modes: Quick, Balanced, Deep, and Ultra in place of the model and the
    effort.
  - A depth ladder: one slider of steps, each a model at an effort.
  - Commands in the message, such as `/max`, for one message.
  - Auto: the app picks the effort, and Redo asks for more.
  - A compare panel with a card for each model.
  - Layered defaults for each repository, the member, and the org.
- Model favourites decision 1, 20 November 2026: the user chose A. A new
  account starts with five favourites. Option B, no favourites until the
  member adds one, and option C, the default of new workspaces as the
  only favourite, were not chosen.
- Model favourites decision 3, 20 November 2026: the user chose A, a new
  deployment setting, `CONDUCTIVE_STARTING_FAVOURITES`. The item below
  keeps the options and the record.
- Model favourites decision 2, 20 November 2026: the user chose A. A
  member adds a favourite only in Preferences. Option B, an "Add to
  favourites" row in the menu, was not chosen, because the user asked for
  favourites set up in advance, and the row adds a line to each menu.

### 3. Where the starting favourites come from

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/models.ts`, `wrangler.jsonc`.
- **Terms:**
  - **Starting favourites:** the favourites that an account has before
    its member saves a change to them, as decision 1 A requires.
  - **Model list:** `CONDUCTIVE_MODELS` in `wrangler.jsonc`, the models
    that a deployment offers.
  - **Default of new workspaces:** the saved default of the member, or
    else the app default, `CONDUCTIVE_DEFAULT_CHOICE`.
- **Background:** Each deployment sets its model list and its app default
  in the `vars` of `wrangler.jsonc`. The Worker has no built-in model, as
  `docs/deployment/models.md` says. The mockup names five sample
  favourites, but a real deployment can offer other models. Many members
  already have a saved default.
- **Problem:** Decision 1 A needs five starting favourites, but no rule
  says which choices an account gets. One list for each deployment can
  leave out the saved default of an existing member.
- **Impact if no action:** The Worker cannot give an account its
  favourites, so decision 1 A cannot ship.
- **Root question:** Which choices does an account that never saved
  favourites get, at the start and after each change of the model list?
- **Options:**
  - **A.** A new deployment setting, `CONDUCTIVE_STARTING_FAVOURITES`, a
    JSON list of up to five choices in the shape of
    `CONDUCTIVE_DEFAULT_CHOICE`, plus `fast`. The list can leave out the
    saved default of a member, and it repeats model IDs of the model
    list. Effort: Small.
  - **B.** A rule in code that derives five choices from the model list:
    the app default, then the next models of the list at the effort of
    the app default, or the nearest lower one. No setting to keep. The
    order of the production list gives at most one Codex choice, and a
    model added at the top changes each account that never saved
    favourites. Effort: Small.
  - **C.** A list in Worker code, by model ID. It breaks the rule of
    `docs/deployment/models.md` that the Worker has no built-in list, and
    each change needs a code change, as A does. Effort: Small.
  - **D.** An optional field on each entry of the model list, such as
    `"starting": [{ "effort": "high" }, { "effort": "max", "fast": true }]`.
    The favourites follow the order of the list, then the order of each
    field, up to five. A favourite cannot name a missing model, and the
    previous Worker ignores the field. A new version of a model needs the
    field moved by hand. Effort: Small.
  - **E.** The default of new workspaces of the account comes first. The
    entries of the setting of A follow, without exact duplicates, up to
    five. A new account gets the same five as A. A member with a saved
    default sees it first. Until the member saves favourites, a change of
    the saved default also changes the first favourite. Effort: Small.
- **Left out:**
  - No change: it fails the goal, because decision 1 A cannot ship.
  - An editor on the operator page: it breaks the user choices of 8 and 9
    November 2026 to keep the model settings in Worker variables, which
    `plans/follow-ups/bad-model-list-stops-app.md` records.
  - A list for each org: the user rejected layered defaults on
    16 November 2026, and this plan leaves org favourites out.
  - Favourites from use: a new account has no use, and the user chose set
    choices, not a list that moves.
- **Wider fix:** None. Each option filters out an entry that the model
  list does not hold, as the design calls say.
- **Previous examples:** `CONDUCTIVE_DEFAULT_CHOICE`, the app default,
  which a saved default comes before.
- **Recommendation:** E. It gives a new account the same five as A, and
  it keeps the saved default of each existing member as the first
  favourite. The first recommendation was A, which the options check of
  20 November 2026 changed, because the list of A can leave out the saved
  default of an existing member.
- **Action:** ask the user, because the starting favourites need a new
  setting of each deployment that no requirement covers.
- **Decision:** 20 November 2026: the user chose A, not the recommended
  E. Each deployment sets its starting favourites in
  `CONDUCTIVE_STARTING_FAVOURITES`. Every account that never saved
  favourites gets the same list. A saved default of a member does not
  join the list.

## Design calls

These calls are mine, made on 20 November 2026, unless a line says
otherwise.

- An account stores no favourites until its member saves a change. Until
  then, it gets the starting favourites of decision 3. So a change of
  the setting reaches each account that never changed its favourites. A
  copy at sign-up was rejected, because it keeps old models in old
  accounts.
- The favourites live in one nullable text column of `user_preferences`,
  as a JSON list. Null means the starting favourites. An empty list means
  that the member removed each favourite. A new table was rejected,
  because the list is small and always reads and saves as a whole.
- `PUT /api/account/favourites` saves the whole list. It checks each
  entry as `PUT /api/account/default-model` does, with the same errors.
  It keeps the first of exact duplicates and the first five entries. It
  turns fast mode off for a model without fast mode, as `modelChoice`
  does. So the route adds no new rejection.
- An account that exists before the deploy also gets the starting
  favourites, because decision 1 A rejected a start with no favourites.
  Its saved default stays the choice of new workspaces. When the list
  does not hold that default, the menu of a new workspace marks no
  favourite, as for a changed effort. A start with no favourites only
  for older accounts was rejected, because it splits the members into
  two menus.
- The Worker never fails because of the starting favourites. It leaves
  out each entry whose model the model list does not hold, or whose
  effort that model does not offer, and logs a warning. It turns fast
  mode off for a model without fast mode. It keeps the first five
  entries. A missing, empty, or bad setting gives only the app default,
  `CONDUCTIVE_DEFAULT_CHOICE`. So a bad value never stops the app
  from starting, as `configuredDefaultChoice` would with HTTP 503.
- `CONDUCTIVE_STARTING_FAVOURITES` in `wrangler.jsonc` starts with the
  app default, Opus 5.5 High. Opus 5.5 Max, Sonnet 5.5 Medium, GPT-6.2
  Sol High, and GPT-6.2 Astra Medium follow, all with fast mode off. Each
  agent then has a deep and a quicker choice, from the newest models of
  the production list.
- `GET /api/account` gives `favourites`, the saved list or the starting
  favourites. An older app ignores the new field.
- A favourite whose model the model list no longer holds, or that the
  member's own endpoint does not list, stays saved. The menu leaves it
  out, as the pickers hide such models today. Preferences shows it
  greyed, with a line that says why, so the member can remove it.
- With no favourite to show, the menu lists every model at its top, as it
  does today, and has no All models row.
- Each model picker of the app shows the favourites menu: a session, New
  workspace, the default of new workspaces, and an automation. The
  pickers of the Favourites rows show the menu with no favourites, which
  lists every model at its top, because a row sets one favourite. Made on
  16 November 2026.
- The menu marks a favourite only when it matches the current choice
  exactly, with its fast mode. Made on 16 November 2026.
- A favourite of the other agent in a session with messages opens a new
  session with the draft, as a model of that agent does today. It shows
  the same icon. Made on 16 November 2026.
- A pick in All models keeps the effort when the model has it, and
  otherwise takes the nearest lower effort, as `effortFor` does today.
- The menu has no heading over the favourites. The efforts stay rows in
  the menu, not a submenu. Made on 16 November 2026.
- A phone shows the All models list in place of the menu, with Back at
  its top. Made on 16 November 2026.
- Every picker on the org login follows the list of the org endpoint,
  from decision 3 A of the org logins plan. So the menu of a session on
  that login also leaves out each favourite whose model that list does not
  name, as `app/chat/endpoint-models/org` shows. Preferences greys a
  favourite only for an own endpoint of the member, because the list of
  the org endpoint applies only to the sessions on the org login, and only
  an admin sees it.
- In Preferences, the row of a favourite that the menu leaves out keeps
  its handle, its picker, and ×. Its picker shows at half strength and
  still works, so a pick of a listed model shows the favourite in the menu
  again. The line under it says "Hidden from the model menu, because your
  endpoint does not list Fable 5.1." For a model that the model list no
  longer holds, it says "Hidden from the model menu, because `<model ID>`
  is no longer available." It names the model ID, because the model list
  has no label for a model that it no longer holds. A picker that is off was rejected, because the
  member would then remove the favourite and add another to change it.
- A failed save of the Favourites section keeps the saved list. The error
  under the list says "The change wasn't saved. Try again.", in the rose
  colour with an alert icon, as the other errors of Preferences do. The
  next change tries again.
- A saved favourite whose model no longer offers its effort shows in the
  menu as saved, as the saved default does today. A hidden row or a move
  to the nearest effort was rejected, because the case needs the model
  list to drop an effort, and the saved default already sets the rule.
- Duplicates are compared after Fast is turned off for a model without
  fast mode, in the route and in the setting. So no list holds two equal
  favourites.
- A malformed entry of `CONDUCTIVE_STARTING_FAVOURITES` is left out with
  a warning, and the other entries still work. Only a missing value or a
  value that is not an array falls back to the app default, with a
  warning. With no app default either, the read gives no favourites and
  still works.
- `PUT /api/account/favourites` takes and gives `{ favourites }`. It
  checks each entry as `PUT /api/account/default-model` does, and does
  not check the model or the effort against the model list.
- `docs/protocol/create-a-workspace.md` passed the 250-line limit of the
  `documentation` skill, so its "Page or dialog" and "The dialog" parts
  moved, unchanged, to `docs/protocol/new-workspace-dialog.md`. The new
  `model-favourites.md` is a top-level protocol doc, because
  `messages-and-attachments.md` has no room for another child link.
- On a phone, the menu with five favourites and the six efforts of Opus
  5.5 is about 590 px high. Each menu keeps its height limit of 70% of the
  screen, so on a screen lower than about 845 px the menu scrolls, and the
  Fast row shows after a scroll. The efforts stay rows, as the user chose
  on 16 November 2026. The marketing picture of the picker shows four
  favourites, so that its menu fits the picture.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockup of `app/model-favourites` exists. This milestone makes it the
spec. Each other page that draws a model picker shows the favourites
menu.

- [x] Draw the favourites menu in the mockup `ModelPicker` by default,
      with a prop for the menu of today, which the Favourites rows use.
- [x] Update the text of each page that draws an open picker:
      `app/composer` (`picker`), `app/fast-mode`, `app/new-workspace`
      with its dialog, `app/account/preferences` (`model-menu`), the
      prompt box of `app/automations`, and `app/chat/endpoint-models`.
- [x] Remove the review words of `app/model-favourites`. Say in its
      `new-account` view that the deployment setting of decision 3 A
      gives the starting favourites.
- [x] Split `app/model-favourites` into child pages, as it passes five
      views. Add the views of the design calls:
  - [x] A menu that leaves out a favourite whose model the own endpoint
        does not list.
  - [x] Preferences with that favourite greyed, with its line.
  - [x] A menu with no favourites.
  - [x] A failed save of the Favourites section.
- [x] Put the Favourites section into the Preferences tab of
      `AccountScreen`, and drop the `content` slot that only
      `app/model-favourites` uses.
- [x] Capture the marketing pictures again with
      `npm run marketing:pictures`. Two pictures show the open picker.
- [x] Update `docs/mockups/catalogue.md` and
      `docs/mockups/design-chat.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [ ] Draw what Add a favourite adds in the Favourites section, after the
      user answers the open question of 20 November 2026. No mockup, design
      call, or requirement says which choice a new favourite starts with,
      or when it saves, and every view holds five favourites, so the button
      is always off.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add `docs/protocol/model-favourites.md` with the requirements and
      the decisions in force, and list it in
      `docs/architecture/protocol-docs.md`, the index that
      `docs/protocol/README.md` points to.
- [x] Update the rows of the model menu in `docs/protocol/fast-mode.md`.
- [x] Update the Preferences tab in `docs/protocol/create-a-workspace.md`.
  - [x] Move its sections Page or dialog and The dialog to
        `docs/protocol/new-workspace-dialog.md`, because the doc passed
        250 lines. Pointer sections keep their anchors.
- [x] Add the hidden favourites to
      `docs/protocol/own-endpoint-logins.md`.
- [x] Check the model picker lines of `agents-and-sessions.md`,
      `keyboard-shortcuts.md`, `automations.md`, and `org-logins.md`.
- [x] Add `CONDUCTIVE_STARTING_FAVOURITES` to
      `docs/deployment/models.md`: its shape, its limit of five, the
      entries that the Worker leaves out, and the app default when it is
      missing. Check `docs/deployment.md` and `docs/local-development.md`
      for the list of model settings.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence that restates what the account stores.
- [x] Read each public guide in `src/marketing/docs/` in full. Update the
      steps that choose a model, in `get-started.md`, `workspaces.md`,
      and `sessions-and-chat.md`, and add a Favourites step.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: The Worker

Depends on: 2

- [ ] Add a migration with the nullable `model_favourites` column of
      `user_preferences`. Check that the previous Worker keeps working, as
      `migrations/README.md` says.
- [ ] Read `CONDUCTIVE_STARTING_FAVOURITES` in
      `worker/app-api/models.ts`, with the filter, the warning, and the
      fallback of the design calls. Add it to the `vars` of
      `wrangler.jsonc` with the production values of the design calls,
      and to the env types.
- [ ] Read and save the list in `worker/app-api/account-data.ts`.
- [ ] Give `favourites` in `GET /api/account`, and add
      `PUT /api/account/favourites` in `worker/app-api/boot.ts`, with
      `ACCOUNT_PATHS.favourites` in `src/shared/account.ts`.
- [ ] Add the same route to the dev routes of
      `src/app/dev/account-routes.ts`.
- [ ] Test the read, the save, the starting favourites, a missing and a
      bad setting, an entry outside the model list, the duplicates, the sixth entry, a
      model outside the list, and the isolation between accounts.

## Milestone 4: The model menu

Tags: ui

Depends on: 3

- [ ] Read and save the favourites in `src/app/account-model.ts`. A
      failed save keeps the saved list.
- [ ] Build the favourites rows in one module that both pickers use:
      `src/chat/components/model-menu.ts` and
      `src/shell/ui/ModelPicker.tsx`.
- [ ] Add the All models submenu to the chat menu in
      `src/chat/ui/Menu.tsx`, with the keys of the submenu of
      `src/shell/ui/MenuList.tsx`. On a phone, show the list in place of
      the menu, with Back.
- [ ] Hide the favourites whose model the own endpoint or the model list
      does not hold.
- [ ] Keep the keys of Model picker, Next effort level, and Fast mode
      working as before.
- [ ] Add component tests for the rows, the marks, the submenu, and a
      favourite of the other agent.

## Milestone 5: The Favourites section

Tags: ui

Depends on: 4

- [ ] Add the Favourites section to `src/shell/account/PreferencesSections.tsx`:
      the rows in order, a drag that moves a row, × that removes it, and
      Add a favourite, which is off at five.
- [ ] Show a favourite that the menu leaves out greyed, with its line.
- [ ] Show the error of a failed save under the section.
- [ ] Add component tests for the add, the move, the removal, the limit,
      and a failed save.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, open the model menu of an account that never
      changed its favourites, and check its starting favourites.
