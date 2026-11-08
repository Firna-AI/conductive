# Programs that start during a restore keep an old disk view

- **Severity:** High. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-08, from branch `calummoore/directory-path-length`, after the user saw the terminal prompt `var/lib/ascii-lazy/retired/home/code/mokly$`.
- **Location:** the `cd` of the terminal launcher and of the shell server in `launcherScript` and `sessionServerScript` of `worker/terminal/scripts.ts`, the folder hook `terminalPromptCommand` in the same file, the startup command at `worker/lifecycle/image-software.ts:102`, and `startWorkspaceTerminal` at `worker/terminal/service.ts:98`.
- **Reason:** the check needs the deployed change and a real Boat sandbox.

- **Terms:**
  - **Restore:** after a start from a saved snapshot, Boat shows all files at once and downloads their content in the background.
  - **Old view:** the earlier view of the files that Boat keeps under `/var/lib/ascii-lazy/retired/` when the restore ends.
  - **Folder hook:** the Bash prompt command `terminalPromptCommand`. Before each prompt, it moves a terminal shell to the live copy of its current folder when the restore moved it.
- **Background:**
  - Boat's docs say that the content of restored files "is on the local disk a few seconds later. Files that a program opened before then keep working". The docs do not name the old view or say if it shares the live files.
  - Boat's docs also say that a restore needs no space for a second copy of the disk. This suggests that the old view shares the files, but nobody checked it.
  - A program whose current folder is in the restored disk keeps that folder when the restore ends. Its folder is then in the old view, at a path such as `/var/lib/ascii-lazy/retired/home/code/mokly`. Each workspace start runs the org's startup script and starts the terminal before the restore ends.
  - The Terminal is the default tool of the workspace screen, and it connects as soon as the workspace is ready. A page that showed the Terminal tab once also connects it again, hidden, at each resume. So the first shell often starts before the restore ends.
  - On 8 November 2026, the user chose option E of this item: apply the folder hook now, then run the check below. The branch `calummoore/directory-path-length` applied the hook, and the tmux fix for shells that start after the restore.
  - A local simulation with tmux and moved mounts showed what the hook still misses. In a shell that waits at its prompt when the restore ends, the next command still runs in the old view. The hook moves the shell when that command ends.
  - A program that a shell or the startup script started before the restore ended, such as a dev server, keeps the old view. It gets the old path when it asks for its folder, and its file watches can miss changes at the live path.
  - The runner gives each agent process the folder path as text, in `runner/src/config.ts`. An agent process lives for one turn. The first turn of a new workspace starts when the workspace is ready, so its process can stay in the old view.
- **Task:** After the deploy, run the check and the extra probes below in a real sandbox. Record the results in this item. Then ask the user to choose for the programs that the hook does not cover:
  - No more change, when the old view shares the live files and their file-change events.
  - **C.** Start the terminal only after Boat reports the end of the restore. The Terminal tab then waits, for minutes on a large disk.
  - **D.** Run the startup script and start the terminal only after the restore ends. Every start then waits, and the wait counts toward the 20-minute limit of a start.
  - **F.** Report the old view to Boat. Ask whether it shares the live files, and ask for a move of running programs or for a signal at the end of the restore.
  - **G.** Write a marker file when Boat reports the end of the restore. A helper in the image restarts each program that an admin wraps with it.
  - **H.** Also move the shell before each command, with a Bash `DEBUG` trap. It closes the gap of the first command. It conflicts with the user's own `DEBUG` traps, and it adds work before each command.
- **Impact if no action:** If the old view is a separate copy, the first command after the restore, the programs of the startup script, and an early agent turn work on files that the live folder does not get. Users can then lose work.
- **Needs:** the deployed change of branch `calummoore/directory-path-length`, an org image built after the deploy, and a running workspace sandbox.
- **Done when:** this item records the results, and the user chose an option for the programs that the hook does not cover.

Run the check in the Terminal tab, after the restore has ended. Replace
`<name>` with the folder name of the repository.

```sh
cd /var/lib/ascii-lazy/retired/home/code/<name>
touch conductive-probe; ls -l ~/code/<name>/conductive-probe; rm -f conductive-probe
findmnt -T .
cd ~/code/<name>
```

- When `ls` lists the file, the old view shares the live files.
- When `ls` says "No such file", the old view is a separate copy.
- `findmnt` gives the kind of mount of the old view. Record it with the
  result.
- The folder hook does not move a shell that a `cd` put in the old view,
  because `$PWD` then names the old view.
- When the first `cd` says "No such file or directory", the old view is
  gone at that time. When it says "Permission denied", run the check with
  `sudo`. In both cases, you can also open the Terminal tab as soon as a
  resumed workspace is ready. After the restore ends, the first command in
  that shell, `readlink /proc/$$/cwd`, gives the path of the old view. Run
  the check from that path.

The extra probes:

- Change a file at the live path, then read it through the old view.
- Watch a file in the old view, for example with `inotifywait`, while the
  file changes at the live path.
- Run `readlink /proc/$$/cwd` in an agent command during a turn that
  continues past the end of the restore.
- Record how long the restore takes, from `hydratedAt` of
  `GET /sandboxes/{id}`.
