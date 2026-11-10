# Own endpoints through the model gateway

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from gateway decision 10 B on branch `conductor/model-gateway-worker-model-proxy-decision-120`.
- **Location:** `worker/model-gateway/route.ts`, `worker/model-gateway/login.ts`, `worker/chat/queries.ts`, `worker/chat/runner-delivery.ts`, `src/shared/runner.ts`, and the agent-login save routes under `worker/app-api/`.
- **Reason:** Cal chose to merge credential protection for existing logins before the separate custom-endpoint feature.

## Terms

- **Own endpoint:** a model API address and key that a user supplies for Claude or Codex.
- **Gateway:** the Worker routes that authenticate each model request and add the real login before forwarding it.
- **Turn token:** a credential that works only through the gateway while its agent turn runs.
- **Runner:** the program in each cloud computer that starts agents and receives turns from the Worker.

## Background

Conductive currently supports a Claude subscription token, an Anthropic
API key, and an OpenAI API key. The gateway replaces those real logins in
new-runner commands with turn tokens. Real logins remain in the Worker.

On 9 November 2026, Cal chose to finish that gateway first. The later
own-endpoint feature must use it. This item preserves the custom-upstream
work that moved out of the gateway release. The custom login kind and
its account form are part of the later feature.

The later integration retains these requirements:

- Each session uses its starter's saved login, whoever sends a message.
- New runners receive a turn token through a private login channel.
- Older runners keep their existing direct login support for native providers.
- The gateway accepts only public HTTPS upstream addresses, on any port the Worker can reach.
- A private or internal endpoint fails the turn with a clear cause.
- A private endpoint counts as a login that cannot be used.
- A removed or changed login, or loss of the starter's access, ends authorization for the running turn.
- Each in-flight request stops within 30 seconds after its turn ends.

These requirements apply when the custom login kind is added. The later
feature must not publish an intermediate custom-endpoint route that
sends its real key into a new-runner sandbox.

Agent design call, 9 November 2026: a custom-endpoint turn needs a
gateway-capable runner. For version 1, use the existing unusable-login
path before dispatch. Reason: Cal chose gateway-only custom endpoints,
and version 1 cannot use turn tokens. Native-provider support on version
1 stays as chosen. A new update flow or error contract needs its own
requirement decision.

## Task

1. Add the custom login as a saved endpoint and key, encrypted for each
   user and agent. Extend the gateway's login reader to decrypt it. Keep
   the endpoint and key in the Worker. The new runner still gets only
   the gateway address and a turn token.
2. Forward each allowed model route to the stored custom upstream. Keep
   the gateway's body limit, allowed headers, error redaction, turn and
   access checks, login-change checks, cancellation, and request lease.
   Keep model discovery off unless the later feature enables it. Only
   then add `GET /v1/models`, routed to the upstream of the current turn.
3. Use one address rule for the save route and the gateway. Accept only
   public HTTPS addresses. Refuse non-public IP ranges, localhost,
   single-label and internal names, and the app's own zones. Follow no
   redirects. Apply the check before every custom upstream fetch.
4. Enforce public destination addresses at fetch time, including a
   public name whose DNS points to a private address. Verify that
   `global_fetch_strictly_public` is enabled after checking its effect
   on the Worker's other fetches. A separate DNS lookup does not fix
   the address that a later fetch uses.
5. Check the custom address when the Worker dispatches a turn. A private
   address fails before an agent starts. Give a plain cause that names
   the starter and agent and points to the account page. A failed
   connection names the endpoint as unreachable. For a refused address,
   use the linked-session rules for a login that cannot be used.
6. Check which HTTPS ports a Worker fetch reaches on a host outside
   Cloudflare. State the supported ports in the gateway protocol.
7. Adapt the custom-endpoint feature to the completed runner protocol.
   Keep existing native-provider support on older runners. Custom
   endpoint turns use a gateway-capable runner. For a version 1 runner,
   apply the existing unusable-login path before dispatch. Keep any new
   update flow or other behavior for a separate requirement decision.
   Update the later feature's login delivery and provider code. Merge
   the gateway's transport settings from `main` and reconcile the older
   copies from commits `e6948b66` and `978941df` with that implementation.
8. Add focused tests for a public custom upstream, refusal of private
   targets at save, dispatch, and request time, and an unreachable
   upstream. Cover the failed-turn cause, unusable-login handling,
   authentication modes for both agents, and the absence of the real
   endpoint address and key from new-runner commands. Check refusal on
   a version 1 runner and any model-discovery route that the feature
   enables. Include secret endpoint values in error-redaction coverage.
9. Update the gateway and login protocol docs, the architecture's data
   flow and trust boundaries, and the relevant READMEs. Read both legal
   pages in full and update each sentence that restates a changed fact.
   Check that the account form's accepted addresses match the gateway's
   rule before the feature merges.
10. Run one real turn of each agent through the chosen public custom
    endpoint and the gateway. Check the image's runner version and its
    endpoint settings. Keep credentials out of saved evidence.

## Impact if no action

Users cannot use their own model servers through the supported login
flow. Adding the custom login without this integration can restore
credential exposure or accept addresses that fail on every turn.

## Needs

The completed gateway, its published runner archive, and an org image
with a gateway-capable runner. The later feature supplies the custom
login storage and form. A live check needs a suitable public endpoint
and a credential for each agent.

## Done when

Both agents can run on a user's saved public endpoint through the
gateway. All address, access, credential, and turn-lifetime requirements
above hold. Existing native-provider logins keep working. The targeted
tests, full repository gate, and live custom-endpoint checks pass.
