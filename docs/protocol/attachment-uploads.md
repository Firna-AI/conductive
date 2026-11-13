# Attachment uploads

This doc holds the requirements and the decisions in force for the routes
that take the bytes of an attached file. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, and the request bodies.
[Message attachments](message-attachments.md) states the size limit of a
file, and what the composer shows during its upload.

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
large-upload decision number, such as large-upload decision 1, names a
decision of the change that lets a message carry files of up to 1 GB.

## Uploads in parts

Large-upload decision 1 sends each attached file in raw parts, in place of
the one request of decision 144. The Worker streams each part into
storage, so it never holds the whole file in memory (decision 144). One
request for each file was rejected, because a zone of the Free or Pro plan
accepts a request body of at most 100 MB. One JSON body with Base64 was
rejected, because one upload of 25 MB then uses about 100 MB of memory.

- An upload straight to the bucket was rejected, because it needs a new
  secret, CORS rules, and a new host, and its URL cannot limit the size.
- A zone of the Business plan was rejected, because it accepts at most
  200 MB. A zone of the Enterprise plan was rejected, because it needs a
  contract, and one dropped connection then restarts the whole file.
- An upload has three calls: a start call, one `PUT` for each part, and a
  complete call. A draft file of an org and a file of a workspace each
  have their own routes for these calls.
- Each file uses these calls, also a file of one part. Reason: one way to
  upload is simpler to test and to keep.
- Only the member who started an upload can send its parts and complete
  it.

### The start call

- The start call is a JSON write with the default body limit. It names
  the file name, the media type, and the size in bytes. The start of a
  draft file also names the ID of the first message.
- The Worker refuses a size above the file limit of
  [Attachments](message-attachments.md#attachments) with HTTP 413 and the
  error code `attachment_too_large`.
- The reply gives the ID of the upload, the part size, and the number of
  parts.
- The part size is 67,108,864 bytes, or 64 MiB. The last part holds the
  rest of the file. So a file of 1 GB has 15 parts.
- Reason: R2 needs parts of one size, except the last part. A part also
  stays under the 100 MB that the zone accepts in one request body.

### The parts

- Only the two part routes take raw bytes in place of a JSON body, and
  only they have a higher body limit. A route added later gets neither.
- A part needs the content type `application/octet-stream`. The gate
  refuses a request with no content type or with another content type.
- A part needs a `Content-Length` header. The Worker refuses a request
  without it.
- The body limit of the part routes is 67,108,864 bytes, the part size.
  The Worker counts the bytes that arrive, as for every body.
- A body or a `Content-Length` above that limit gets HTTP 413 with the
  error code `attachment_too_large`, in place of `body_too_large`.
- The URL of a part carries the ID of its upload and its part number.
  Reason: the preflight then allows no new request header.
- The route refuses a part number above the number of parts. It also
  refuses a part whose length is not the length of that part. A body whose
  bytes do not match its `Content-Length` stores no part.
- Reason: no upload can then store more bytes than its declared size.
  Parts with no declared size were rejected, because one member could then
  store about 670 GB of parts until R2 ends the upload.
- The route accepts a part number again, such as after a lost reply. The
  new part takes the place of the earlier one.
- The reply of each part gives its receipt.

### The complete call

- The complete call is a JSON write with the default body limit. It sends
  the receipt of each part.
- Reason: the browser keeps the receipts, so the Worker keeps no record of
  the parts.
- The Worker checks that the stored file has the declared size. Only then
  is the file ready.
- The reply gives the file, with its copy path in `path`, as
  [Attachments](message-attachments.md#attachments) says.

### The gate

- For these routes, the gate keeps all its other checks:
  - the host, the sign-in, and app access
  - the `Origin` header
  - the membership of the org
  - the checks that refuse a write to the org, such as during a suspension
- Reason: like a JSON body, `application/octet-stream` needs a preflight,
  so a page on another site cannot send such a request. A request with no
  content type needs no preflight, so the gate refuses it.
