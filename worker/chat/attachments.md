# Chat attachment storage and delivery

The Worker stores attachment bytes in the private `CHAT_ATTACHMENTS` R2 bucket.
D1 keeps the owner, target, upload deadline, claim revision, and deletion journal.
The browser posts one raw file through the shared upload URL builder.
The route registry gives the entry and gate the same method, matcher, and byte limit.
The storage API also accepts decoded bytes independently of the browser transport.
[Attachments](../../docs/protocol/chat-and-events.md#attachments) gives the requirements.

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
A failed first start can move its claim to a fresh attempt for that same first message.
The earlier attempt must have failed and released its public workspace record.
The original draft deadline still applies until a surviving workspace accepts it.

A D1 claim alone proves no acceptance.
`ChatRecords.saveMessage` stores the attachment-use marker with the message in the chat transaction.
A repeated accepted message returns before it attempts a new claim.
The paths use a fixed-length digest of the attachment and accepted message identities.
Thus another message gets a separate file without a filename-length restriction on message IDs.
The hidden filename lives directly under `/home/user`, which already exists.
No copy relies on provider directory creation.

## Dispatch

`AttachmentPreparation` starts provider work through `waitUntil` outside the chat queue.
Stop, runner events, and confirmations keep using that queue during a transfer.
The provider helper accepts an injected HTTP boundary for tests.
Empty attachment lists return before any storage or provider call.

Completion enters the chat queue again.
It checks the current connection and pending command before it saves the computer identity.
Dispatch rechecks access, turn eligibility, and that computer identity.
Only then does it send the existing runner command with paths.
A reconnect to the same computer uses the prepared-command record.
A new computer or new message gets a new copy.
A failed proof save closes the runner connection and clears local preparation state.
Redelivery reads any proof that committed before the failure.
An obsolete transfer finishes before its replacement starts, so writes to one message path never overlap.

A failed initial copy ends only its queued turn and enables the existing Retry path.
A failed copy for a message joining a running turn keeps the message pending.
The next dispatch attempt can copy it again without changing the running turn.

## Cleanup

The scheduled members cleanup also sweeps expired drafts.
It uses conditional revisions before deleting a ready file.
For a claim, the trusted `expireChatAttachment` RPC checks acceptance in the chat queue.
An accepted file stays while its workspace survives, including Archive.
A failed first create without a surviving workspace returns to its original draft deadline.
An old claim's cleanup cannot delete the revised claim of a new attempt.

Workspace purge deletes its external files after the member fence drains workspace work.
Org purge also deletes unclaimed and hidden-attempt files before it removes D1 ownership.
Each bounded batch renews the cleanup lease.
The sweep also removes completed orphan objects whose upload outlived its record.

## Verification

The attachment tests use local Miniflare R2 and D1.
Storage tests also call the internal storage boundary.
The raw route tests use the real Worker and native R2 in Miniflare.
Copy tests inject a fake grant and signed transfer through `prepareAttachments`.
The fixture never sends a request to a real provider.
See [the test guide](tests.md) for the groups.
