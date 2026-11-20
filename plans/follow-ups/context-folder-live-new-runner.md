# Check the context folder with a new runner

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge follow-up of the plan `plans/repository-context-folder.md`, branch `calummoore/repo-context-attachments`. Updated on 2026-11-18 by branch `calummoore/follow-up-context-folder-with-a-new-59z4`, which records the live checks of that day and moves the steps to the current rules.
- **Location:** the section Attachments of `docs/protocol/message-attachments.md`, the sections The transfer and What the agent gets of `docs/protocol/attachment-transfers.md`, the section The context folder of `docs/protocol/repository-folders.md`, the section What the instructions hold of `docs/protocol/agent-instructions.md`, `src/shared/attachment-paths.ts`, `worker/chat/attachment-download-command.ts`, `crates/cnd-runner/src/repository/setup.rs`, `runner/sdk-helper/src/providers/attachment-description.ts`, `runner/sdk-helper/src/providers/codex.ts`, the deployed app, and a cloud computer with a new runner.
- **Reason:** the remaining checks need a signed-in member who attaches files and opens Changes and All files, which no agent tool can do.

- **Terms:**
  - **Context folder:** the folder `.context` at the top of the workspace's repository folder. Git ignores it. Attached files go to its folder `attachments`.
  - **Runner:** the agent runner, the program of the app in each cloud computer. It runs the agents and reports the files of the workspace.
  - **Release:** one version of the cloud computer software, with the runner, named `0.0.<N>`. The `Deploy` workflow sets N to the count of the deployed commit of `main`, from `git rev-list --count`.
  - **Local exclude file:** the ignore file of one Git repository, `info/exclude` in its Git folder. Git does not track it.
  - **Read line:** the line that the runner adds after the words of the member in each message with files.
