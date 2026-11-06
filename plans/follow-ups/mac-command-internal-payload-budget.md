# Internal Mac relays reject messages near the limit

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #23, branch `conductor/boat-native-remote-workspaces-milestone-15f`, review finding 4.
- **Location:** `worker/devices/internal.ts:31` and `:62`, `worker/devices/workspace-machine.ts:74`, `:85`, and `:91`, `worker/devices/workspace-commands.ts:119`, `worker/devices/broker-messages.ts:78`, and `worker/devices/broker.ts:279`.
- **Reason:** Only messages a few hundred bytes below the limit meet the defect, and the internal transport has no public or stored format.

- **Terms:**
  - **Device frame:** One JSON message on the Mac app socket, limited to 1,000,000 UTF-8 bytes by `DEVICE_FRAME_LIMIT_BYTES` in `src/shared/device.ts`.
  - **Workspace object:** The Durable Object instance of one workspace, which stores the Mac command records of that workspace.
  - **Device broker:** The Durable Object instance named `devices:v1:user:<user ID>`, which holds the one current Mac connection of that user.
  - **Internal call:** A signed HTTP request between the two objects, sent by `deviceCall` and read by `deviceInternal` in `worker/devices/internal.ts`.
  - **RPC method:** A method of a Durable Object class that Worker code calls on the stub of the object, without an HTTP request.
- **Background:**
  - An agent in a cloud computer can ask the Mac of the sender of its turn to run a command. The user approves the command on that Mac.
  - The sandbox tool sends the request to the workspace object. The workspace object stores it and sends it to the device broker of the sender. The broker sends it to the Mac as a device frame.
  - The answers of the Mac go back the same way. The broker relays each answer to the workspace object with an internal call.
  - Both objects are instances of the existing `Workspace` class in `worker/workspace.ts`.
  - `docs/protocol/agent-tools.md`, section "The request", sets the limits. Each Mac command request body can contain at most 1,000,000 bytes. Each message on the device connection has the same limit.
  - The same doc, section "Results", says that each request ends with one result: the command ran, the user denied it, or the Mac is not available.
  - Each internal call sends the JSON body `{"target": ..., "operation": ...}`. A short-lived HMAC proof covers the target and the hash of the body.
  - The receiver reads the body with `readJsonObject` from `worker/http/json-body.ts`, which has a fixed budget of 1,000,000 bytes. Internal replies use `readBoundedJson` with a budget of 3,000,000 bytes.
  - A user rule for this feature, from 6 November 2026, applies to each new HTTP request body. Such a body must use the shared readers in `worker/http/` with the limit of 1 MB, which is 1,000,000 bytes.
- **Problem:**
  - `workspace-machine.ts:74` checks the `command.request` device frame against the limit of 1,000,000 bytes. The dispatch internal call at line 85 then sends the same record with the broker name and a hash of the workspace token.
  - This wrapper adds 106 bytes for a user ID of 6 characters, and 136 bytes for a user ID of 36 characters. The operation names `broker.dispatch` and `command.request` have the same length.
  - So a request whose frame is inside that margin below the limit passes the frame check. The receiver then answers HTTP 413 with the code `body_too_large`.
  - `deviceCall` turns the 413 answer into an error with the code `device_unavailable`. Lines 91 to 95 catch that error and store the request as `unavailable`. The request never reaches the connected Mac.
  - The sandbox tool gets HTTP 200 with the state `unavailable` and the error code `device_unavailable`. The chat shows that the Mac is not available.
  - A probe used the real internal sender, receiver, signature, and bounded reader. It kept the command `printf hello` and made only the reason longer:

    ```text
    Tool input:           999,510 bytes
    Device frame:       1,000,000 bytes
    Internal body:      1,000,108 bytes
    Receiver:           HTTP 413, body_too_large
    Internal caller:    error with HTTP 413 and code device_unavailable
    Reply to the tool:  HTTP 200, state unavailable, code device_unavailable
    ```

  - `refresh` in `workspace-commands.ts:119` sends the same dispatch call again, with the same margin.
  - The same wrapper sits on the answers of the Mac. A `command.failed` frame within about 240 bytes of the limit makes the `workspace.update` internal call at `broker-messages.ts:78` too large. This figure assumes UUID identifiers.
  - The broker treats that error like a broken connection, at `broker.ts:279`. It closes the Mac connection and ends every waiting or running request of that user as not available.
  - The shipped Mac app sends only short fixed failure texts, from `desktop/src/device/session.ts` and `desktop/src/device/runner.ts`. So only a changed Mac client meets the failure case now.
  - A `command.result` answer is safe. The Worker keeps at most 65,536 bytes of output, which is at most about 400,000 bytes after JSON escaping.
  - No test reaches dispatch at the frame limit. The test "keeps large allowed command records and opaque request IDs durably" in `worker/devices/routing.test.ts` sends a command of 220,000 bytes with no connected Mac.
