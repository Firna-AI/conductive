# Blocked Codex sessions wait for the line split fix

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from branch `calummoore/agent-stopped-mn5l`, after pull request #474 merged. The user asked for the open work of that investigation as follow-up items.
- **Location:** None.
- **Reason:** The check needs the fix of commit `a1465dac8` on the cloud computers, and a cloud computer installs it only after the deploy.

- **Terms:**
  - **SDK helper:** the Node program in each cloud computer that starts the Claude and Codex programs for the agent runner, in `runner/sdk-helper/`.
  - **Codex thread:** the saved conversation of a Codex session. Each new turn of the session resumes it.
  - **Restart:** the action in the menu of the state in the workspace header. It downloads the newest release and restarts the agent runner. It ends each turn that still runs, as `docs/protocol/restart-the-software.md` says.
- **Background:**
  - Before commit `a1465dac8`, the SDK helper read the output of the Codex App Server with `node:readline`. `readline` also ends a line at U+2028 and U+2029. Codex writes both characters raw inside JSON strings.
  - A Codex message with one of these characters split into pieces that are not JSON. The helper then stopped Codex, and the turn failed with "The agent process ended."
  - The Codex thread keeps such text. So each later turn of the session failed the same way when it resumed the thread, before its first model request.
  - Commit `a1465dac8`, "fix(runner): keep Codex output lines whole at U+2028 and U+2029", merged on 18 November 2026. The helper now splits the App Server output only at LF. A local resume of the two real thread files worked with the fixed helper, and failed with the old one.
  - A cloud computer checks for a newer release every 10 minutes while its runner runs. It installs the release at its next start, at Restart, or when its workspace is idle for 2 minutes, as `docs/protocol/sandbox-software.md` says. A turn that waits for background work counts as a running turn, so its workspace is not idle.
  - These sessions were blocked on 18 November 2026:
    - The first session, `gcci3OZaRB6WU2b6oqXz_HFxMfPSHobtd_VrzXfQ59c`, of the workspace "mokly bundle hot path 2", `GSKVPU45lZrnMEcFGREiOOj-KnKpZR5bo1UIkjF7f2A`, in the Mokly org. Its first turn failed at 04:11 UTC, and its next two messages failed at the start of their turns. Another session of that workspace, `wfIv2quUKIGPSgmKgPHpJQv9mLtSyU3UJRIFL9re0N0`, had a Claude turn open since 08:14 UTC. While that turn runs, the workspace is not idle.
    - The review session `wPYmaGPId-_SoOY_iXy8roi2SM8Rt6cN739wpFGrAlo` of the workspace "agent process ended (mokly)", `GioZ9fTRYE12ViLHTsTE-mg-E9lPsHMyNlf0uqxkBds`. It failed when its Node probe printed U+2028.
    - The workspace "mokly sidecar bundle hot path", `g3rQA6Km_OA7Z7uxf9gjw17gZGPBxrnLy6rJEanlgtE`, failed the same way on 17 November 2026. It is archived, so it needs no check.
  - The cloud computer of "agent process ended (mokly)" keeps copies from the investigation. `/home/user/agent-stopped-evidence/` holds two Codex thread files with raw U+2028. `/home/user/code/remote-code/.context/boat/` holds the Codex logs and the runner state of "mokly bundle hot path 2". Both hold session text of the Mokly org.
- **Task:**
  1. After the deploy of commit `a1465dac8`, open "mokly bundle hot path 2". When its cloud computer did not install the newer release yet, press Restart. Restart ends the turns that still run.
  2. Send one message to its first session. Check that the turn gets a model answer.
  3. Close the failed review session of "agent process ended (mokly)", or send it one message to check it the same way.
  4. Delete `/home/user/agent-stopped-evidence/` and `/home/user/code/remote-code/.context/boat/` on the cloud computer of "agent process ended (mokly)".
- **Impact if no action:** The first session of "mokly bundle hot path 2" stays blocked until its cloud computer installs the fix by itself. Copies of the Mokly session text stay on another cloud computer.
- **Needs:** The deployed fix of commit `a1465dac8`, and a member of the Mokly org with access to "mokly bundle hot path 2".
- **Done when:** A new turn of the first session of "mokly bundle hot path 2" ends with a model answer, and both copy folders are deleted.
