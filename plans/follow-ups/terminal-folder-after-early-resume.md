# Check the terminal folder after an early resume

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, the post-merge task of the deleted Boat-native remote workspaces plan.
- **Location:** `worker/terminal/scripts.ts` (`terminalPromptCommand`), `src/shared/restore-marker.ts`, `worker/terminal/README.md`, `crates/cnd-cli/src/runner_command.rs`.
- **Reason:** The check needs a real resume of a sandbox from its saved disk, with a shell that starts before the restore ends.

- **Terms:**
  - **Restore:** on a resume, Boat brings back the disk of the sandbox lazily. `GET /sandboxes/{id}` of Boat gives `hydrated: true` and `hydratedAt` when the restore ends. Before that, folders can sit under `/var/lib/ascii-lazy/retired/`.
  - **Restore marker:** the file `/run/conductive-terminal/restore-ended`. It is written up to about 5 seconds after Boat gives `hydrated: true`.
  - **Folder hook:** the `PROMPT_COMMAND` that the terminal sets in tmux. At the first prompt after the restore marker exists, it moves a shell that started early into the repository folder, once.
- **Background:** A terminal shell that starts before the restore ends can sit in an old folder. The folder hook fixes this at the next prompt. A change to the terminal files reaches a workspace only through a new org image, also after a resume. Terminal tabs (PR #441) changed the tmux session of each tab: the attach script now runs `new-session -A -s "$session"`, not `-s workspace`. So read `worker/terminal/scripts.ts` first, and adapt the first step below to the installed files.
- **Task:**
  1. Build the org image again, so that it holds the current terminal files. Create a new workspace from it. Let it stop, for example after 30 minutes without activity.
  2. Resume it, and open the Terminal tab at once, so that its shell starts before the restore ends. Wait until `GET /sandboxes/{id}` gives `hydrated: true`.
  3. In that shell, check that `grep -c -F -- '/run/conductive-terminal/restore-ended' /usr/local/lib/conductive/terminal-sessions` prints `1`. A `0` means the workspace runs old programs.
  4. `readlink /proc/$(pgrep -o -x ttyd)/cwd` prints a path under `/var/lib/ascii-lazy/retired/`. This shows that the terminal started before the restore ended. With another path, this resume cannot test the fix. Stop and resume again.
  5. `ps -o lstart= -p $$` prints a time before `hydratedAt`. This shows that the shell started before the restore ended. With a later time, stop and resume again.
  6. Wait until `ls -l /run/conductive-terminal/restore-ended` shows the marker. Press Enter on an empty line, so that the folder hook runs.
  7. `readlink /proc/$$/cwd` prints `/home/user/code/<name>`. The prompt and `pwd -P` read `$PWD`, so they do not show the real folder.
  8. Run `mkdir conductive-once && cd conductive-once`, then `(cd .. && rmdir conductive-once && mkdir conductive-once)`. Then `readlink /proc/$$/cwd` prints `/home/user/code/<name>/conductive-once (deleted)`. This shows that the hook moves a shell only once. Run `cd .. && rmdir conductive-once`.
  9. Run `exit`, and press Reconnect. In the new shell, `readlink /proc/$$/cwd` prints `/home/user/code/<name>`, not a path under `/var/lib/ascii-lazy/retired/`.
- **Impact if no action:** A terminal that opens during a resume can work in an old copy of the repository, and the user's commands then change the wrong files.
- **Needs:** The deployed release, an org image built from it, Boat API access to read the sandbox record, and about 30 minutes for the workspace to stop.
- **Done when:** Each step above prints the expected result in one resume.
