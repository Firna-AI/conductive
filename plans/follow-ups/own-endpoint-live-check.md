# Run one live turn of each agent on an own endpoint

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, the post-merge task of the own endpoint plan on branch `calummoore/cli-proxy-setup`, which the pull request of that branch deletes.
- **Location:** the account page of `conductive.build`, and a new workspace there.
- **Reason:** The check needs the deployed change and a real proxy.

- **Terms:**
  - **Own endpoint login:** an agent login that sends the model requests of an agent to a gateway or a proxy that the user chose, with the user's key, through the model gateway in the Worker. The account page connects one for Claude and for Codex.
  - **Runner of protocol 2:** the agent runner of an org image that takes a turn token in place of the login. Only such a runner runs an own endpoint turn.
- **Background:**
  - The tests used fake upstreams and fake keys only. No request went to a real proxy.
  - Cal runs a CLIProxyAPI proxy, at an address such as `https://<IP address>.sslip.io`, that pools Claude and ChatGPT subscriptions. One live turn of each agent through it worked on 8 November 2026, before the gateway forwarded own endpoint turns.
  - The address rule refuses an IP address as the host, so the proxy needs a host name with a certificate for it.
  - The Worker reads the endpoint's model list at the save, and the owner's pickers hide each app model that the list does not name.
- **Problem:** No turn has run through the gateway to a real own endpoint yet.
- **Impact if no action:** A defect that only a real proxy shows, such as a header or a stream form, stays unknown until a user meets it.
- **Root question:** Does a turn of each agent run through the gateway to a real own endpoint on the deployed app?
- **Options:**
  - **A.** Check that the org image of the test org has a runner of protocol 2. Connect the proxy for both agents on the account page, and check the host line and the model list line. Run one turn of each agent in a new workspace, and one Refresh. Keep the key, the full address, and the proxy's logs out of saved evidence. Effort: Small.
- **Left out:** A check before the merge, because the change is not deployed until it merges.
- **Wider fix:** None. This is a one-time check.
- **Previous examples:** The live check of the Codex ChatGPT sign-in before its merge.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the check needs the deployed change.
