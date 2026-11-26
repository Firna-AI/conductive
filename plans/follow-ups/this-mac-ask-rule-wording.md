# Remove on This Mac says that the command asks again

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-21, from branch `calummoore/workspace-capability-prompts-issue-2daj`, the "Outside the scope" list of its round 1 review. Narrowed on 2026-11-23, after commit `69d60d0d0` on `main` (#614) fixed four of its six texts.
- **Location:** `docs/protocol/desktop-commands.md:188`, `src/marketing/docs/mac-app.md:120`.
- **Reason:** These texts were on `origin/main` before the capability prompts branch, which corrects only its own copies of the rule.

- **Terms:**
  - **This Mac:** a tab of the account in the Mac app. It shows the Mac, its always-allowed commands, and the workspaces whose permission for all commands runs.
  - **Always allow:** a Mac app choice on one request. Each later request with the exact same command text then runs on that Mac with no question, in any folder.
  - **Workspace permission:** a permission for all commands from one workspace on one Mac, for 15 minutes or until Stop. The Mac app choices "Allow all commands for 15 minutes" and "Allow all commands until I stop" start it. The Mac access switch of the Mac app starts it too. The protocol docs call it a grant.
- **Background:**
  - An agent can ask to run a command on the Mac of the member whose message started its turn. The Mac app offers Deny and Allow, and a menu with Always allow and the two workspace permissions. `docs/protocol/desktop-commands.md` states these choices under "The choices".
  - The Mac app runs a request with no question when its command text is always allowed, or when a workspace permission of its workspace runs. `permits` in `desktop/src/device/permissions.ts:176` makes this check. `desktop/src/device/session.ts:119` then runs the command and shows no request.
  - Remove on the This Mac tab takes one command off the list of always-allowed commands. It ends no workspace permission.
  - The Mac app guide says: "Under **Always allowed**, use **Remove** to make that command ask again." It came with commit `8567cfb62`. `docs/protocol/desktop-commands.md` says: "After Remove, the next request with that command text asks again." It came with commit `00a502950`.
  - Other texts give the exception. The This Mac tab says: "Each command asks you first, unless you allowed it." `docs/protocol/mac-access.md` says that the Mac app asks before each command that Always allow or a grant does not cover. The text of the Mac command call in `crates/cnd-tools/src/help.txt` and `crates/cnd-tools/src/mcp-tools.json` says: "The Mac app asks before each command, unless a permission that its user chose there covers it."
- **Problem:** Both Remove texts say that the removed command asks again, with no exception. While a workspace permission of its workspace runs, the command still runs on that Mac with no question.
- **Impact if no action:** A user of the Mac app can believe that Remove makes the command ask again at once, also while a workspace permission runs. The two texts also differ from the This Mac tab, the tool text, and `docs/protocol/mac-access.md`.
- **Root question:** How should the Remove texts say when a removed command asks again?
- **Options:**
  - **A.** Give the exception in each text. The guide can say: "Under **Always allowed**, use **Remove** to make that command ask again, unless all commands from its workspace are allowed." The protocol doc can say that the next request with that command text asks again, unless a grant of its workspace covers it. Effort: Small.
  - **B.** Name the permission in each text: a permission for all commands from the workspace, for 15 minutes or until Stop. This gives more help, but each text must change when a workspace permission changes. Effort: Small.
  - **C.** Remove the claim that the command asks again from each text. The texts then cannot go stale, but readers lose the effect of Remove. Effort: Small.
- **Left out:** Keeping the texts leaves a false assurance. Two behaviour changes would make the texts true: a removed command that asks also while a workspace permission runs, or a Remove that also ends that permission. Each is a new Mac rule for the user to decide, not a wording fix. Stop already ends a workspace permission.
- **Wider fix:** Already in force. The documentation skill requires each text to match the behaviour. Add no prose test.
- **Previous examples:** Commit `69d60d0d0` on `main` (#614) corrected the same omission on 2026-11-22. It fixed the This Mac tab, its mockup, the rationale of the mockup page `app/new-workspace/capabilities`, and the section "Mac commands" of `docs/protocol/agent-tools.md`. The capability prompts branch corrected it on 2026-11-21 in its first texts of the Mac rule, and in a sentence of `docs/protocol/capabilities.md` from commit `a54fe3981`.
- **Recommendation:** A. It gives the exception in the words that the Mac app and the guide already use, and it stays true when the time of a workspace permission changes.
- **Action:** fix after merge, apply A, because these texts are older than the capability prompts branch and need their own branch.
