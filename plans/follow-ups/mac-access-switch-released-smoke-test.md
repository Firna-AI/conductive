# Smoke-test the Mac access switch in a release

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from branch `calummoore/mac-permission-issue-o7fv`, the post-merge task of its plan.
- **Location:** `src/shell/capabilities/MacAccessPart.tsx`, `desktop/src/device/settings.ts`, `worker/devices/settings-operation.ts`.
- **Reason:** It needs a released Mac app that holds the change, and a real Mac, which the branch's cloud computer does not have.

- **Terms:**
  - **Grant until Stop:** the Mac app permission "Allow all commands until I stop". It runs every command from one workspace on one Mac with no question.
- **Background:** In the Mac app, the Capabilities control of a workspace has one Mac access switch for this Mac. On starts a grant until Stop of the workspace on this Mac, and off stops it. Agents can always ask for a command on a Mac. The tests run with a fake Mac, so no test runs the switch on a real Mac.
- **Task:**
  1. Install a Mac app release that holds this change, and sign in.
  2. In a workspace, open Capabilities and turn Mac access on.
  3. Ask the agent to run a harmless command on the Mac, such as `uname -a`. Check that it runs with no question, and that the workspace bar says "Until you stop".
  4. Turn Mac access off. Ask for the command again. Check that the Mac app asks first.
  5. In New workspace, turn Mac access on, create the workspace, and check that the bar says "Until you stop".
- **Impact if no action:** A fault that only a real Mac shows can stop the switch from removing the questions, which is the problem the change fixes.
- **Needs:** A Mac app release with the change, a real Mac, and a signed-in member.
- **Done when:** Steps 3, 4, and 5 behave as written, or a fix item records each step that does not.
