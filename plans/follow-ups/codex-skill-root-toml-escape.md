# Codex skill roots can give invalid settings

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, the check of review finding 301.
- **Location:** `runner/sdk-helper/src/providers/codex-skills.ts:46`.
- **Reason:** It needs a folder name with a control character, and its effect on the Codex start is not confirmed.

### 1. Codex skill roots can give invalid settings

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `runner/sdk-helper/src/providers/codex-skills.ts:46`.
- **Background:** The SDK helper passes each nested skill path of the org skills to Codex as a `-c` setting, quoted with `JSON.stringify`.
- **Problem:** `JSON.stringify` does not escape the character U+007F, which TOML forbids in a string. A folder name with it gives an invalid setting.
- **Impact if no action:** Codex can refuse its settings for such a repository. The effect is not confirmed.
- **Root question:** How does every path reach Codex as a valid TOML string?
- **Options:**
  - **A.** Escape U+007F and the other TOML control characters in the helper. Effort: Small.
  - **B.** Leave out a skill folder whose path holds a control character, with a warning. Effort: Small.
- **Left out:** Passing the paths in a settings file, because the helper sets per-process settings only.
- **Wider fix:** A, in one TOML quoting helper for every `-c` value.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps every skill.
- **Action:** fix after merge, apply A, because the case is rare and its effect is not confirmed.
