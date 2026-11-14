# Smoke test a 1 GB attachment on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-14, from the branch `calummoore/lisbon-ogce`, the post-merge task of its plan.
- **Location:** None.
- **Reason:** The test needs the merged change on the test deployment at `conductive.build`, a real cloud computer, and real R2 storage, which no local test has.

- **Terms:**
  - **Stored copy:** the bytes of an uploaded file in the `CHAT_ATTACHMENTS` R2 bucket, `conductive-chat-attachments`.
  - **Cloud computer:** the sandbox of a workspace, where the agent runs.
- **Background:**
  - Since the branch `calummoore/lisbon-ogce`, each attached file can hold up to 1 GB, or 1,000,000,000 bytes. The browser uploads it in parts of 64 MiB through the Worker.
  - When the turn of the message starts, the cloud computer downloads the file with `curl` from `POST /v1/internal/attachments/download` on `api.conductive.build`, with a one-use token. It writes the file to `.context/attachments/<digest>/<safe name>` in the repository folder of the workspace.
  - After the download, and once the first start of that cloud computer has succeeded, the Worker deletes the stored copy and sets `bytes_deleted_at` on the row of the file in the D1 table `chat_attachments`.
  - The local tests use Miniflare R2 and a fake provider. They prove the parts, the route, and the deletion, but not a real 1 GB transfer, the Cloudflare request limits, or the speed of the cloud computer's download.
- **Task:**
  1. In a workspace on the test deployment, attach a file of about 1 GB, such as one made with `head -c 1000000000 /dev/urandom > big.bin`, to a chat message.
  2. Check that the chip shows the upload progress and then the size of the file.
  3. Send the message, with the text "Give the size and the SHA-256 of the attached file."
  4. Check that the agent gets the message only after the download, and that the size and SHA-256 that it gives match the local file.
  5. Check in D1 that the row of the file has `transferred_sandbox_id` and `bytes_deleted_at`, and in R2 that its object is gone.
  6. Send a second message that names the same file. Check that it goes out with no new download.
- **Impact if no action:** A limit or a timeout that only the deployment has, such as a request limit of Cloudflare or a slow download, stays unknown until a member meets it.
- **Needs:** The merged change on the test deployment, a signed-in member with a workspace, and read access to the D1 database and the R2 bucket of the deployment.
- **Done when:** A 1 GB file reaches the agent with the same SHA-256, its stored copy is gone, and a second message with the same file goes out with no new download. Any failure has its own follow-up item.
