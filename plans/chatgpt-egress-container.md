# ChatGPT egress through a Cloudflare Container

Status: Active. On branch `calummoore/untitled-v6`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

OpenAI blocks requests that a Cloudflare Worker sends to `chatgpt.com`.
Since PR #259, the model gateway sends each `chatgpt.com` request to the
address in `CHATGPT_EGRESS_URL`. Today that address is a named Cloudflare
Tunnel to a proxy on Cal's Mac. ChatGPT-plan Codex turns therefore fail
when the Mac sleeps, restarts, or goes offline. This change moves the
proxy into a Cloudflare Container that the app's Cloudflare account owns.
The gateway reaches it through a service binding, so the container has no
public address. The change does not touch Claude turns, OpenAI API key
turns, or the ChatGPT sign-in flow on `auth.openai.com`.

## Decisions

- **User decision, 12 November 2026, egress decision 3:** deploy the egress
  Worker automatically, and let open streams finish when a container is
  replaced. This is option G below. Alternatives: options A to F. Reason:
  a manual deploy can drift from `main`, and a deploy must not cut
  answers.
- **User decision, 12 November 2026, egress decision 4:** retire the Mac
  proxy after one day of good container traffic, and keep the address
  path in the code. This is option B below.
- **User decision, 11 November 2026, egress decision 1:** host the proxy in a Cloudflare
  Container. Alternatives: keep the Mac proxy, a dedicated Boat sandbox,
  or Google Cloud Run. Reason: the product already runs on Cloudflare. The
  tests of the same day support it:
  - OpenAI accepted requests from a Cloudflare Container, Boat, AWS,
    Google Cloud Run, and the Mac. It blocked a plain Worker.
  - Through a container, streams stopped after 1 to 12 minutes while the
    container kept running. With the relay below, one 16-minute and two
    12-minute streams finished in full.
  - A redeploy did not update a Durable Object whose container was
    running.
  - The evidence is in `.context/egress-probe/results.md`.
- **My call, 11 November 2026:** a separate Worker,
  `conductive-chatgpt-egress`, owns the container. The main Worker calls it
  through a service binding. Reason: a deploy of the main Worker then needs
  no Docker build and no Containers permission. It also does not replace
  the container, which would cut the answers that stream at that moment.
- **My call, 11 November 2026:** the Durable Object in front of the
  container reads each chunk of the answer and writes it to its own
  stream. Reason: the tests above. Passing the body through unchanged let
  the streams stop.
- **My call, 11 November 2026:** the container proxy checks no shared
  secret. Only its Durable Object can reach the container port, and the
  egress Worker has no route and no `workers.dev` address. The proxy keeps
  its allow list of `https` ChatGPT origins and drops the Cloudflare
  headers.
- **My call, 11 November 2026:** the gateway uses the service binding
  when it exists. Otherwise it uses `CHATGPT_EGRESS_URL`, and otherwise it
  calls `chatgpt.com` directly. Reason: the address path stays available
  for another host, for example when OpenAI blocks container addresses.
  Decision 4, option D, would reverse this order.
- **My call, 12 November 2026:** each request goes to the instance named
  after the deployed version of the egress Worker. An instance sleeps
  after 15 minutes without a request, and the config allows 5 instances.
  Reason: a new version then serves new requests at once, while an old
  instance finishes its streams and stops. A cold start took about one
  second in the tests.
- **My call, 12 November 2026:** the deploy run deploys the egress Worker
  only when a hash of its inputs differs from the tag of the deployed
  version. The inputs are the egress Worker code, the proxy, the
  Dockerfile, and the version of `@cloudflare/containers` in the lock
  file. Reason: a deploy with no change would still start a new instance,
  and a CI image build can change its digest.
- **My call, 12 November 2026, after review round 1:** the container
  application uses the `durable_object` scheduling policy, in public beta.
  Each Durable Object starts the image of its own Worker version, which
  `pinned-image.ts` gives to the container helper. Reason: under the
  `default` policy, a request in the window between the Worker upload and
  the image rollout started the new instance on the old image. The
  rollout then drained it while new requests still reached it. Cloudflare
  also marks the `default` policy as deprecated, and an application cannot
  change its policy later. `code_update_strategy` defers the code update
  of an old object for up to 900 seconds.
- **My call, 12 November 2026, after review round 1:** a GitHub deployment
  of the environment `chatgpt-egress` records each complete egress deploy,
  with the version ID and the input hash. The deploy step skips only when
  that record names the live version and the current hash. Reason:
  Wrangler makes a tagged version live before its last step, so a tag
  alone let a failed deploy look current. The input hash also holds the
  digest of the base image, so a new base image deploys.
