# Attach files of up to 1 GB

Status: Active. On branch `calummoore/lisbon-ogce`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today each file of a message can hold at most 100 MB, as #323 on `main`
set on 13 November 2026 in place of the 25 MB of decision 132. The
browser sends each file to the Worker in one request (decision 144). The
Worker stores the file in the `CHAT_ATTACHMENTS` R2 bucket. When the turn
of the message starts, the workspace object streams the stored copy into
the cloud computer through a signed upload URL of the provider. The app
keeps the stored copy until it deletes the workspace.

On 12 November 2026, Cal asked: "support larger uploads up to 1GB - we
need to clear up the upload once its on the box". This change raises the
limit of each file to 1 GB, or 1,000,000,000 bytes. The cloud computer
downloads each file from a one-use route of the Worker. The app deletes
its stored copy as soon as the file is in the cloud computer. A later
message with the same file uses the copy that is already there.

Two Cloudflare limits block a simple raise of the limit. The checks of
12 November 2026 against the Cloudflare docs found them:

- The zone is on the Free or Pro plan, so a request body can hold at most
  100 MB. One request cannot carry a 1 GB file.
- A request that a Durable Object sends with `fetch()` can carry at most
  100 MiB, or 104,857,600 bytes. Streaming does not get past this limit.
  The copy runs in the workspace object, so today it fails for each file
  above 100 MiB. The copy request also stops after 65 seconds.

The user approved the implementation of all milestones and TODOs of this
plan on 13 November 2026: "impl all plan milestones and tasks". The
`default orchestrator` session of this workspace runs the milestones one
after the other, because they share the attachment docs and code. The
runner milestone runs beside the backend milestones, because it changes
only the runner package. Codex offers `xhigh` as its highest effort here,
so the Codex actions run at `xhigh`.

This change does not cover a resumable upload after a reload, progress of
the download in the chat, or a paste of a file. The brainstorm notes are in
`.context/large-uploads/`.

Contract owners:

- [Message attachments](../docs/protocol/message-attachments.md).
- [Attachment uploads](../docs/protocol/attachment-uploads.md) and
  [Attachment transfers](../docs/protocol/attachment-transfers.md), which
  Milestone 2 split out of the docs above.
