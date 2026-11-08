# Programs that start during a restore keep an old disk view

- **Severity:** High. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from branch `calummoore/directory-path-length`, after the user saw the terminal prompt `var/lib/ascii-lazy/retired/home/code/mokly$`.
- **Location:** the `cd` of the terminal launcher and of the shell server at `worker/terminal/scripts.ts:80` and `:98`, the startup command at `worker/lifecycle/image-software.ts:102`, `startWorkspaceTerminal` at `worker/terminal/service.ts:98`, and the default tool at `src/shell/workspace/tools/tool-navigation.ts:80`.
- **Reason:** only a check in a real Boat sandbox shows how much harm the old view does, and the choice of option depends on that result.

- **Terms:**
  - **Restore:** after a start from a saved snapshot, Boat shows all files at once and downloads their content in the background.
  - **Old view:** the earlier view of the files that Boat keeps under `/var/lib/ascii-lazy/retired/` when the restore ends.
  - **Live folder:** the repository folder at its normal path, such as `/home/user/code/mokly`.
- **Background:**
  - Boat's docs say that the content of restored files "is on the local disk a few seconds later. Files that a program opened before then keep working". The docs do not name the old view or say if it shares the live files.
  - Boat's docs also say that a restore needs no space for a second copy of the disk. This suggests that the old view shares the files, but nobody checked it.
  - Each workspace start runs the org's startup script and starts the terminal before the restore ends. Each of them moves into the repository folder.
  - A program whose current folder is in the restored disk keeps that folder when the restore ends. Its folder is then in the old view, at a path such as `/var/lib/ascii-lazy/retired/home/code/mokly`.
  - The user chose on 8 November 2026 to give tmux the path of the repository folder when a terminal connection creates the workspace shell. So a shell that starts after the restore opens in the live folder.
  - The Terminal is the default tool of the workspace screen, and it connects as soon as the workspace is ready. So its first shell often starts before the restore ends.
  - At each resume, a page that showed the Terminal tab once connects a hidden Terminal tab again, in `src/shell/workspace/tools/ToolsPart.tsx`. So the first shell after a resume often starts before the restore ends, also when another tool is open.
  - A local simulation with tmux and moved mounts showed that a shell that starts before the restore ends moves to the old view. Its prompt still shows the normal path, because Bash keeps the path text in `PWD`.
  - The runner gives each agent process the folder path as text, in `runner/src/config.ts`. So each agent process that starts after the restore ends works in the live folder. An agent process lives for one turn. The first turn of a new workspace starts when the workspace is ready, so its process can stay in the old view.
- **Problem:** A terminal shell that starts before the restore ends, each program that the startup script starts, such as a dev server, and an agent turn that runs past the end of the restore keep the old view. A program in the old view gets the old path when it asks for its current folder. Its file watches can miss changes at the live path. If the old view is a separate copy, it does not see the live files at all.
- **Impact if no action:** Tools can write the old path into files, such as Python virtual environments, and a dev server can miss file changes. If the old view is a separate copy, users can lose terminal work, and the agent does not see it.
- **Root question:** How do the terminal shell and the programs that start before the restore ends keep working in the live repository folder?
- **Options:**
  - **A.** Run the check below. If the old view shares the live files, change nothing and delete this item. Effort: Small.
  - **B.** Add a Bash prompt hook to the terminal shell. Before each prompt, the hook moves the shell back to the live folder if the restore moved it. Programs that already run keep the old view. Effort: Small.
  - **C.** Start the terminal only after Boat reports the end of the restore. The Terminal tab then waits for some seconds, or for minutes on a large disk. Effort: Medium.
  - **D.** Run the startup script and start the terminal only after the restore ends. This covers every program that the app starts. Every workspace start then waits for the restore, and that wait counts toward the 20-minute limit of a start. So a very large disk can make a start fail. Effort: Medium.
  - **E.** Apply B now. Then run the check below with its extra probes. The result chooses between no more change, G, and D. The hook runs before each Bash prompt. The check needs a deploy, an image build, and some of the user's time. Effort: Small.
  - **F.** Report the old view to Boat. Ask whether it shares the live files and their file-change events. Ask Boat to move running programs onto the live disk when the restore ends, as it already does for Docker volumes, or to give a signal inside the sandbox when the restore ends. The team does not control if or when Boat acts. Effort: Small.
  - **G.** Give the startup script a signal for the end of the restore. The Worker reads `hydrated` from `GET /sandboxes/{id}` after the start and writes a marker file in the sandbox. A small helper in the image starts or restarts each program that the admin wraps with it, in the live folder, when the marker appears. It covers only wrapped programs, and it adds a protocol rule. Effort: Medium.
- **Left out:**
  - A restart of the terminal after the restore. It stops the shell and its running commands, which the "Terminal" section of `docs/protocol/workspaces-and-sandboxes.md` rejects. For an idle shell, B is better on every point.
  - A `cd` typed into the shell from outside, such as with `tmux send-keys`. It can type into a running program, such as an editor. B is better on every point.
  - A Terminal tab that connects only after a click. It only makes an early shell rarer. B is better on every point.
  - A notice that names the programs in the old view. The programs keep the old view, so it fails the goal.
  - A move of a running program's folder from outside, such as with a debugger. Open files and watches stay in the old view, so it fails the goal. It can also crash the program.
  - A second run of the startup script after the restore. The first copies of its programs still run in the old view and can hold their ports, so it fails the goal.
  - A first run of the startup script after the workspace is ready. The 20-minute limit of a start covers the startup script, and the agent could start before the script prepares the sandbox.
- **Wider fix:** D. It removes the cause for every program that the app starts.
- **Previous examples:** None found.
- **Related:** The user chose the tmux fix on 8 November 2026, before an options check recommended adding B to it. The answer on B is open. When the user adds B, option E of this item is only its check.
- **Recommendation:** E. B fixes the shell whatever the check shows, so only the startup programs and the agents need the check. D best protects the workspace if the check shows real harm. The first recommendation was A.
- **Action:** ask the user, because no option is clearly best for the other programs until the check shows how the old view behaves.

The check needs a running workspace sandbox of the deployed app. Run it in
the Terminal tab, after the restore has ended. Replace `<name>` with the
folder name of the repository.

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
- When the first `cd` says "No such file or directory", the old view is
  gone at that time. When it says "Permission denied", run the check with
  `sudo`. In both cases, you can also open the Terminal tab as soon as a
  resumed workspace is ready. After the restore ends, `pwd -P` in that
  shell gives the path of the old view. Run the check from that path.

The extra probes of option E:

- Change a file at the live path, then read it through the old view.
- Watch a file in the old view, for example with `inotifywait`, while the
  file changes at the live path.
- Run `pwd -P` in an agent command during a turn that continues past the
  end of the restore.
- Record how long the restore takes, from `hydratedAt` of
  `GET /sandboxes/{id}`.