- **My call, 12 November 2026:** a failed deploy of the egress Worker
  gives a warning, and the run goes on to deploy the main Worker. Reason:
  the last egress version keeps serving, and the repository rules prefer a
  warning for a failure that the service survives.

### 3. How the egress Worker deploys

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/deploy.yml`.
- **Background:** The deploy run deploys the main Worker on each push to
  `main`. A container image needs a Docker build, and its upload needs the
  Containers permission on the deploy token. In the tests, a redeploy did
  not reach a running Durable Object, and a container rollout cut a
  stream.
- **Problem:** The egress Worker needs a deploy path that also reaches the
  running object.
- **Impact if no action:** The egress Worker on Cloudflare can drift from
  the code on `main`, or keep old code after a deploy.
- **Root question:** How does each change to the egress code on `main`
  start to serve ChatGPT requests, without cutting the answers that stream
  at that moment?
- **Options:**
  - **A.** An operator deploys it by hand with Wrangler and Docker, as its
    README says. No CI change. A change on `main` can wait for a manual
    deploy, and old code stays on the running object. Effort: Small.
  - **B.** The deploy run also deploys it, before the main Worker. The
    deploy token needs the Containers permission. A CI image build is not
    reproducible, so each push can start a rollout that cuts streams.
    Effort: Medium.
  - **C.** A, and each request goes to an instance named after the
    deployed version of the egress Worker. A deploy then reaches new
    requests at once, and old streams finish on the old instance, which
    sleeps after one hour. It needs room for two instances. An image
    change still replaces the old container, so deploy it at a quiet time.
    Effort: Small.
  - **D.** A separate workflow deploys the egress Worker when its files
    change, and on a manual run, with a token of its own. The list of
    watched paths must name each input. Effort: Medium.
  - **E.** The deploy run hashes the built egress bundle and the image
    inputs, and deploys only when the hash changed. A change to the bundle
    only deploys without a container rollout. Requests go to version
    instances, as in C. The production token needs the Containers
    permission. Effort: Medium.
  - **F.** The deploy run deploys the egress Worker on each push without a
    container rollout, and requests go to version instances. An operator
    deploys each image change by hand. Each push starts a new instance,
    which idles for one hour. Effort: Medium.
  - **G.** E, and the proxy drains on `SIGTERM`. Cloudflare sends
    `SIGTERM` before it replaces a container, and waits up to 15 minutes
    before it kills the process. The proxy then takes no new connection
    and lets each open stream finish. Version instances keep new requests
    off the draining container. An answer longer than 15 minutes is still
    cut. Effort: Medium.
- **Left out:** Cloudflare Workers Builds with watched paths: its builds
  have no Docker today.
- **Wider fix:** G. It deploys only when the built output changes, and a
  replacement waits for open streams.
- **Previous examples:** None found.
- **Recommendation:** C. It needs no CI change and no new permission, and
  each deploy reaches new requests at once. The first recommendation was
  A. E prevents drift best.
- **Action:** ask the user, because the options have real trade-offs, and
  B, D, E, and F need a credential change.
- **Outcome:** the user chose automatic deploy with drain on 12 November
  2026. This plan applies G.

### 4. What happens to the Mac proxy

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None.
- **Background:** After the switch, the gateway no longer uses the Mac
  proxy, because the binding comes first. The Worker still holds
  `CHATGPT_EGRESS_URL` and `CHATGPT_EGRESS_SECRET`. The Mac still runs the
  proxy and the tunnel.
- **Problem:** A laptop stays ready to receive ChatGPT logins in transit.
- **Impact if no action:** A laptop stays part of production.
- **Root question:** What fallback, on which host, does ChatGPT egress
  keep once the container serves it?
- **Options:**
  - **A.** Keep the Mac proxy running as a standby. The legal pages and
    the security guide then stay wrong for a fallback. Effort: Small.
  - **B.** Retire it after one day of good container traffic. Delete the
    two Worker secrets, stop the two Mac services, and delete the tunnel
    and its DNS name. Keep the address path in the code. A fallback then
    needs a host, the two secrets, and a pull request that removes the
    binding. Effort: Small.
  - **C.** Retire it and delete the address path from the code. The next
    fallback then needs new code. Effort: Small.
  - **D.** B, and the address path wins over the binding when both
    secrets are set, with a warning in the log. A fallback is then a host
    and two secrets, with no pull request. A forgotten setting sends logins
    past the container. Effort: Small.
  - **E.** B, and a new requirement in `docs/architecture/data-and-trust.md`:
    a host that sees agent logins in transit runs in an account of the
    app, never on a personal computer. Effort: Small.
  - **F.** B, and a standby proxy on Google Cloud Run in a project of the
    app. The Privacy page must then name Google. Effort: Medium.
  - **G.** F, and the gateway switches to the standby by itself when a
    probe sees the block page through the container. Effort: Large.
- **Left out:** A Boat sandbox standby: its hosted port answered 502, so
  it is not known to stream.
- **Wider fix:** E. A rule covers each such host, whatever its shape.
- **Previous examples:** PR #259, commit `dfd2ebf1`, put a laptop in the
  path of ChatGPT logins.
- **Recommendation:** B. The Mac then holds no part of production, and
  stray egress secrets do nothing while the binding exists. D gives the
  fastest fallback. E best protects the codebase.
- **Action:** ask the user, because the options change production
  settings and your Mac.
- **Outcome:** the user chose B on 12 November 2026.

Contract owners:

- [Model gateway](../docs/protocol/model-gateway.md).
- [Components](../docs/architecture/components.md) and
  [Data and trust](../docs/architecture/data-and-trust.md).
- The [model gateway README](../worker/model-gateway/README.md).

## Milestone 1: Documentation and protocol

Depends on: none

The docs state where ChatGPT requests leave Cloudflare, and that the
container sees the login only in transit.

- [x] `docs/protocol/model-gateway.md`: requests to `chatgpt.com` leave
      from a container that the app's Cloudflare account owns, with no
      public address. Record the decision, the rejected hosts, and why a
      plain Worker cannot send them.
- [x] `docs/architecture/components.md`: add the egress Worker and its
      container.
- [x] `docs/architecture/data-and-trust.md`: the container sees a ChatGPT
      login only in transit and stores nothing.
- [x] Read the Terms page, the Privacy page, and each public guide in
      full. Update each sentence that restates where model requests go.
      No sentence changes: each says that model requests pass through
      Conductive on Cloudflare, and the container is on the app's
      Cloudflare account. The audit also moved three sentences of the
      security guide about copied logins of an older computer out of its
      ChatGPT paragraph, with no word changed.
- [x] `docs/architecture/flows.md`: the ChatGPT requests pass through the
      egress container.

## Milestone 2: Egress Worker

Depends on: 1

- [x] Add `@cloudflare/containers` with `npm install`.
- [x] `tools/chatgpt-egress/proxy.ts`: a listen address setting, and a
      private network setting that skips the secret check. Log only the
      method, the path, the status, and the duration, never a body or a
      header value, as the protocol and the legal pages promise.
- [x] On `SIGTERM`, the proxy takes no new connection, lets each open
      stream finish, and then exits. Test: an open stream finishes after
      `SIGTERM`, and a new connection is refused.
- [x] `tools/chatgpt-egress/Dockerfile`: Node 24, the proxy, the private
      network setting, port 8080.
- [x] `worker/chatgpt-egress/`: the Worker, the Container class with the
      relay, version instances, its Wrangler config, and its README.
- [x] A unit test of the relay: bytes pass in order, and a closed client
      cancels the container read.
- [x] Typecheck, lint, format, file length, and the targeted tests.
- [x] Add the proxy tests to the Vitest include list and the proxy to the
      Node typecheck, and add the two new entry files to `knip.jsonc`.

## Milestone 3: Gateway binding

Depends on: 2

- [x] `wrangler.jsonc`: the `CHATGPT_EGRESS` service binding.
- [x] `worker/env.ts` and `worker/model-gateway/egress.ts`: the binding
      path, before the address path.
- [x] Add the binding case to `worker/model-gateway/egress.test.ts`.
- [x] Update the model gateway README.
- [x] `docs/deployment.md`: list the `CHATGPT_EGRESS` binding, and the
      `CHATGPT_EGRESS_URL` and `CHATGPT_EGRESS_SECRET` settings of PR #259.

## Milestone 4: Automatic deploy

Depends on: 2

- [ ] Cal: give the deploy token of the `production` environment the
      Containers permission. This blocks the first automatic deploy.
- [x] `.github/workflows/deploy.yml`: before the main Worker, hash the
      egress inputs, and deploy the egress Worker when the hash differs
      from the tag of its deployed version.
- [x] Update `docs/automatic-deploys.md`.

## Milestone 5: Deploy and verify

Depends on: 2, 3, 4

- [ ] Deploy the egress Worker once by hand, so that the service binding
      of the main Worker has a target before the merge.
- [ ] Through a temporary Worker with the binding, check that a request
      with a fake token gets OpenAI's 401 JSON reply.
- [ ] After the merge and the deploy, check a real Codex turn on a ChatGPT
      plan in the Workers logs of the egress Worker.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After one day of good container traffic, retire the Mac proxy, as
      egress decision 4 says: delete `CHATGPT_EGRESS_URL` and
      `CHATGPT_EGRESS_SECRET` from the Worker, stop the two Mac services,
      and delete the tunnel and its DNS name.
