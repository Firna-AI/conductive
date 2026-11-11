# Import uploads and storage

This doc holds the requirements and the decisions in force for the uploads
and the storage of an import from Conductor. It covers the upload links that
the Mac app gets, and how long the app keeps import data. It belongs to
[Access and security](access-and-security.md#import-uploads), which covers
sign-in, the gates of the Worker, and the secrets. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Import uploads

The import from Conductor sends each part of its upload straight to the
attachment bucket, with a short-lived upload link (import decisions 6 and
8). Cloudflare lets a request body to the Worker hold at most 100 MB, and
each device message holds at most 1,000,000 bytes. So no Worker request
can carry the work of a large workspace. Decision 144 rejected an upload
straight to the bucket for attachments, because it needs a new secret,
CORS rules, and a new host. The import accepts the new secret and the host.
It needs no CORS rule, because the Mac app sends the parts, not the page.
Attachments keep their own routes (import decision 12).

- The Worker gives an upload link only to the Mac app of the importer, over
  its device connection, for a part of a reservation of that importer.
- Before each link, the Worker checks the org and the importer of the
  reservation. Each check that refuses a write to the org, such as a
  suspension, also refuses a link.
- Each link allows one upload of one part, to one object under the prefix
  of its reservation. It allows only the size and the SHA-256 that the Mac
  app gave for that part.
- Each link is short-lived. An expired link stores nothing.
- The browser and the cloud computers never get an upload link, a download
  link, or a credential for the bucket.
- Only the Worker reads the bucket. A person reads an old document only
  through the Worker, as a member of the org of its workspace. This holds
  also after an Archive of the workspace.
- At the activation, the Worker copies the stored work into the cloud
  computer, as [The activation](imported-workspaces.md#the-activation)
  says.

### How long the app keeps import data

- The stored parts of a reservation become the stored work and the old
  documents of its workspace. A reservation that expires 7 days after the
  import made it loses its parts, as
  [Stopped uploads](conductor-import.md#stopped-uploads) says.
- The stored work of an imported workspace stays until its first
  successful activation, and the app then deletes it. A failed activation
  keeps it.
- The stored work of a workspace with no successful activation stays until
  the app deletes the workspace, also after an Archive. Attached files stay
  in the same way (decision 132).
- The old documents stay for the life of their workspace, also after the
  activation and after an Archive.
- The app deletes the import data of a workspace with the workspace. The
  purge of a deleted org also deletes its reservations and their parts.
- The app keeps no list of a scan and no import result, as
  [What the Mac sends to the Worker](conductor-import.md#what-the-mac-sends-to-the-worker)
  says.
