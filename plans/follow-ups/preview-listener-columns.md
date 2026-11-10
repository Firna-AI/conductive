# Unused preview listener mode remains after relay switch

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/port-preview-error-v2`.
- **Location:** `migrations/202611070900_preview_listener_mode.sql:1` and `worker/previews/sandbox-records.test.ts:24`.
- **Reason:** Deployment applies migrations before it uploads the Worker, so the previous Worker still needs the listener mode during deployment.

- **Terms:**
  - **Preview relay:** the sandbox service that sends preview requests to the selected local port.
  - **Listener mode:** the unused `listener_mode` column in the D1 table `preview_hostnames`.
  - **Sandbox record:** `listener_sandbox_id` in the same table, which records the cloud computer of a preview for operator searches.
- **Background:** Every preview now uses the relay. On 10 November 2026, the user chose to refuse previews without a running relay. The Worker no longer reads or writes the listener mode. The previous Worker needs that column until deployment replaces it. The sandbox record stays in use.
- **Problem:** The database still holds the obsolete listener mode. Removing the sandbox record would break the required operator search for a computer after its preview closes.
- **Impact if no action:** The schema keeps the old preview route's unused mode.
- **Root question:** How do we remove the unused listener mode without breaking the previous Worker during deployment?
- **Options:**
  - **A.** After the relay Worker deploys, add a new migration that drops only `listener_mode`. Keep `listener_sandbox_id` and its writes in `worker/previews/store.ts`. Keep its reader in `worker/operator/org-directory.ts`. Remove the obsolete mode fixtures and assertions from `worker/previews/sandbox-records.test.ts`. Keep its sandbox record assertions. Check that no live query reads or writes `listener_mode`. Run the migration against the previous schema. Then run the preview and operator tests. Effort: Small.
- **Left out:** Removal in the relay deployment breaks the previous Worker before its replacement uploads. Keeping the mode indefinitely fails the requested cleanup. Dropping both columns breaks the required operator search. Only the mode removal after deployment meets these requirements.
- **Wider fix:** A removes the obsolete state while preserving the sandbox records that operator searches need.
- **Previous examples:** `migrations/202611070900_preview_listener_mode.sql` added both columns. `worker/operator/org-directory.ts` reads the sandbox record after a preview closes. `docs/protocol/operator-section.md`, "Orgs and Users", requires that search for later abuse reports.
- **Recommendation:** A. It preserves the deployment order and the operator's sandbox records.
- **Action:** fix after merge, apply A, because the previous Worker must be replaced before the migration drops its listener mode.
