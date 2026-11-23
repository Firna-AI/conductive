# Check the starting favourites in production

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-22, from branch `calummoore/model-configuration-variations-v2-87rl`, the model favourites change.
- **Location:** `wrangler.jsonc`, the var `CONDUCTIVE_STARTING_FAVOURITES`
- **Reason:** The check needs the deployed Worker and the production model list.

- **Terms:**
  - **Starting favourites:** the favourites of an account that never saved a change to its favourites. The Worker reads them from `CONDUCTIVE_STARTING_FAVOURITES` at each account read, and leaves out each entry whose model or effort `CONDUCTIVE_MODELS` does not hold.
- **Background:**
  - The production value starts with the app default, Opus 5.5 High. Opus 5.5 Max, Sonnet 5.5 Medium, GPT-6.2 Sol High, and GPT-6.2 Astra Medium follow, all with fast mode off.
  - A missing or bad value, or a list with no entry that remains, gives only the app default `CONDUCTIVE_DEFAULT_CHOICE`, with the warning `starting_favourites_fallback`. A left-out entry logs `starting_favourite_skipped`.
- **Task:** On `conductive.build`, sign in with an account that never changed its favourites. Open the model menu of a session. Check that it lists the five starting favourites above, in that order, with All models after them. Check the Worker logs for `starting_favourite_skipped` and `starting_favourites_fallback`.
- **Impact if no action:** A mismatch between the setting and the production model list can give every such account fewer favourites, or only the app default, with no one noticing.
- **Needs:** The merged and deployed change, and an account on `conductive.build` that never saved favourites.
- **Done when:** The menu shows the five starting favourites, and the logs hold neither warning for the account read.
