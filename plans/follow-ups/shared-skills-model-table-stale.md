# Shared skills model table is stale

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from `calummoore/run-dev-servers-as-services-55oo`.
- **Location:** The shared skills repository, `skills/models/SKILL.md`.
- **Reason:** The services change belongs to Conductive and must not change the separate skills repository.

- **Terms:** The model table maps each delegated action to an agent, model, and effort.
- **Background:** Conductive agents use the shared model table for delegated work. The table names `opus-5-5-1m` for Claude actions.
- **Problem:** Conductive's `list_models` response on 20 November 2026 did not offer that model. It offered `claude-opus-5-5`.
- **Impact if no action:** New agents must detect the stale entry and select the nearest offered model on every task.
- **Root question:** How should the shared table name the Claude model that Conductive actually offers?
- **Options:**
  - **A.** Update the stale Claude rows to the offered model in the shared skills repository. Check the current list before editing. Keep the actions and max effort. Effort: Small.
  - **B.** Add the old model ID as an alias in Conductive. This keeps the table unchanged but adds application behavior for a stale name. Effort: Medium.
- **Left out:** Remove the model table. The shared skills require action-based model selection. There is no third useful correction to this factual mismatch.
- **Wider fix:** None. The models skill already requires checking offered models and choosing the nearest listed model when the table is stale.
- **Previous examples:** Cal's services task explicitly reported the mismatch and authorized `claude-opus-5-5` as the nearest model.
- **Recommendation:** A. It corrects the fact at its source.
- **Action:** fix after merge, apply A, because the separate skills repository owns the table.

Cal authorized the nearest offered model for the services task on 20 November 2026. No service implementation depends on this follow-up.