- **Background:**
  - On 10 November 2026, the user chose the context folder, the copy of attached files into it, and the read line (decisions 242, 243, and 244). Later changes kept these choices and changed some details, as the facts below say.
  - [Message attachments](../../docs/protocol/message-attachments.md#attachments), [Attachment transfers](../../docs/protocol/attachment-transfers.md#the-transfer), and [The context folder](../../docs/protocol/repository-folders.md#the-context-folder) state the rules in force.
  - Each attached file goes to `<repository folder>/.context/attachments/<digest>/<safe name>` (decision 242). The digest has 32 lowercase hexadecimal characters. `src/shared/attachment-paths.ts` makes the path.
  - Since 11 November 2026, the digest comes from the file ID only (decision 262 D). So each upload gets its own digest, and a file keeps one path for its life.
  - The safe name keeps ASCII letters, digits, dots, underscores, and hyphens. One hyphen replaces each run of other characters. The extension is in lowercase, and the name has at most 100 characters. So `Context Check.TXT` becomes `Context-Check.txt`, and `Screen Shot.PNG` becomes `Screen-Shot.png`.
  - At Send, the words of the message hold `@` and the copy path of each file at the place of its chip, such as `@.context/attachments/<digest>/Context-Check.txt`.
  - Since 16 November 2026, the cloud computer downloads each file from the Worker when the turn of its message starts. The Worker starts the command of `worker/chat/attachment-download-command.ts` through the command route of the sandbox provider. The runner takes no part.
  - That command makes the digest folder with `mkdir -p`. It writes `.context/attachments/.gitignore` with the one character `*` and no newline. Then `curl` downloads the file to a temporary name, the command checks the byte count, and `mv` puts the file at its path.
  - The command sets `umask 077`. So each folder and file that it makes is open only to its owner. The provider runs the command as its default user, and no rule and no field of the request names that user.
  - The test of that command runs its real shell text with a fake `curl` in a temporary folder. The other Worker tests use fake provider servers. So no test shows a real transfer into the folders of the runner, the user of the command, or the real modes.
  - At each start, before its first file report, a new runner adds the line `/.context/` once to the local exclude file (decision 243). Then it makes `.context/` and `.context/attachments/`. `crates/cnd-runner/src/repository/setup.rs` holds this step.
  - The runner runs as the user `user`, as `image/release/conductive-runner.service` says. So that user owns both folders.
  - The runner tests use a temporary repository, not a real cloud computer.
  - Git gives a rule of a `.gitignore` file a higher priority than a rule of the local exclude file. Since 5 November 2026, line 2 of the `.gitignore` of this repository holds `.context/`. In such a repository, `git check-ignore -v` names the `.gitignore` rule. Git status and Changes then stay clean also without the rule of the runner.
  - The agent instructions of a new session give the absolute path of the context folder. They say that Git ignores it, and that attached files arrive in its attachments folder. They tell agents to keep notes, screenshots, and files for other sessions there.
  - On 18 November 2026, the instructions held the line `Context folder: "<repository folder>/.context"`. A blank line and this text followed: "Git ignores the context folder. Keep notes, screenshots, and files for other sessions of this workspace there. Attached files arrive in its attachments folder."
  - A session keeps the instructions that it started with. So only a new session shows this text.
  - After the words of the member, each message with files gets one read line, then one line for each file (decision 244). Since 16 November 2026, the read line is "The sender attached these files. Read each file, or the parts of a large file that you need, before you answer."
  - Each file line is `Attached file: ` and a JSON object with `name`, `mediaType`, `path`, and `sizeBytes`, in that order. The `name` is the original name, and the `path` is absolute.
  - `runner/sdk-helper/src/providers/attachment-description.ts` writes these lines. `runner/sdk-helper/src/providers/instructions.test.ts` holds the exact text that each agent gets.
  - Codex also gets each image of at most 25,000,000 bytes as image input, right after its file line. A file whose media type starts with `image/` is an image. For such an image, the read line of Codex adds "Only an image that comes right after its file line is also in this message." `runner/sdk-helper/src/providers/codex.ts` holds this rule.
  - Claude gets no image input, and its read line never has this sentence.
  - Changes leaves out each file that Git ignores. All files still lists each file of the context folder, also the ignored ones, with no change mark.
- **Status on 18 November 2026:** Agents ran the checks that need no attached file and no view of the app. They used two new production workspaces of the repository `Firna-AI/conductive`. The checks used no browser sign-in, no secret, no D1 read, no Worker log, no image build, and no change of an org setting. Times are in UTC.
  - W-364 had release `0.0.1179`. Commit `f851106849e5ee1693b3d47f6793bc73cb9228d9` has the count 1179, and its `Deploy` run 44321797542 succeeded.
  - W-367 was a sub-workspace of W-364, created at 14:35:03, with release `0.0.1183`. Commit `035a05cd93887bab69a09142258f24afd943aad6` has the count 1183. The first message of W-367 went to a Claude model with no file. W-367 was archived after its checks.
  - These source commits are inferred from the commit count of `main`, because `/opt/conductive/current/parts.json` has no commit field.
  - Both releases hold each change that the background names. Their `sdk-helper` parts, which write the read line, have the same SHA-256.
  - **Passed:** steps 1, 3, 4, 8, and 13.
    - Step 1: `Deploy` run 42856823275 of the merge commit `6fd184c53e77dee208687512244ebcaf5fa120e9` succeeded.
    - Steps 3 and 4 passed in W-367, and step 4 also passed in W-364. In both, the repository folder was `/home/user/code/conductive`, and the exclude file held `/.context/` once.
    - Step 8: the first Claude session of W-367 quoted the lines of the background word for word. A new Codex session there quoted the same lines.
    - Step 13: that Codex session read the note of step 12 from disk and quoted it exactly. Its message did not hold the note. The Claude and Codex quotes are identical. The note file has the SHA-256 `5220e6d227089dd3cc347389daaa2184abd5d9e1d1ea506ecf0d9867484d3060`.
  - **Partial:** steps 2 and 12.
    - Step 2: no image build ran, and none was authorized. `Deploy` run 44324491251 of the commit of `0.0.1183` made its Worker live. But its job "Check the software image result" failed with this text: "The software image step ended with timeout. A ready software image is required. The Worker is already live. Re-run all jobs to retry." So no record shows a ready software image of `0.0.1183`. This is a limit of the evidence only.
    - No check showed which Worker served the app. A request to `https://app.conductive.build` without sign-in got `HTTP Error 403: Forbidden`.
    - Step 12: in W-367, Claude saved `.context/context-folder-smoke/shared-note.txt`, 249 bytes, at the path that the message gave. Its owner was `user`, and the Git status of `.context` printed nothing. The check with an empty work tree printed `/home/user/code/conductive/.git/info/exclude:1:/.context/` for `.context/probe.txt`. Nobody checked Changes and All files.
    - The old step 12 wanted `git check-ignore -v` to name `/.context/` in `.git/info/exclude`. It printed `.gitignore:2:.context/`, a tab, and `.context/context-folder-smoke/shared-note.txt`. W-364 gave the same rule for another file of the folder. The exclude file still held its rule, and the `.gitignore` rule won, as the background says. So the check was wrong, not the product. Step 12 now accepts the winning rule and checks the rule of the runner alone.
  - **Not run:** steps 5 to 7 on a device, and steps 9 to 11, 14, and 15. So no file went through the real download command. No check covered the file lines, the copies with their hashes, owners, and modes, or the `.gitignore` of the download. No check covered Changes, All files, the image input, or a Codex message with only a text file.
    - Reference copies exist only in the context folder of W-364. `Context Check.TXT` has 43 bytes and the SHA-256 `63f70107001dedf4bc6ef1afef14713e9481536592c5cce54646f3d406620abc`. `Screen Shot.PNG` has 137 bytes and the SHA-256 `48800118460aab252e972e95577b3627c13537c4f198dfeb38192d397dad3b46`. It is 64 by 64 pixels, red on the left half and blue on the right half. No device made them, and the app uploaded neither.
- **Task:** Step 1 needs no rerun. Run steps 2 to 16 in order, in one new workspace. The earlier steps make the session, the folder state, and the note that the later steps use.
  1. Check that the `Deploy` run of the merge commit `6fd184c53e77dee208687512244ebcaf5fa120e9` passed.
  2. This check needs no new image build. A new workspace starts from the org image, the prepared cloud computer image of its org. An automatic update can then give it a newer release at its start, and step 4 checks the release. Before step 3, record the latest `Deploy` run of `main`, its commit, and the result of each of its jobs. A member with access to the Cloudflare dashboard can also record the live Worker version. Each deploy tags that version with its short commit hash.
  3. Create a new workspace with one repository that has the GitHub App. Send its first message to a Claude model, with no file. Wait until the workspace is ready. Attach no file before step 9.
  4. Open the Terminal tab. Run these commands, and check each result:
     - `pwd` and `git rev-parse --show-toplevel` print the same repository folder, such as `/home/user/code/<name>`. This item calls it `<repository folder>`.
     - `readlink -f /opt/conductive/current` prints `/opt/conductive/versions/0.0.<N>`, with N of 1104 or more. Commit `4dde5db604cb6a4f0627ea5688a4fbecf7f07261` of 16 November 2026 has the count 1104, so such a release has the current read line.
     - `grep -c -x -F '/.context/' "$(git rev-parse --git-path info/exclude)"` prints `1`.
     - `stat -c '%U %n' .context .context/attachments` prints `user` for both folders.
     - `ls -A .context/attachments` prints nothing. No copy ran yet, so the runner made both folders.
     - `git status --porcelain --untracked-files=all -- .context` prints nothing.
  5. On the device that uploads the files, make the file `Context Check.TXT` with one line: `The code word is <word>.` Choose a new random `<word>`, such as `marigold-47`. Only the upload may bring the word into the cloud computer.
  6. Record the SHA-256 and the size in bytes of that file. On a Mac, use `shasum -a 256` and `stat -f %z`. On Linux, use `sha256sum` and `stat -c %s`.
  7. Also make a small PNG picture that is easy to describe. An example is 64 by 64 pixels, red on the left half and blue on the right half. Name it `Screen Shot.PNG`. Its size must be 25,000,000 bytes or less, so that Codex gets it as image input. Record its SHA-256 and its size.
  8. In the Claude session of step 3, send: "Quote, word for word, the lines of your instructions that name the context folder." Check that the quote gives the lines of the background, with `<repository folder>/.context`.
  9. In the same session, type: "What is the code word? Then quote, word for word, the path that my words name, and each line of this message after my words." Attach `Context Check.TXT` with **Attach files**. Wait until its chip shows the size of the file. Then send. Check these results:
     - The answer gives the code word. Only the file holds it, so the agent read the file.
     - The path in the words is `@.context/attachments/<digest>/Context-Check.txt`. The digest has 32 lowercase hexadecimal characters.
     - The quote gives the read line of the background, with no sentence about images. One file line follows it.
     - The file line is `Attached file: {"name":"Context Check.TXT","mediaType":"<media type>","path":"<repository folder>/.context/attachments/<digest>/Context-Check.txt","sizeBytes":<size>}`. The media type is the one of the upload, such as `text/plain`.
     - The file line has the digest of the path in the words, and its size is the size from step 6.
  10. In the Terminal, check these results:
      - `find .context/attachments -type f` prints `.context/attachments/.gitignore` and the file of step 9. No name holds `.download-`.
      - `cat .context/attachments/.gitignore` prints `*`. `stat -c %s .context/attachments/.gitignore` prints `1`.
      - `sha256sum` and `stat -c %s` of the file give the SHA-256 and the size from step 6.
      - `git status --porcelain --untracked-files=all -- .context` prints nothing.
      - Record the owner and the mode of `.context/attachments/<digest>`, of the file, and of `.context/attachments/.gitignore`, with `stat -c '%U %a %n'`. No rule names them. With `umask 077`, the download command gives a new folder the mode `700` and a new file the mode `600`.
      - The answer of step 9 already shows that `user`, which runs the agents, could read the file.
  11. In the app, open **Changes**. Check that it lists no file of `.context`. Open **All files**. Check that it lists the file of step 9 in `.context/attachments/<digest>/`, with no change mark.
  12. In the Claude session, send: "Save a short note for other sessions of this workspace in the context folder. Tell me its path." In the Terminal, check these results:
      - `stat -c '%U %n' <note path>` prints `user` and a path in `.context/`.
      - `git check-ignore -v <note path>` names a rule that ignores the note. Git names the rule with the highest priority, so a `.gitignore` rule wins over the local exclude file. In this repository, the rule is `.gitignore:2:.context/`. Do not change `.gitignore` for this check.
      - Check the rule of the runner alone, with an empty work tree. Run `empty="$(mktemp -d)"`, then `git --git-dir="$(git rev-parse --absolute-git-dir)" --work-tree="$empty" check-ignore --no-index -v -- <note path>`, then `rmdir "$empty"`. Give the note path from the repository folder, such as `.context/<name>`.
      - That command must name the local exclude file, a line number, and `/.context/`, such as `/home/user/code/conductive/.git/info/exclude:1:/.context/`. The empty work tree has no `.gitignore`, and the command changes no file of the repository.
      - `git status --porcelain --untracked-files=all -- .context` still prints nothing. **Changes** still lists no file of `.context`. **All files** lists the note.
  13. Start a new Codex session in the same workspace. Send: "Quote the note that another session saved in the context folder." Check that the answer quotes the note of step 12 word for word.
  14. In the Codex session, type: "Describe the picture in one sentence. Then quote, word for word, each line of this message after my words." Attach `Screen Shot.PNG` with **Attach files**, and send. Check these results:
      - The description fits the picture.
      - The read line is the read line of the background, with "Only an image that comes right after its file line is also in this message." at its end.
      - Then one file line gives `"name":"Screen Shot.PNG"`, `"mediaType":"image/png"`, the path `<repository folder>/.context/attachments/<digest>/Screen-Shot.png` with a new digest, and the size from step 7.
      - In the Terminal, `sha256sum` and `stat -c %s` of that copy give the SHA-256 and the size from step 7.
  15. In the Codex session, attach `Context Check.TXT` again from the device, and send the message of step 9. Check these results:
      - The answer gives the code word.
      - The read line has no sentence about images.
      - The file line gives a new digest, because a new upload is a new file. In the Terminal, that copy has the SHA-256 from step 6.
  16. After step 15, save the replies, the command output, the release, and the `Deploy` record under `.context/` of the workspace that runs this check. Leave out each credential.
- **Impact if no action:** The tests use fakes, a temporary folder, and a fake `curl`. A fault that only the real provider shows can fail each message with files, or leave a file that the agents cannot read. It can also put attached files and notes in Changes and commits. No recorded check has sent a real file into the folders of the runner.
- **Needs:** The deployed change on `conductive.build`. A member of a test org who signs in to `https://app.conductive.build` with GitHub. The member uses a browser on a device that can make the test files and compute a SHA-256. The org has one repository with the GitHub App, and the member has Claude and Codex logins. The agent tools cannot do the steps with files or views. `create_workspace`, `create_session`, and `send_message` send only text and take no file. No agent of the checks of 18 November 2026 had a signed-in browser of the app. The Terminal and the agents both run as `user`, so the shell of another session gives the same command results. Access to the Cloudflare dashboard is optional, for step 2.
- **Done when:** Steps 5 to 7, 9 to 11, 14, and 15 pass, and the rest of steps 2 and 12 passes. They pass in one workspace whose step 4 passed before its first upload. The other steps passed on 18 November 2026 and need no new pass. The software image result of step 2 is a limit of the evidence only, and its cause is outside this item. A failed check gets its own follow-up item, and this item stays open until a rerun of that check passes. Then delete this item.
- **Related:**
  - `plans/follow-ups/context-attachments-live-older-runner.md` checks attached files with an older runner. It needs a running protocol 2 runner from before context-folder support, with no intervening software activation. Run it before changing that workspace.
  - `plans/follow-ups/agent-instructions-deployed-smoke-test.md` also checks the agent instructions of new sessions on a new org image. One session can run both items, and each keeps its own checks.
  - `plans/follow-ups/runner-archive-from-deploy-check.md` checks that a new image build installs the verified sandbox release of the deploy. This item no longer builds an image, so a failure there does not block this item.
