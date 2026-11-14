# Chat attachment storage and delivery

The Worker stores attachment bytes in the private `CHAT_ATTACHMENTS` R2 bucket.
D1 keeps the owner, target, upload deadline, claim revision, and deletion journal.
The browser can start an upload, send raw parts, and complete it with the confirmed receipts.
The shared path builders select draft or workspace routes.
The route registry gives the entry and gate the same method, matcher, and byte limit.
The storage API also accepts decoded bytes independently of the browser transport.
[Attachments](../../docs/protocol/messages-and-attachments.md#attachments) gives the requirements.

## Storage boundary

`storeAttachment` in [attachment-storage.ts](attachment-storage.ts) takes authenticated metadata and decoded bytes or a stream.
It checks current membership and the named target before it creates a record.
It measures the bytes and refuses a decoded total above `ATTACHMENT_MAX_BYTES`.
The decoded file limit is 1,000,000,000 bytes.
The raw file POST routes keep a separate limit of 100,000,000 bytes.
Raw uploads pass the entry-counted source through native `FixedLengthStream` into R2.
The declared length and stream completion must agree before readiness can publish.
Internal callers without a known length use bounded R2 parts.
Neither transport needs a stored part table.
Readiness publishes only after the object completes and the owner and target still permit the write.
An upload that loses ownership leaves no usable attachment.
Its failed cleanup keeps a deletion record for another attempt.

## Browser uploads in parts

[attachment-multipart-routes.ts](attachment-multipart-routes.ts) handles the JSON start and complete calls.
[attachment-part-route.ts](attachment-part-route.ts) streams each raw PUT into native R2.
Both route sets use the same gate as other app writes.
The start and complete calls keep the default JSON body limit.
The raw route registry gives each part a limit of `ATTACHMENT_PART_BYTES`, 67,108,864 bytes.
A raw file POST keeps `ATTACHMENT_RAW_MAX_BYTES`, 100,000,000 bytes.

[attachment-multipart-storage.ts](attachment-multipart-storage.ts) creates the private multipart upload and saves its ID in `multipart_id`.
The attachment record keeps the declared file size while its state is `uploading`.
The start reply gives `uploadId`, `partSizeBytes`, and `partCount`.
A zero-byte file has one empty part.
The browser keeps each receipt as `partNumber` and `etag`.
A repeated part replaces its earlier bytes.
[attachment-upload-input.ts](attachment-upload-input.ts) checks the uploader, target, expiry, part count, and receipts.

The part stream holds its last byte until the counted source ends.
So R2 cannot finish a nonempty part before a short, long, or interrupted source fails.
An empty part waits for source completion before its R2 call.
The adapter keeps one byte and streams the remaining bytes without collecting a part.

Completion first takes a conditional D1 revision claim.
Other complete calls cannot delete the winning upload after an R2 error.
R2 completes from the receipts, and the Worker checks the resulting object size.
The existing publication query checks membership, suspension, target, and expiry again before it sets `ready`.
A failed completion uses the same deletion journal as the internal storage boundary.
Part failures keep the upload available for another attempt.

| Input | HTTP status | Error code |
| --- | --- | --- |
| Declared file size above the file limit, or part above its body limit | 413 | `attachment_too_large` |
| Part number outside the upload | 400 | `attachment_part_invalid` |
| Declared part length different from its expected length | 400 | `attachment_part_size_mismatch` |
| Received part length different from Content-Length, or interrupted source | 400 | `attachment_upload_interrupted` |
| Completed object size different from the declared size | 400 | `attachment_size_mismatch` |

Each generated object key stays private.
The uploader ID stays as an opaque identity after account deletion.
Its record does not keep the user's account row alive.
The org foreign key prevents final org deletion before external cleanup finishes.

## Message admission

`resolveMessageAttachments` checks the sender, org, immutable target, expiry, and ready state.
A workspace upload can be used by the uploader's messages in that workspace.
A new-workspace upload names its stable first-message ID.
A failed first start after admission keeps its workspace, its claim, and its files.
Its Try again resumes that workspace, so the claim stays.
A create that fails before admission removes its provisional workspace record.
Only such a failed attempt, with no public workspace record, lets a fresh attempt for that same first message move the claim.
The original draft deadline still applies until a surviving workspace accepts it.

A D1 claim alone proves no acceptance.
`ChatRecords.saveMessage` stores the attachment-use marker with the message in the chat transaction.
A repeated accepted message returns before it attempts a new claim.
`attachmentPath` in [attachment-paths.ts](../../src/shared/attachment-paths.ts) builds each path from the file ID and the original name.
Each path is relative to the workspace repository: `.context/attachments/<digest>/<safe name>`.
The digest hashes the file ID alone.
It uses the first 32 lowercase hexadecimal characters of SHA-256 over the UTF-8 bytes of that ID.
The builder takes no message ID, so each message that uses a file gets the same path for it.
The safe name keeps ASCII letters, digits, dots, underscores, and hyphens.
One hyphen replaces each run of other characters.
The name keeps at most 100 characters, with the last extension in lowercase.
An empty stem or a name made only of dots becomes `file`.
`publicAttachment` in [attachment-record.ts](attachment-record.ts) adds that path as `path` to the public metadata.
The upload reply and each admitted message give that metadata.
Admission stores the same path as `StoredAttachment.relativePath` of the command.
The stored `StoredAttachment.relativePath` is separate from the runner's absolute `RunnerAttachment.path`.
Admission needs no repository folder map, so the first message can arrive before that map exists.

## Dispatch

`AttachmentPreparation.check` in [attachment-delivery.ts](attachment-delivery.ts) gives the [ordered dispatch](history.md) a copy result for each `turn` or `message` command: send when its files are ready, or else wait.
An empty attachment list returns send before any storage or provider call.
A command that waits for its copy holds the later `turn` and `message` commands of its turn.
So the agent gets the messages of that turn in accepted order.
Stop and the commands of other turns do not wait.

Each message has one preparation owner on each destination computer.
Each check first reads the current sandbox ID of the workspace with `attachmentSandboxId`.
`attachmentCopyKey` in [attachment-record.ts](attachment-record.ts) hashes the message ID and that sandbox ID for its proof key.
The key holds no command ID or runner connection.
`AttachmentPreparation` also keeps active file transfers in memory.
Their keys hash the file ID and sandbox ID with SHA-256.
Two messages that need the same file on that computer wait for the same active transfer.
The file owner clears after success or failure.
A later message checks the completed file through provider metadata.

The owner gives one file and its sandbox ID to `prepareMessageAttachments` in [attachment-copy.ts](attachment-copy.ts).
That helper checks the current claim, uploader, workspace access, sandbox, provider account, and stored relative path.
`attachmentRepositoryDirectory` in [attachment-paths.ts](attachment-paths.ts) selects the workspace repository from its captured folder map.
For a file that needs a transfer, the helper stores a random download token through [attachment-download-data.ts](attachment-download-data.ts).
D1 keeps only its SHA-256 digest, file ID, workspace, org, sandbox, provider account, expiry, and claim time.
The token expires after ten minutes.

[attachment-download-command.ts](attachment-download-command.ts) builds the detached command.
It starts with an empty environment and uses absolute commands, HTTPS, no curl configuration, and no redirects.
It creates the file's parent folder and writes `*` into `.context/attachments/.gitignore`.
It removes older temporary files of that file and downloads to a new random temporary file beside the destination.
Curl uses a 1 KiB/s low-speed limit for 60 seconds and a one-hour total limit.
The command checks the byte count before an atomic move to the final path.
It removes its temporary file on failure and prints no output.
The token appears only in the Authorization header of the download.
`SandboxProvider.startCommand` starts it, and `getCommandStatus` polls it to completion.
A failed command gives `attachment_copy_failed` through the normal failed-turn path.
The helper checks the sandbox and provider account before and after the transfer.
After a successful download, [attachment-transfer-data.ts](attachment-transfer-data.ts) records `transferred_sandbox_id` before the message proof.
This update keeps the claim revision and the `claimed` state.
The owner runs through `waitUntil` outside the chat queue.
Stop, runner events, and confirmations keep using that queue during a transfer.

[attachment-download.ts](attachment-download.ts) serves `POST /v1/internal/attachments/download` on the machine origin.
It refuses cookies and Origin headers, then claims an unexpired token once.
It checks workspace access, the bound sandbox and account, the uploader, the file claim, and the stored size before streaming R2.
Its private response carries `application/octet-stream` and the file's Content-Length.
Each refused download gives a fixed error with no ownership detail.

A continuation moves an unanswered message to a new turn with a new command ID.
The runner ignores a command ID that it already received, so the continuation needs that new ID.
The continuation keeps the message and its file paths, so its check finds the same owner key.
It waits for a held copy, and it goes out at once after a finished copy.
A reconnect to the same computer also finds the same owner, which then follows the newest connection.
One active file owner serves each computer and path across messages.
After a restart, a missing message proof checks a recorded transfer through provider metadata.
When no transfer is recorded, it starts a new download with a new token and temporary file.
The restarted command removes older temporary files of that file.
Each final move is atomic, so overlapping downloads cannot mix bytes at the final path.
No process ID is stored.

Completion enters the chat queue again.
It saves the copy proof with `ChatRecords.saveAttachmentCopy(messageId, sandboxId)`, marks the owner ready, and resumes dispatch.
After the queue task ends, `completeAttachments` calls [attachment-transfer-cleanup.ts](attachment-transfer-cleanup.ts) to delete eligible stored bytes.
It does this also when the first command or the first connection of the owner is gone.
When no owner is in memory, as after a restart, the check reads that proof with `ChatRecords.attachmentCopy(messageId, sandboxId)`.
It uses the proof only when each stored relative path of the command is the current shared path of its file.
Such a proof lets the command go out with no new copy.
Dispatch rechecks access, turn eligibility, and the computer identity before it sends the current runner command with paths.
`resolveAttachmentPaths` in [attachment-paths.ts](attachment-paths.ts) reads the current folder map again for each send.
It sends absolute paths also after a restart that recovered a stored proof.
A stored command with an old path cannot reuse its proof.
An old path is the old absolute-path field, or a relative path from the old digest of the message ID and the file ID.
`prepareMessageAttachments` also refuses that path, so its copy fails through the normal failed-turn path.
Try again then admits the current path of each file.
A new computer or message gets a new preparation key and joins or starts its file transfers.
A failed proof save closes the runner connection and clears the owner.
Redelivery reads any proof that committed before the failure.

A failed copy clears its owner in the chat queue.
`AttachmentPreparation.currentCommand` then finds the current command of the message.
That is the first pending `turn` or `message` command of the message that the newest connection of the owner can still send.
The failure ends the turn of that command, queued or running, through the existing failed-turn path.
After a continuation, that is the new turn, and the earlier turn keeps its end.
The end gives the HTTP error of the copy, or else `attachment_copy_failed`.
Its retry message is the message whose copy failed.
Try again accepts the same text and files under a new message ID, so its files keep their paths.
The new message ID gives a new owner and a new check of each completed file.
An incomplete transfer still downloads the original bytes.
The end removes each pending command of that turn, so the failure adds no wait for a later message.
When the failed turn was running, the same commit then saves an `interrupt` command for that turn.
That interrupt goes out although the turn has ended, so the runner stops the agent of that turn.
Each new runner connection gets it again until the late end of that turn from the runner removes it.
The interrupt changes no public turn or session state.
So Try again needs no Worker wait, and the runner starts the retry after the old agent process exits.
After that commit, the common turn-end report gives the end to the lifecycle and to device cleanup, as for every other turn end.
A failure fails no turn when the newest connection of its owner has closed, or when the workspace names another sandbox.
The current connection and computer then get their own owner.

## Completed transfers

`prepareMessageAttachments` reads `SandboxProvider.fileInfo` for each file whose recorded destination is the current sandbox.
It uses the absolute copy path and compares the byte size with the stored upload size.
It accepts a same-size edit without reading R2 or starting another download.
A directory, a changed size, or a provider 404 makes the file missing.
Other provider failures give `attachment_copy_failed`.
The message owner checks every transferred file and collects missing names in message order.
[attachment-missing.ts](attachment-missing.ts) builds the singular or plural `attachment_missing` cause.
The failed-turn path saves that cause in both the turn and its event.
Try again checks each path again, so a restored file can pass.

While R2 bytes remain, a different sandbox downloads them and replaces the recorded destination.
After byte deletion, a different sandbox gives `attachment_missing` without a provider read or download.

[attachment-transfer-cleanup.ts](attachment-transfer-cleanup.ts) deletes only the R2 object, then sets `bytes_deleted_at`.
It keeps the claimed record, so sent messages keep their file metadata and chips.
Deletion requires the current sandbox to match the recorded destination.
It also requires a succeeded `workspace_creation_attempts` record.
Pending and failed attempts keep their bytes, even if the workspace state already says ready.
A legacy workspace without an attempt uses its completed-start state instead.
The immediate cleanup runs after the message proof commits.
A cleanup failure keeps the record retryable and leaves the successful turn unchanged.

## Agent input

After the member's text, the runner adds one line: "The sender attached these files. Read each file, or the parts of a large file that you need, before you answer."
The runner then gives the agent the original name, media type, copied absolute path, and `sizeBytes` of each file.
It takes the size from the metadata of the message, with no file read.
`attachmentDescription` in [attachment-description.ts](../../runner/src/providers/attachment-description.ts) writes that description for the Claude and Codex adapters.
Each description is one line with a JSON object, so a name with quotes or a line break stays inside its value.
Codex also gets each image of at most `ATTACHMENT_IMAGE_MAX_BYTES`, 25,000,000 bytes, as a local image input after its file line.
A larger image gets only its file line.
When at least one image goes as image input, the read line adds "Each image is also in this message."
A message without attached files gets no read line or file lines.

## Cleanup

The scheduled members cleanup deletes expired download tokens, including consumed tokens.
It also retries byte deletion for transferred records after a successful first start.
It also sweeps expired drafts.
An unfinished upload keeps its multipart ID until completion.
The sweep aborts that upload before it removes the expired record, also when no part arrived.
It uses conditional revisions before deleting a ready file.
For a claim, the sweep calls the trusted `expireChatAttachment` RPC of the claiming workspace object.
That RPC checks acceptance in the chat queue.
An accepted file's metadata stays while its workspace survives, including Archive and a failed first start.
Its bytes stay until its transfer and first start succeed.
A create that failed before admission leaves no surviving workspace, so its file returns to its original draft deadline.
An old claim's cleanup cannot delete the revised claim of a new attempt.

Workspace purge deletes its external files after the member fence drains workspace work.
Org purge also deletes unclaimed and hidden-attempt files before it removes D1 ownership.
Each bounded batch renews the cleanup lease.
The sweep also removes completed orphan objects whose upload outlived its record.

## Verification

The attachment tests use local Miniflare R2 and D1.
Storage tests also call the internal storage boundary.
The raw and multipart route tests use the real Worker and native R2 in Miniflare.
The multipart tests cover both targets, part replacement, exact body lengths, empty files, and a two-part file with a shorter last part.
Completion tests check the final size, access changes, competing completion calls, and abort of an expired unfinished upload.
Copy tests inject detached command responses through `prepareAttachments`.
The fake command downloads through the real one-use route with local D1 and R2.
Shell tests execute the generated command with a fake curl boundary to check byte counts and atomic file placement.
The copy owner tests use that fake transfer to count the writers of each computer and path, and the writes after delivery.
The later-message test keeps a same-size edit and checks metadata without another transfer or R2 read.
The missing-file tests cover ordered names, changed sizes, a replacement sandbox, provider outages, and Try again after restoration.
The retention and cleanup tests cover proof order, failed first starts, retryable byte deletion, and purge after byte deletion.
The legacy-path tests store an old absolute or message-derived relative path with a proof, and check that the turn fails.
The fixture never sends a request to a real provider.
The cleanup integration test runs the production scheduled handler through `/__test/scheduled`, with the native workspace object, D1, and R2.
The failed first start integration test keeps a first-message file through the native expiry RPC, a restart, and Try again, with one exact copy.
The claim race and rollback tests call `expireClaimedAttachment` in the chat queue.
The runner provider tests check the description and the image input of each adapter.
See [the test guide](tests.md) for the groups.