- [Access and security](../docs/protocol/access-and-security.md#attachment-uploads).
- [Chat attachment storage and delivery](../worker/chat/attachments.md).
- The [sandbox README](../worker/sandbox/README.md).
- The [shared contracts README](../src/shared/README.md).
- The [mockups README](../docs/mockups/README.md) and the
  [attachments catalogue](../docs/mockups/catalogue-attachments-and-files.md).
- The Terms page in `src/marketing/terms.ts`, the Privacy page in
  `src/marketing/privacy.ts`, the guide
  [Sessions and chat](../src/marketing/docs/sessions-and-chat.md), and the
  comparison row in `src/marketing/from-conductor/areas/agents-and-chat.ts`.

Replaced ways:

- The streamed write of the Worker into the cloud computer →
  a download by the cloud computer. Consumers:
  `worker/chat/attachment-copy.ts`, its tests and test support,
  `worker/chat/attachments.md`, and the "File writes" section of the
  sandbox README. Moved in Milestone 3. `SandboxProvider.writeFile`,
  `worker/sandbox/file-write.ts`, `worker/sandbox/file-write-body.ts`,
  `BoatTransport.uploadFile`, the `uploadFileUrl` provider route, and their
  tests have no other consumer. Deleted in Milestone 3.
- One raw `POST` for each file → an upload in parts (large-upload
  decision 1 C). Consumers: `worker/http/raw-upload-routes.ts`,
  `worker/chat/attachment-routes.ts`, `src/app/api/xhr-files.ts`,
  `src/app/attachment-upload.ts`, `src/app/dev/attachment-routes.ts`, and
  their tests. The Worker adds the part routes in Milestone 5. The app
  moves to them in Milestone 6. Milestone 7 deletes the raw `POST` routes
  and their 100 MB limit.
  The replaced storage function is `storeAttachment` in
  `worker/chat/attachment-storage.ts`, with `writeAttachmentObject` in
  `worker/chat/attachment-byte-storage.ts`. Its remaining consumers were
  `worker/chat/attachment.test-support.ts`, `attachment-storage.test.ts`,
  `attachment-copy-paths.test.ts`, `attachment-missing.test.ts`,
  `worker/members/attachment-purge.test.ts`, and the native attachment
  controls in `worker/test-support/`. Review fix 102 moves their live
  assertions to the production multipart operations. It deletes both old
  storage functions, the old byte-storage file, and the unused native
  controls with their interface and entry registration.

## Decisions

The decisions of this change carry the short name "large-upload". So
"large-upload decision 2" names decision 2 below.

### 1. How the browser uploads a 1 GB file

Chosen on 12 November 2026: C. Cal's answer: "1 = C".

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Architecture.
- **Location:** `worker/http/raw-upload-routes.ts`,
  `worker/chat/attachment-byte-storage.ts`, `src/app/api/xhr-files.ts`.
- **Background:** The two upload routes take one file in one request. The
  Worker can already write an R2 multipart upload for internal callers,
  and `chat_attachments.multipart_id` already stores its ID.
- **Problem:** One request cannot carry more than 100 MB on the plan of
  the zone.
- **Impact if no action:** Files stay limited to about 100 MB.
- **Root question:** How does a file of up to 1 GB get from the browser
  into the app's storage?
- **Options:**
  - **A.** Upload in parts through the Worker. The browser starts an
    upload, sends raw parts of about 64 MiB each, and then completes the
    upload. The Worker streams each part into an R2 multipart upload and
    checks the total size at the end. The chip adds the progress of all
    parts. This changes decision 144, which rejected parts because they
    need stored part state. Effort: Medium.
  - **B.** Upload straight to R2 with a presigned URL, then call the
    Worker, which checks the size. It needs a new R2 access key as a
    secret, CORS rules on the bucket for the web and Mac origins, and a new
    host in the content security policy. A presigned URL cannot cap the
    size, so the Worker deletes a file that is too large after the upload.
    This changes decision 144. Effort: Medium.
  - **C.** Option A, with two additions. The start call declares the size
    of the file, and each part route refuses a part number or a byte count
    beyond that size. A failed part retries alone, and Try again sends only
    the parts that the Worker did not confirm, while the tab keeps the
    file. The browser keeps the list of confirmed parts. This changes
    decision 144. Effort: Medium.
  - **D.** Move the zone to the Enterprise plan, which accepts up to 5 GB
    in one request. Each file keeps one raw request. It needs an Enterprise
    contract, and one dropped connection restarts the whole file.
    Effort: Large.
- **Left out:**
  - Change nothing: it fails the goal.
  - The Business plan: it accepts at most 200 MB, so it fails the goal.
  - Upload into the cloud computer: a message to a new or stopped
    workspace cannot then carry files, which breaks decision 132.
  - A resumable upload after a reload: a draft lives only in the memory of
    its tab, so a reload leaves nothing to resume. A resume in the same
    tab is part of option C.
  - Chunks in Durable Object storage: option A is better on every point.
  - One WebSocket that streams the file: option A is better on every
    point, because it can retry one part and keeps the HTTP gate.
- **Wider fix:** None, because this is a new transport.
- **Previous examples:** Decision 144 in
  `plans/boat-native-remote-workspaces.md`.
- **Recommendation:** C. The first recommendation was A. The options check
  of 12 November 2026 showed that A lets one member store about 670 GB of
  parts until R2 aborts the upload, and that one dropped part restarts a
  1 GB upload. C closes both gaps with the same routes.
- **Action:** Ask the user, because both options change decision 144.

### 2. How a 1 GB file reaches the cloud computer

Chosen on 12 November 2026: C. Cal's answer: "2 = C".

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Architecture.
- **Location:** `worker/chat/attachment-copy.ts`,
  `worker/sandbox/transport.ts:39`.
- **Background:** The workspace object runs the copy, because it decides
  when the agent gets each message. The provider gives a signed upload URL
  for one path, with no size limit, for at most 1 hour.
- **Problem:** A request from a Durable Object can carry at most 100 MiB,
  and the copy request stops after 65 seconds.
- **Root question:** How does a stored file of up to 1 GB get into the
  cloud computer?
- **Options:**
  - **A.** Ask Cloudflare for a higher limit, and raise the timeout.
    Effort: Small.
  - **B.** Copy in pieces of about 64 MiB from the object, then join them
    with one command. Effort: Medium.
  - **C.** The cloud computer downloads the file from a short-lived URL.
    It changes the rule that only the Worker reads the bucket.
    Effort: Medium.
  - **D.** The object asks plain Worker code to do the copy in one piece.
    The Cloudflare docs name the 100 MiB limit only for Durable Objects and
    containers, but no test on Cloudflare confirmed it. Effort: Medium.
- **Left out:** Change nothing: it fails for files above 100 MiB.
- **Recommendation:** B was recommended. The user chose C.

### 3. When the app deletes its stored copy

Chosen on 12 November 2026: A. Cal's answer: "also once the file has been
transferred, it should be deleted". This plan reads that answer as option
A, for every file.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Product.
- **Background:** Today each message that uses a file copies it again, and
  Try again copies again, so the agent always reads the original bytes.
  The disk and the ID of a cloud computer survive a stop.
- **Root question:** How does the app stop storing a file once the cloud
  computer holds it, while each later message and Try again still gets
  that file? The options check of 12 November 2026 gave this better
  question.
- **Options:**
  - **A.** Delete it after the first successful transfer, for every file.
    A later message or a Try again checks that the file is still in the
    cloud computer with its size, and sends without a new transfer. When
    the file is gone or its size changed, the turn fails and asks the
    member to attach the file again. Effort: Medium.
  - **B.** Option A, but keep the stored copy for 24 hours after the last
    transfer. Effort: Medium.
  - **C.** Option A only for files above 25 MB. Effort: Medium.
  - **D.** Option A, but delete the stored copy only after the first start
    of that cloud computer ends well. Effort: Medium.
  - **E.** Option A, but the download records a SHA-256 digest of the
    file, and a later message compares a new digest with it. Each later
    message then reads up to 1 GB once more. Effort: Medium.
  - **F.** Option A, and the download also keeps a read-only second copy
    outside the repository folder. A later message copies it back first.
    It doubles the disk use, and an agent can still delete the second
    copy. Effort: Medium.
  - **G.** Option A, and the download makes the copy read-only. A member
    or an agent who edits the file in place then gets an error.
    Effort: Small.
- **Left out:** Change nothing: it fails the goal of the task message.
- **Recommendation:** A was recommended and chosen. The options check
  added D to G after the choice. This plan applies the timing of D inside
  A as a design call of 12 November 2026, because the rule "No failure
  loses an accepted message or its attachments" of
  [A failed first start](../docs/protocol/create-a-workspace.md#a-failed-first-start)
  stays. On 12 November 2026, Cal chose none of E, F, and G: "I agree,
  none". Reason: the edge case of an agent edit is rare, and A ends it
  with a clear message.

### 4. The read line for a very large file

Chosen on 12 November 2026: D. Cal's answer: "4 = D".

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Product.
- **Location:** `runner/src/providers/attachment-description.ts`.
- **Background:** Decision 244 adds one line after the text of a message:
  "The sender attached these files. Read each file before you answer."
  One line for each file then gives its path, name, media type, and size.
- **Problem:** An agent that reads a 1 GB log fills its context and wastes
  time.
- **Impact if no action:** A turn with a large file is slow or fails.
- **Root question:** How does the agent learn of each attached file
  without loading more of it than its task needs? The options check of
  12 November 2026 gave this better question, because Codex also gets
  each image whole as image input.
- **Options:**
  - **A.** Keep the line. Effort: Small.
  - **B.** For a file above 25 MB, the line says that the file is large,
    and tells the agent to read only the parts that it needs.
    Effort: Small.
  - **C.** One read line for every file, with no size rule: "The sender
    attached these files. Read each file, or the parts of a large file
    that you need, before you answer." Effort: Small.
  - **D.** Option C, and Codex gets an image as image input only when it
    is 25 MB or less. A larger image gets only its file line. Reason: the
    model gateway refuses a request body above 100,000,000 bytes.
    Effort: Small.
  - **E.** Option C, and the runner adds the first 2 KB of a large text
    file after its file line. It reads each such file and adds tokens to
    the message. Effort: Medium.
- **Left out:**
  - No read line for a large file: the agent can then miss the file, and
    option B is better on every point.
  - A rule in the agent instructions: decision 244 rejected it, because it
    stands far from the files, and that reason holds.
- **Wider fix:** D, with its size rule in the shared helper
  `attachment-description.ts` that both adapters call.
- **Previous examples:** Decision 244.
- **Recommendation:** D. The first recommendation was B. D needs no size
  rule for the read line, and its image limit keeps a large image from
  failing a Codex turn.
- **Action:** Ask the user, because it changes decision 244.

### 5. Where the cloud computer downloads the file from

Chosen on 12 November 2026: A. Cal's answer: "5 = A".

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Architecture.
- **Background:** Code in the cloud computer can see the URL of the
  download command.
- **Root question:** Which URL gives the cloud computer the bytes of one
  stored file?
- **Options:**
  - **A.** A route of the Worker with a one-use token for one file and one
    workspace, valid for about 10 minutes. The Worker keeps only the digest
    of the token, and streams the file from R2. It reuses the pattern of
    the build grant of decision 90. Effort: Medium.
  - **B.** A presigned R2 URL. It needs a new R2 access key, and anyone who
    sees the URL can read the file until it expires. Effort: Medium.
  - **C.** A signed token with no stored record. The Worker signs the
    file, the workspace, the sandbox, and an expiry. The token works again
    until it expires. The options check of 12 November 2026 added it.
    Effort: Medium.
- **Left out:** A download by the runner with its workspace token: an older
  runner fails, and the token reaches every file of the workspace.
- **Recommendation:** A was recommended and chosen. A one-use claim makes
  a token in the command history useless after the download starts, and
  B and C cannot do that.

## Design

### The download

- One transfer owner exists for each file and cloud computer. Its key is a
  SHA-256 digest of the file ID and the sandbox ID. Each message that
  needs the file waits for that owner. Reason: with large-upload decision
  3, only the first transfer reads the bucket, so two messages must not
  start two transfers of one file. Design call of 12 November 2026.
- The owner makes a random token, stores its SHA-256 digest in a new D1
  table with the file ID, the workspace ID, the sandbox ID, and an expiry
  10 minutes later. Then it starts a background command in the cloud
  computer with `SandboxProvider.startCommand`.
- The command follows the rules of the build fetch command in
  [repository-layout.md](../worker/lifecycle/repository-layout.md): an
  empty environment, absolute paths, no `.curlrc`, HTTPS only, no
  redirect, and time limits. Its `curl` uses a low-speed limit and a
  total limit of 1 hour, not the 30 seconds of the build fetch. It writes
  `.context/attachments/.gitignore`,
  downloads into a temporary file beside the target, checks the byte
  count, and moves the file into place. Reason: a failed download then
  never leaves a part file at the path that the agent reads. Design call
  of 12 November 2026.
- The route is `POST /v1/internal/attachments/download` on
  `api.conductive.build`. It takes the token as a bearer token. It refuses
  a request with a cookie or an `Origin` header, as the build route does.
  It claims the token once. Then it makes every check of today's copy in
  `worker/chat/attachment-copy.ts`: the workspace still names that
  sandbox, the workspace is not archived, the org is not deleted, the
  owner is not suspended, the uploader is still a member, and the file is
  still claimed by that workspace. Then it streams the R2 object. Each
  attempt needs a new token. The scheduled cleanup deletes expired tokens.
- The owner reads the state of the command with
  `SandboxProvider.getCommandStatus` until the command ends. Reason: a 1 GB
  download can take longer than the 600 seconds of a waiting command.
  Design call of 12 November 2026.
- After a restart of the workspace object, the owner is gone. The check
  then starts a new owner, which downloads again into a new temporary
  file. The command first removes the older temporary files of the same
  file. The move into place is atomic, so two downloads cannot mix bytes.
  Design call of 12 November 2026: a second download after a restart is
  rare, so the owner keeps no process ID in storage.
- The agent gets the message only after the transfer succeeds, as today.
  The chat shows no progress for the transfer in this change.

### The deletion of the stored copy

- After the download succeeds, the Worker writes the sandbox ID into a
  new `transferred_sandbox_id` column of the D1 record. Then it saves the
  transfer proof in the chat queue. The `state` column keeps `claimed`.
  Reason: claims and admission accept only `ready` and `claimed`, and
  `deleteAttachment` removes the whole record, which a later message
  needs. Design call of 12 November 2026.
- The Worker deletes only the R2 object, and then sets a new
  `bytes_deleted_at` column. The record keeps the name, the media type,
  the size, and the path, so each sent message still shows its chips.
- It deletes the R2 object only after the first start of that cloud
  computer ended well. Until then, a failed first start can still replace
  the cloud computer, and its Try again then transfers the file again from
  R2. This keeps the rule that no failure loses an accepted attachment
  (large-upload decision 3, timing of option D).
- The scheduled cleanup also deletes the R2 object of each transferred
  record whose bytes are still there, for example after a restart between
  the proof and the deletion.
- A later message, or a Try again, with a transferred file reads the file
  info of its path with the provider's `fileInfo` route. When the size
  matches, the message goes out with no transfer. Otherwise the turn fails
  with a new error code, `attachment_missing`, that names the file and
  asks the member to attach it again.
- While the R2 object still exists, a message for another sandbox
  transfers the file again. When the R2 object is gone and the workspace
  names another sandbox, the turn fails with `attachment_missing`.
- The failed turn says: "<name> is no longer in the cloud computer. Attach
  it again in a new message." Try again stays, as for each failed turn, but
  it fails again until the file is back at its path. Design call of
  12 November 2026.
- When two or more files of the message are gone, the failed turn names
  each of them in the order of the message: "<name> and <name> are no
  longer in the cloud computer. Attach them again in a new message." So
  the check reads every transferred file of the message before it fails
  the turn. Reason: one new message then carries every missing file, and
  no later try fails for a file that the first failure did not name.
  Design call of 13 November 2026, from the mockups.
- The 7-day expiry of an unsent file, and the deletion of the files of a
  deleted workspace or org, stay as they are.

### The upload in parts

- The start call is a JSON `POST` with the default body limit. It names
  the target, the file name, the media type, and the size in bytes. It
  refuses a size above 1,000,000,000 bytes with HTTP 413 and
  `attachment_too_large`. It creates the record and the R2 multipart
  upload, and it returns the upload ID, the part size, and the part count.
- The part size is 64 MiB, or 67,108,864 bytes, for each part but the
  last. Reason: R2 needs equal parts but the last, and a part stays under
  the 100 MB request limit of the zone. A file of 1 GB has 15 parts.
  Design call of 12 November 2026.
- Each part is a raw `PUT` with `application/octet-stream` and a
  `Content-Length`. The gate keeps the rules of
  [Attachment uploads](../docs/protocol/access-and-security.md#attachment-uploads).
  The route refuses a part number above the part count, and a byte count
  other than the expected length of that part. It streams the part into
  R2 and returns its receipt.
- The complete call is a JSON `POST` with the receipts. The Worker
  completes the R2 upload, checks that the object size equals the declared
  size, and publishes the file. It returns the same reply as today's
  upload, with `path`.
- The browser keeps the receipts in the memory of the tab. A failed part
  retries alone, up to three times. Try again of a failed chip sends only
  the parts with no receipt, while the tab keeps the upload. The progress
  of a chip counts the bytes of all parts. Design call of 12 November
  2026.
- Each file uses the parts, also a small file with one part. Reason: one
  way to upload is simpler to test and to keep. Design call of 12 November
  2026.
- The scheduled cleanup aborts an unfinished multipart upload when its
  draft expires, as it does today.

### The read line

- One read line for every file: "The sender attached these files. Read
  each file, or the parts of a large file that you need, before you
  answer." (large-upload decision 4 D).
- Codex gets an image as image input only when the image has at most
  25,000,000 bytes. A larger image gets only its file line.

### Risks

- An agent edit that keeps the size of a file goes unnoticed. The next
  message then reads the edited file.
- A 1 GB upload over a 20 Mbit/s link takes about 7 minutes. A reload
  of the page loses it.
- Each cloud computer keeps its files for the life of the workspace, on a
  disk of about 51 GB.
- The token is visible to code in the cloud computer for up to 10 minutes.
  It gives only one file that is on its way to that same computer.

### Found by the mockups

- Main raised the limit of the raw `POST` routes from 25 MB to 100 MB, or
  100,000,000 bytes, on 13 November 2026, in pull request #323. This
  branch has that change since its merge of `origin/main`. The
  orchestrator changed the raw route limit in the summary and in
  Milestones 5 to 7 to 100 MB on 13 November 2026. The image limit of
  25,000,000 bytes of large-upload decision 4 D is another limit, and it
  stays.
- The app imports the words of the notice for a file over the limit from
  `docs/mockups/src/components/chat/attachmentCopy.ts`. So the 1 GB words
  of Milestone 1 also show in the app, which still refuses each file over
  100 MB until Milestone 6. The two expected notices in
  `src/chat/components/AttachmentChips.test.tsx` now expect the 1 GB
  words. The app notice says 1 GB before Milestone 6 only on this branch,
  because the plan merges as one pull request.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The notice for a file that is too large names the new limit. A new state
shows a turn that failed because a file is no longer in the cloud
computer.

- [x] Change the limit in `docs/mockups/src/components/chat/attachmentCopy.ts`
      and in the descriptions of `app/attachments/too-large` to 1 GB. Keep
      the reason why the notice gives no file size.
- [x] Add `app/attachments/missing`: a failed turn whose message names a
      file that is no longer in the cloud computer. Its text asks the member
      to attach the file again in a new message.
- [x] Update the mockups README and the attachments catalogue.
- [x] Update the rationale of `app/attachments`, which named the upload in
      one request of decision 144.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update `docs/protocol/message-attachments.md`: the 1 GB limit, the
      download by the cloud computer, the deletion after the transfer, the
      check of a later message and of Try again, and the new error.
      Remove the rejection of a download by the cloud computer.
- [x] Update `docs/protocol/access-and-security.md` with the download
      route and its token, and with the part routes in place of the one
      raw `POST` of decision 144.
- [x] Update the read line and the image input of decision 244 in
      `docs/protocol/message-attachments.md`.
- [x] Update `docs/protocol/isolation.md`, which says that the Worker sends
      each attachment to the provider's upload address.
- [x] Update `docs/protocol/create-a-workspace.md` only if its words about
      attachments of a failed first start change.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence about kept files, such as `src/marketing/terms.ts:206` and
      `src/marketing/privacy.ts:97`.
- [x] Update the Privacy paragraph in `src/marketing/privacy-uses.ts`,
      which the Privacy page imports.
- [x] Read each public guide in full. Update
      `src/marketing/docs/sessions-and-chat.md:62` and each other sentence
      that states the limit or the kept files.
- [x] Update the comparison row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts:30`.
- [x] Update `README.md:47`.

### Design calls of Milestone 2

These are the calls of the agents and the orchestrator, of 13 November
2026.

- The transfer rules moved to a new page,
  [Attachment transfers](../docs/protocol/attachment-transfers.md), and
  the upload rules to
  [Attachment uploads](../docs/protocol/attachment-uploads.md). Reason:
  the two docs passed the length target. Each old anchor still works.
- The read line says that an image is in the message only for an image
  that Codex gets as image input. Reason: for an image above
  25,000,000 bytes, that sentence would be false.
- Only the member who started an upload can send its parts and complete
  it. Reason: each file belongs to its uploader, as the isolation rules
  say.
- The URL of each part carries the upload ID and the part number.
  Reason: the preflight then allows no new request header.
- A part that passes its body limit gets HTTP 413 with
  `attachment_too_large`, as the raw routes do today.
- The Terms acceptance version in `src/shared/terms.ts` stays. Reason: the
  change only shortens how long the app keeps a file, and #325 also
  changed the Terms text without a new version. A new version would ask
  every member to accept the Terms again.

## Milestone 3: The cloud computer downloads each file

Depends on: 2

- [x] Add the D1 migration for the download tokens, and the migrations
      README line.
- [x] Add the download route on the machine host, with its tests. Reuse the
      access checks of today's copy.
- [x] Delete expired download tokens in the scheduled cleanup.
- [x] Replace the streamed write in `worker/chat/attachment-copy.ts` with
      the download command and its status reads. Key the owner by file and
      sandbox.
- [x] Delete `SandboxProvider.writeFile`, its Boat adapter, the
      `uploadFileUrl` route, and their tests.
- [x] Update `worker/chat/attachments.md` and the sandbox README.
- [x] Update `docs/deployment.md`, which says that the provider key needs
      `file.write` to copy each attached file.
- [x] Run `npm run test -- worker/chat worker/sandbox`. On this machine
      the native tests time out under load, also on the committed code, as
      `plans/follow-ups/tests-time-out-under-machine-load.md` says. Each
      attachment test file passed alone from a copy under `/tmp`, except
      `worker/chat/integration/failed-first-start-retry.test.ts`, which
      also times out on the committed code without this change.

Verification evidence is in `.context/large-attachments/reports/m3.md`.

### Design calls of Milestone 3

These are the implementor's calls of 13 November 2026.

- `AttachmentPreparation` owns the active file-transfer map beside its
  message owners. The map hashes the file ID and sandbox ID. Reason: two
  sessions can share a transfer without changing message proofs or dispatch
  order. A settled transfer leaves the map, so later messages still download
  again until Milestone 4.
- Each file gets its own detached command. That command writes `.gitignore`
  before its download. Reason: each shared transfer must work independently
  of the message that first needed it.
- Curl uses a low-speed limit of 1,024 bytes per second for 60 seconds,
  and a total limit of 3,600 seconds. Status reads wait one second between
  unfinished results. Reason: a large file needs a long transfer limit,
  while a stalled transfer and rapid status reads still need bounds.
- A random UUID names each temporary file. An exit trap removes it after
  failure. Reason: a restart can create a second command without mixing
  bytes or leaving a partial file at the final path.
- Token claims use one conditional D1 update with `RETURNING`. Expired
  tokens leave through the existing attachment cleanup. Deleting an
  attachment cascades to its tokens. Reason: one claim must win, and
  deleted files need no surviving grant.
- The download route uses the same real clock as token creation and the
  image-source grant route. Reason: its ten-minute lifetime must use one
  clock, independently of a workspace's scheduling clock.
- `machine-grants.ts` holds the two private grant routes. Reason: the
  application file would exceed 300 lines with both handlers inline.
- The new route refuses access with fixed error text and no ownership
  detail. Reason: a bearer token must reveal no file or workspace data
  when an access check fails.
- The first-start test fixture uses the existing lifecycle command hook.
  Its fake download calls the production machine route. Reason: attachment
  tests must not intercept unrelated provider requests.

## Milestone 4: Delete the stored copy after the transfer

Depends on: 3

- [x] Add the `transferred_sandbox_id` and `bytes_deleted_at` columns to
      `chat_attachments`, with a migration. Keep the `state` values.
- [x] Mark the file before the proof is saved. Delete only its R2 object
      after the first start of that cloud computer ended well.
- [x] Delete the R2 object of each transferred record that still has
      bytes in the scheduled cleanup.
- [x] Add `fileInfo` to `SandboxProvider`, its Boat adapter, and the
      provider contract suite.
- [x] Check a transferred file with `fileInfo` before a later message or a
      Try again. Fail the turn with `attachment_missing` when it is gone.
- [x] Add tests: the deletion, a later message, Try again, a changed size,
      a failed first start before the deletion, and a new sandbox after
      it.
- [x] Update `worker/chat/attachments.md`.
- [x] Update `docs/deployment.md`, which says that the files of sent
      messages stay until the app deletes their workspace.

Verification evidence is in `.context/large-attachments/reports/m4.md`.

### Design calls of Milestone 4

These are the implementor's calls of 13 November 2026.

- Byte deletion requires a succeeded `workspace_creation_attempts` record
  and the current sandbox ID to match the transferred sandbox ID. Reason:
  the lifecycle publishes this record after the native first start succeeds.
  A ready workspace alone cannot prove that publication finished. A pending
  or failed attempt therefore keeps its bytes. Legacy workspaces without an
  attempt use their completed-start state.
- `completeAttachments` runs the immediate byte deletion outside the chat
  queue, after the message proof commits and dispatch resumes. Reason:
  external storage must not hold Stop, runner events, or message admission.
  The scheduled sweep retries deletion from the transferred record when the
  first start succeeds or an earlier cleanup did not finish.
- A later message checks provider metadata whenever the recorded sandbox
  matches, also while R2 bytes remain. Reason: the protocol requires no
  second transfer of a file that the cloud computer already received.
- The transfer marker does not change the admission revision. Reason:
  recording a completed download changes no claim or ownership.
- The message owner collects each missing filename from admitted message
  metadata when its file check gives `attachment_missing`. Reason: the
  callback boundary preserves HTTP error codes but need not preserve an
  error subclass. This also preserves the accepted filename order.
- A directory at the file path counts as missing. Provider 404 means
  missing, while other provider errors give `attachment_copy_failed`.
  Reason: a directory cannot serve as the uploaded file, and an outage
  does not prove that the file is gone.
- A cleanup failure logs the existing retry warning and keeps the deletion
  time empty. Reason: a later sweep can retry without failing a message
  whose file transfer and proof already succeeded.

## Milestone 5: Upload in parts

Depends on: 2

The Worker adds the part routes. The raw `POST` routes stay, with their
100 MB limit, until the app moves.

- [x] Add the start, part, and complete routes for a draft file and for a
      file of a workspace, with the checks of the design.
- [x] Register the part routes with a body limit of one part. Keep the
      raw `POST` routes at 100,000,000 bytes under their own constant.
- [x] Set `ATTACHMENT_MAX_BYTES` to 1,000,000,000 for the part routes,
      and the Worker's notice text to "Each file can be up to 1 GB."
- [x] Add tests: a part beyond the size, a part of the wrong length, a
      retried part, a complete call with a wrong size, and the gate rules.
- [x] Update `worker/chat/attachments.md` and `src/shared/README.md`.

Verification evidence is in `.context/large-attachments/reports/m5.md`.

### Design calls of Milestone 5

These are the implementor's calls of 13 November 2026.

- A zero-byte file uses one empty part. Reason: empty files remain valid,
  and R2 needs at least one part. Its source must end before the R2 call.
- The public upload ID is the attachment record ID. The private R2 upload
  ID stays in `multipart_id`. Reason: each call can check the same owner
  and target without exposing storage keys.
- `attachmentUploadStartPath`, `attachmentUploadPartPath`, and
  `attachmentUploadCompletePath` extend each existing attachment base.
  The start and complete replies use HTTP 201. A part gives its receipt
  directly with HTTP 200. Reason: the shared contract gives both targets
  one request and reply shape.
- A part number outside the upload gives HTTP 400 with
  `attachment_part_invalid`. A wrong declared part length gives HTTP 400
  with `attachment_part_size_mismatch`. Reason: each error describes an
  invalid request within the required part limit.
- A completed object with a wrong size gives HTTP 400 with
  `attachment_size_mismatch`, and cleanup removes the upload. Malformed,
  missing, duplicate, or out-of-range receipts give `invalid_input`
  before completion. Reason: a valid complete call must name every part
  once. The Worker sorts valid receipts before it calls R2.
- Completion conditionally moves revision zero to revision one while the
  state stays `uploading`. Parts and other complete calls require revision
  zero. Reason: one completion owns publication and cleanup. The multipart
  ID remains stored, so expiry can still abort a stopped completion.
- The fixed-length adapter holds one final byte until the counted source
  ends. Reason: native R2 can otherwise finish a part before a late source
  error. The adapter streams all other bytes without collecting a part.
- `ATTACHMENT_RAW_MAX_BYTES` lives in the raw route registry. Reason:
  the temporary raw POST cap stays independent of the 1 GB file limit.

## Milestone 6: The composer uploads in parts

Tags: ui

Depends on: 1, 5

- [x] Move `src/app/api/xhr-files.ts` and `src/app/attachment-upload.ts`
      to the part routes, with one progress value for each file.
- [x] Retry a failed part alone. Try again sends only the parts with no
      receipt.
- [x] Move the dev routes in `src/app/dev/attachment-routes.ts`.
- [x] Update every text in the app and its tests that names 100 MB.

### Design calls of Milestone 6

These are the implementor's calls of 14 November 2026.

- A failed part goes again up to three times, after waits of 1, 2, and 4
  seconds on the timer of its composer: the timers of the chat, or the
  `delay` of the app services. A Remove during a wait stops the upload at
  once. Reason: a short outage, such as a change of network, then passes
  with no action of the member, and the tests run the timers by hand. The
  first version sent the part again at once. The coordinator chose the
  waits on 14 November 2026.
- Only a part with no answer, a server error, or
  `attachment_upload_interrupted` goes again. Another refusal fails the
  file at once. The start call and the complete call do not go again.
  Reason: a refusal comes back the same for the same request.
- Some errors end the upload, so the file keeps no upload and Try again
  starts a new one: `attachment_not_found`, `attachment_part_invalid`, and
  `attachment_part_size_mismatch` of a part, and `attachment_not_found`,
  `attachment_size_mismatch`, `attachment_upload_failed`, and
  `invalid_input` of the complete call. Reason: after each of them, no
  receipts of the tab can complete the upload. The Worker removes the
  upload after each failure of a complete call that began.
- A try that resumes a kept upload and gets one of these errors starts a
  new upload at once, in the same try. Reason: one Try again then recovers
  the file also when the Worker lost the upload, such as after its expiry
  or after a complete call whose reply did not come back.
- The browser cuts the parts with the part size and the part count of the
  start reply. Reason: the Worker owns the part size, so the browser sends
  no part that the Worker refuses. The tests use small parts.
- The progress of a file counts the bytes of the confirmed parts and the
  measured bytes of the part that goes now. A part that goes again counts
  from its start again, so the share can go down. Reason: the chip shows
  the share of the file that the Worker will have.
- `DraftFile.upload` keeps the upload of a file that uploads or failed:
  its ID, the part size, the part count, and the receipts. Undo of a
  stopped upload resumes it too. Reason: the upload then goes with its file
  at a move, a send, and a sign-out, and needs no cleanup of its own.
- `ApiClient.sendFile` became `sendPart`, which sends a `Blob` slice with
  `PUT`. The start and complete calls are JSON writes of `ApiClient.send`,
  so the org watchers see their refusals. A Remove does not abort these
  two calls, and the `live` check of the upload drops their late replies.
- Each part request stops listening to the signal of its upload when it
  ends. Reason: one upload sends up to 15 parts and their retries with one
  signal.
- `attachmentUploadPath` is no longer exported. `attachmentUploadUrl`
  stays for the raw routes of the Worker and their tests until Milestone
  7. Reason: the export check refuses an export that no code uses.
- Both dev fakes share the parts store of `src/app/dev/attachment-parts.ts`,
  with the checks of the Worker. `?upload=fail` fails the first part of
  the page at each of its four sends, so its chip fails and Try again sends
  that part again. Reason: a part that fails once goes again, and the chip
  would never fail. With the waits, the chip fails after about 7 seconds.
- The zip of a dropped folder moves its compressed bytes into a `Blob` each
  time 8 MiB of them wait, and the zip file is made of these blobs. Reason:
  the browser can keep a blob out of the memory of the page, so a zip of up
  to 1 GB never sits there whole, and a zip of 1 GB has only about 125
  blobs. The coordinator chose this fix on 14 November 2026.

## Milestone 7: Delete the raw upload routes

Depends on: 6

- [x] Delete the raw `POST` routes, their constant, and their tests.
- [x] Link `worker/http/README.md` straight to
      [Attachment uploads](../docs/protocol/attachment-uploads.md).
- [x] Update `worker/chat/attachments.md`.

Verification evidence is in `.context/large-attachments/reports/m7.md`.

## Milestone 8: The read line for large files

Depends on: 2

- [x] Change the read line in
      `runner/src/providers/attachment-description.ts` for both adapters.
- [x] Give Codex an image as image input only up to 25,000,000 bytes, in
      `runner/src/providers/codex.ts`.
- [x] Add runner tests for the line and for an image above the limit.
- [x] Update `worker/chat/attachments.md` and the runner README.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Confirm in CI that
      `worker/chat/integration/failed-first-start-retry.test.ts` passes. It
      times out on this machine, also without this change.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, attach a file of about 1 GB, send it, and
      check that the agent gets it, and that the R2 object is gone.
