# The attachment bucket

This page belongs to [Deployment inputs](../deployment.md). It gives the
R2 bucket of `CHAT_ATTACHMENTS`: its creation, its location, and the
settings that it must not have.

`CHAT_ATTACHMENTS` holds the files that users attach to chat messages, as
[Attachments](../protocol/messages-and-attachments.md#attachments) says. One bucket
serves every org.

- Create the private bucket once, before the first deploy that declares
  the binding:
  `npx wrangler r2 bucket create conductive-chat-attachments --location weur`.
  The primary orchestrator does this at the next deployment.
- The location hint puts the bucket in Western Europe, near the production
  database and the workspace objects. A bucket keeps the location of its
  first creation.
- Without the bucket, `wrangler deploy` creates it with no location hint.
  So create it first.
- Keep public access off. Add no custom domain, no `r2.dev` address, and
  no CORS rule. Only the Worker reads and writes the bucket, as
  [Orgs and workspaces](../protocol/isolation.md#orgs-and-workspaces)
  says.
- Add no lifecycle rule that deletes files by age. The Worker keeps each
  accepted file until its transfer and the cloud computer's first start
  succeed. Then it deletes the stored bytes and keeps the file record.
  An age rule could delete bytes that a failed first start still needs.
- The cloud computer downloads each attached file with a detached command.
  The Boat key needs `exec` for this transfer, as
  [The app's Boat account](../sandbox-provider-accounts.md#the-apps-boat-account)
  says.
- Local development and the Worker tests use local R2 storage. They need no
  Cloudflare account and no bucket.
