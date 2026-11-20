# OpenAI and release requests set options by hand

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the branch `calummoore/follow-up-worker-outbound-request-helper-e229`, pull request #472, which added `outboundRequest`.
- **Location:** `worker/codex-auth/oauth.ts:36`, `worker/lifecycle/software-release.ts:40`, `worker/http/README.md:214`, and `worker/codex-auth/README.md:55`.
- **Reason:** The work changes the OpenAI sign-in and the release read, outside the helper change, and its live check needs a person.

- **Terms:**
  - **Workers runtime:** The Cloudflare runtime, workerd, that runs the Worker in production, and that Miniflare runs locally.
  - **`outboundRequest`:** The shared helper in `worker/http/outbound-request.ts` that builds the Worker's requests to the GitHub, Boat, and Resend APIs.
  - **Device code sign-in:** The ChatGPT sign-in of Codex, in which the member enters a short code at `https://auth.openai.com/codex/device`.
  - **Renewal:** The Worker's exchange of a saved refresh token for new ChatGPT tokens.
  - **Release server:** The public R2 host of the sandbox software releases, `https://runner.conductive.build`, which the Worker variable `CONDUCTIVE_RELEASE_SERVER` can replace.
- **Background:**
  - `outboundRequest` builds each `Request` with `redirect: 'manual'` and a `User-Agent` header with the product name, "Conductive". Its options type has no `redirect` field.
  - The Workers runtime throws a `TypeError` for `redirect: 'error'`. The value `'follow'` would send the credentials of a call on to the redirect target.
  - GitHub and Resend require a `User-Agent` header, and the Workers runtime adds none.
  - On 18 November 2026, the helper replaced the hand-set options of the GitHub, Boat, and Resend requests. It moved only the call sites that a follow-up item of 9 November 2026 listed.
  - The OpenAI sign-in in `worker/codex-auth/oauth.ts` came on 11 November 2026, in commit `d970f263a` of pull request #177.
  - Its `post` function, at line 30, builds the device code request, the device poll, the code exchange, and the renewal, all to `https://auth.openai.com`.
  - `post` sets `redirect: 'manual'`, a timeout signal, and only a `Content-Type` header. It sends no `User-Agent`.
  - The helper change left `post` out, because the 9 November list did not name it. A new `User-Agent` also changes a live sign-in, which needs its own check.
  - The release read in `worker/lifecycle/software-release.ts` came on 16 November 2026, in commit `a20746b99` of pull request #342.
  - `latestSoftwareRelease`, at line 29, sends `GET <base>/releases/latest/conductive/x86_64-unknown-linux-musl` to the release server. It sets only `redirect: 'manual'`, with no header.
  - The helper change left the release read out, because the 9 November list named only the GitHub, Boat, and Resend requests.
  - The Worker tests run in Node, not in the Workers runtime. Node and the TypeScript types accept `redirect: 'error'`.
  - `worker/lifecycle/software-release.test.ts` checks the address and the `'manual'` redirect mode of the release read, and that a 302 answer fails it.
  - The OpenAI tests in `worker/codex-auth/` and `worker/app-api/codex-device*.test.ts` use fake OpenAI answers. They check addresses and bodies, not the redirect mode or the headers.
  - Model request forwarding in `worker/model-gateway/headers.ts`, the preview proxy in `worker/previews/headers.ts`, and incoming copies in `worker/http/request-body.ts` stay outside this item.
  - These paths forward or rebuild an agent or browser request, instead of making an outside API call of their own. The helper would replace their forwarded header or incoming redirect mode.
- **Problem:** Two Worker requests to outside services set their options by hand, outside `outboundRequest`. No test checks the redirect mode of the OpenAI requests. `worker/http/README.md` does not say whether the two requests are exceptions on purpose.
- **Impact if no action:** A later edit of either request can set a wrong redirect mode, as the mail sender did until 9 November 2026. For the OpenAI requests, no test finds it before production, and ChatGPT sign-in for Codex then fails.
- **Root question:** How do the Worker's own requests to OpenAI and to the release server keep a safe redirect mode and the headers that each service accepts?
- **Options:**
  - **A.** Keep both requests as they are. In `worker/http/README.md`, record both as exceptions to `outboundRequest`, with the reason for each. No request changes, and the OpenAI redirect mode stays untested. Effort: Small.
  - **B.** Move only the release read to `outboundRequest`. In `worker/http/README.md`, add the release server to the helper entry, and record the OpenAI requests as the one exception. The release read then also sends `User-Agent: Conductive`. The OpenAI redirect mode stays untested. Effort: Small.
  - **C.** Move both requests to `outboundRequest`. Update `worker/http/README.md` and the HTTP client paragraph of `worker/codex-auth/README.md`. Each OpenAI request then also sends `User-Agent: Conductive`. Nobody has checked how OpenAI treats this header, and a refusal can break or delay sign-in. So the move needs these checks before its merge:
    - Run the existing focused tests: `npm run test -- worker/app-api/codex-device worker/codex-auth worker/lifecycle/software-release.test.ts`.
    - Capture one OpenAI request in the Workers runtime. Check that the runtime accepts it with `redirect: 'manual'` and `User-Agent: Conductive`.
    - Complete one real device code sign-in and one real renewal with the added `User-Agent`. After both, the app must show the Codex login as connected.
    - The live check needs a person with a suitable ChatGPT account. Request that help through the orchestrator when the later migration needs it.

    Effort: Medium.
- **Left out:** Wider approaches are outside the scope of this item: Worker tests in the Workers runtime, a lint, or a header policy for each API. The request for this item named only these three approaches.
- **Wider fix:** C. It removes the hand-set options of both requests, so the type of `outboundRequest` prevents a wrong redirect mode.
- **Previous examples:** `worker/mail-sender.ts` used `redirect: 'error'` until 9 November 2026. Each invitation email then failed in production with `502 invite_email_failed`, and every test passed. A run in Miniflare showed the `TypeError`.
- **Related:** `plans/follow-ups/runner-archive-from-deploy-check.md` is the same code. Its post-merge image build reads the release through `latestSoftwareRelease`, so after B or C it also checks the moved read.
- **Recommendation:** C. Only C protects the OpenAI redirect mode, which no test checks, and it leaves one rule with no exception.
- **Action:** fix after merge, apply C, because the work changes the OpenAI sign-in and the release read, and its live check needs a person.

Source: [pull request #472](https://github.com/Firna-AI/conductive/pull/472), which added `outboundRequest` in commit `0f5aa588b`.
