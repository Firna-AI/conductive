# Chat attachment storage and delivery

The Worker stores attachment bytes in the private `CHAT_ATTACHMENTS` R2 bucket.
D1 keeps the owner, target, upload deadline, claim revision, and deletion journal.
The browser posts one raw file through the shared upload URL builder.
The route registry gives the entry and gate the same method, matcher, and byte limit.
The storage API also accepts decoded bytes independently of the browser transport.
[Attachments](../../docs/protocol/messages-and-attachments.md#attachments) gives the requirements.

## Storage boundary

`storeAttachment` in [attachment-storage.ts](attachment-storage.ts) takes authenticated metadata and decoded bytes or a stream.
It checks current membership and the named target before it creates a record.
It measures the bytes and refuses a decoded total above `ATTACHMENT_MAX_BYTES`.
The byte limit is shared with the composer.
Raw uploads pass the entry-counted source through native `FixedLengthStream` into R2.
The declared length and stream completion must agree before readiness can publish.
Internal callers without a known length use bounded R2 parts without browser part routes or a part table.
Readiness publishes only after the object completes and the owner and target still permit the write.
An upload that loses ownership leaves no usable attachment.
Its failed cleanup keeps a deletion record for another attempt.

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
A later message then downloads the original bytes again.

The owner gives one file and its sandbox ID to `prepareMessageAttachments` in [attachment-copy.ts](attachment-copy.ts).
That helper checks the current claim, uploader, workspace access, sandbox, provider account, and stored relative path.
`attachmentRepositoryDirectory` in [attachment-paths.ts](attachment-paths.ts) selects the workspace repository from its captured folder map.
The helper stores a random download token through [attachment-download-data.ts](attachment-download-data.ts).
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
After a restart, a missing message proof starts a new download with a new token and temporary file.
The restarted command removes older temporary files of that file.
Each final move is atomic, so overlapping downloads cannot mix bytes at the final path.
No process ID is stored.

Completion enters the chat queue again.
It saves the copy proof with `ChatRecords.saveAttachmentCopy(messageId, sandboxId)`, marks the owner ready, and resumes dispatch.
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
The new message ID gives a new owner and a new copy of the original bytes.
The end removes each pending command of that turn, so the failure adds no wait for a later message.
When the failed turn was running, the same commit then saves an `interrupt` command for that turn.
That interrupt goes out although the turn has ended, so the runner stops the agent of that turn.
Each new runner connection gets it again until the late end of that turn from the runner removes it.
The interrupt changes no public turn or session state.
So Try again needs no Worker wait, and the runner starts the retry after the old agent process exits.
After that commit, the common turn-end report gives the end to the lifecycle and to device cleanup, as for every other turn end.
A failure fails no turn when the newest connection of its owner has closed, or when the workspace names another sandbox.
The current connection and computer then get their own owner.

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
It also sweeps expired drafts.
It uses conditional revisions before deleting a ready file.
For a claim, the sweep calls the trusted `expireChatAttachment` RPC of the claiming workspace object.
That RPC checks acceptance in the chat queue.
An accepted file stays while its workspace survives, including Archive and a failed first start.
A create that failed before admission leaves no surviving workspace, so its file returns to its original draft deadline.
An old claim's cleanup cannot delete the revised claim of a new attempt.

Workspace purge deletes its external files after the member fence drains workspace work.
Org purge also deletes unclaimed and hidden-attempt files before it removes D1 ownership.
Each bounded batch renews the cleanup lease.
The sweep also removes completed orphan objects whose upload outlived its record.

## Verification

The attachment tests use local Miniflare R2 and D1.
Storage tests also call the internal storage boundary.
The raw route tests use the real Worker and native R2 in Miniflare.
Copy tests inject detached command responses through `prepareAttachments`.
The fake command downloads through the real one-use route with local D1 and R2.
Shell tests execute the generated command with a fake curl boundary to check byte counts and atomic file placement.
The copy owner tests use that fake transfer to count the writers of each computer and path, and the writes after delivery.
The later-message test edits the first copy, then checks that the next message writes the original bytes to the same path.
The legacy-path tests store an old absolute or message-derived relative path with a proof, and check that the turn fails.
The fixture never sends a request to a real provider.
The cleanup integration test runs the production scheduled handler through `/__test/scheduled`, with the native workspace object, D1, and R2.
The failed first start integration test keeps a first-message file through the native expiry RPC, a restart, and Try again, with one exact copy.
The claim race and rollback tests call `expireClaimedAttachment` in the chat queue.
The runner provider tests check the description and the image input of each adapter.
See [the test guide](tests.md) for the groups.
