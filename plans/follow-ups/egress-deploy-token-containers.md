# Give the deploy token the Containers permission

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from branch `calummoore/untitled-v6`.
- **Location:** the GitHub environment `production` of `Firna-AI/conductive`, its secret `CLOUDFLARE_API_TOKEN`, and the Cloudflare dashboard.
- **Reason:** only the account owner can change the permissions of the Cloudflare API token.

- **Terms:**
  - **Egress Worker:** the Worker `conductive-chatgpt-egress` in `worker/chatgpt-egress/`. It owns the Cloudflare container that sends the ChatGPT requests of the model gateway to OpenAI.
  - **Deploy token:** the Cloudflare API token in the secret `CLOUDFLARE_API_TOKEN` of the GitHub environment `production`. `docs/automatic-deploys.md` lists its permissions.
- **Background:** The deploy run in `.github/workflows/deploy.yml` deploys the egress Worker before the main Worker when its inputs changed or another version is live. That deploy builds the container image with Docker and pushes it to Cloudflare, which needs the account permission Containers Edit. A failed egress deploy gives a warning, and the run goes on.
- **Task:**
  1. In the Cloudflare dashboard, edit the API token in `CLOUDFLARE_API_TOKEN`.
  2. Add the account permission Containers Edit on the account of the Worker.
  3. Push a change to `main`, or re-run the latest deploy run.
  4. Read the summary of the run.
- **Impact if no action:** Each change to the egress Worker on `main` warns and does not deploy. The egress Worker on Cloudflare then drifts from `main`.
- **Needs:** Access to the Cloudflare account and to the GitHub environment `production`.
- **Done when:** A deploy run that deploys the egress Worker shows `ChatGPT egress Worker: deployed` in its summary, and the environment `chatgpt-egress` of the repository lists a successful deployment.
