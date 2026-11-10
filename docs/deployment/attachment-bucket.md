# Deployment: the attachment bucket

This page belongs to [Deployment inputs](../deployment.md), which lists
every binding, public variable, and secret of the Worker. It gives the
setup of the bucket of `CHAT_ATTACHMENTS`, and the inputs of the upload
links of an import from Conductor.

## The attachment bucket

`CHAT_ATTACHMENTS` holds the files that users attach to chat messages, as
[Attachments](../protocol/messages-and-attachments.md#attachments) says. It
also holds the stored work and the old documents of each import from
Conductor, as [Import uploads](../protocol/access-and-security.md#import-uploads)
says. One bucket serves every org.

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
  no CORS rule. Only the Worker reads the bucket. Only the Worker writes
  it, apart from the parts of an import, as
  [Orgs and workspaces](../protocol/isolation.md#orgs-and-workspaces)
  says.
- Add no lifecycle rule that deletes files by age. Such a rule would also
  delete the files of sent messages, which stay until the app deletes their
  workspace. It would also delete the stored work of an import, which
  stays until its activation. The app deletes the expired parts of an
  import itself.
- The copy of each file into a sandbox also needs the `file.write` action
  on the Boat key, as [The app's Boat account](../deployment.md#the-apps-boat-account)
  says.
- Local development and the Worker tests use local R2 storage. They need no
  Cloudflare account and no bucket.

### Upload links of an import

The import from Conductor uses the same bucket and the same binding. The
Mac app sends each part of an import straight to the bucket, with a
short-lived upload link that the Worker signs, as
[Import uploads](../protocol/access-and-security.md#import-uploads) says. A
link needs a key pair of R2's S3 API, which the binding does not give. No
route reads these three inputs yet.

1. In the Cloudflare dashboard, open R2, then Manage API tokens.
2. Create an API token with the permission Object Read & Write, for the
   bucket `conductive-chat-attachments` only.
3. Set its Access Key ID as `CHAT_ATTACHMENTS_ACCESS_KEY_ID`, and its
   Secret Access Key as `CHAT_ATTACHMENTS_SECRET_ACCESS_KEY`. Both are
   Worker secrets.
4. Set `CHAT_ATTACHMENTS_S3_BUCKET_URL` to the S3 address of the bucket,
   with the account ID of the Cloudflare account that holds it.

- Use a token of its own. The S3 key pair of the deploy token reaches more
  than this bucket, as [The archive in each deploy](../deployment.md#the-archive-in-each-deploy)
  says.
- The bucket needs no CORS rule for the links. The Mac app sends the parts
  from its own process, not from a page.
- The Worker never sends the key pair to the browser, to the Mac app, or
  into a sandbox. It sends only signed links.
- Without these inputs, an import cannot upload. Attachments and every
  other route work without them.
- The local R2 storage of development and of the Worker tests has no S3
  address, so it cannot take these links.