- **Impact if no action:** Some requests inside the published limits fail on a connected Mac, and the agent and the chat get the wrong cause. A changed Mac client can close its own connection and end its other requests with one long failure answer.
- **Root question:** How does each request and each Mac answer that fits the published limits reach its destination?
- **Options:**
  - **A.** Dispatch by reference. The workspace object sends the broker only the workspace ID, the request ID, and the token hash. The broker reads the stored record with an internal call, and the reply keeps its budget of 3,000,000 bytes. Add the dispatch case of the regression tests of E. This fixes dispatch only, and a long failure answer keeps its problem. Effort: Small.
  - **B.** Payload-only internal bodies. Each internal body carries the original public payload unchanged: the record for dispatch, or the frame of a Mac answer. The routing and access values move into signed headers. Keep `readJsonObject` and its limit of 1,000,000 bytes. Add the two regression tests of E. Cost: each later operation must follow this rule. A header cannot carry a long or non-ASCII request ID as plain text, so such values need an encoding or a hash. The large-record test already uses a non-ASCII request ID. Effort: Medium.
  - **C.** Stored relay payloads. Store each request and each result, and pass only scoped references between the two objects. Add the two regression tests of E. Cost: new storage and cleanup for requests and results. Effort: Large.
  - **D.** A larger internal budget. Read each internal request body with `readBoundedJson` and the budget of 3,000,000 bytes that internal replies use. Keep the JSON content type check, and check the object with `deviceObject`. Add the two regression tests of E. Update the budget lines of `worker/devices/README.md`. Cost: the receiver reads up to 3 MB before it checks the proof, and the fix still depends on the size of the wrapper. Blocked: D breaks the user rule of 1 MB for each new HTTP request body. D becomes a real choice only when the user changes that rule. Effort: Small.
  - **E.** Durable Object RPC. Replace the signed internal fetch with one RPC method on the existing `Workspace` class, which extends `DurableObject`. `deviceCall` keeps its callers and calls that method with the target and the operation. Type the `WORKSPACES` binding with the `Workspace` class, so that the stub has the method. The method returns a plain value. It returns the HTTP status and the code of a failure as data, because an error from an RPC method can lose the fields of `HttpError`. The internal hop then has no HTTP body, so no byte budget remains for a wrapper to exceed. Delete `worker/devices/proof.ts`, `worker/devices/proof.test.ts`, `deviceInternal`, `DEVICE_INTERNAL_PATH`, and the internal reply budget. Those tests cover only behaviour that E removes. Update `worker/devices/README.md`. Effort: Medium.
    - Before the change, find the size limit of one RPC message in the official Cloudflare documentation. It must stay far above 1,000,000 bytes plus the operation values.
    - Before the change, get a security review of the new trust model of internal calls.
    - Keep these requirements. Only gated, trusted Worker code reaches the internal operations. Each receiving object checks its binding identity. The current access checks stay: the token hash, the active turn, the sender, and the desktop session.
    - Add two regression tests to the existing tests in `worker/devices/`. A request with a device frame of exactly 1,000,000 bytes reaches a connected Mac. A `command.failed` frame of exactly 1,000,000 bytes ends its request as failed with its message, and the Mac connection stays open.
- **Left out:**
  - A lower public allowance. It breaks the limits of 1,000,000 bytes in `docs/protocol/agent-tools.md`, which stay, and it adds stricter validation.
  - A report of only the size error. The request still does not reach the Mac, so it fails the goal.
  - One object for the workspace and the Mac. Each user has one current Mac connection for all of the user's workspaces, and each workspace keeps its own records. So two objects must exchange each request.
- **Wider fix:** E. It removes the byte budget that a wrapper can exceed, for each current and later internal operation. B is the other structural fix, but each later operation must follow its rule.
- **Previous examples:** The comment of `RUNNER_EVENT_MAX_BYTES` in `src/shared/runner.ts`, from commit `d46c855`, counts the storage wrapper and leaves room for it. `plans/follow-ups/file-read-size-refusals.md` records a related problem of size and error mapping in the Boat file read.
- **Recommendation:** E. It removes the cause in both directions and for each later operation, and it needs no change to the 1 MB rule. The first review recommended B, before its check added D and E.
- **Action:** fix after merge, apply E, because only messages a few hundred bytes below the limit meet the defect, and the internal transport has no public or stored format.
