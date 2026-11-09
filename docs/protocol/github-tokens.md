# GitHub tokens

This doc states how a cloud computer gets GitHub access, and how the
Worker acts on GitHub as a member.
[Access and security](access-and-security.md) states the shared access
rules. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Git and the GitHub CLI

- Each workspace provides an authenticated GitHub CLI, `gh`.
- The GitHub App requests Issues read and write so CLI commands can list,
  create, and change issues. Read-only access was rejected because it
  prevents issue changes.
- Each `gh` command gets a fresh GitHub App user token through the git
  credential helper, unless the caller supplies `GH_TOKEN` or `GITHUB_TOKEN`.
- The token stays in the command's environment. The sandbox saves no login
  file and puts no token in a saved snapshot.
- Help, version, and completion commands need no GitHub access.
- In an agent turn, Git and `gh` use the token of the person who sent that
  turn. Pushes and pull requests show as that person, as decision 50 requires.
- Outside an agent turn, `gh` uses the workspace owner's GitHub account.
  The terminal is shared, so this account is the same for each connection.
- A supplied turn ID must name a current turn. An unknown or ended turn
  never falls back to the workspace owner.
- A trusted Continue job is the one other case. Its fetch gets the token
  of the member who pressed Continue, as [Continue](#continue) says.
- The helper asks the Worker at `/v1/git/credential` on
  `api.conductive.build`. It proves itself with the workspace token.
- The Worker checks access before it gets the GitHub token and again
  before it returns the token. The token must still belong to the same
  person after a refresh.
- Reason: a GitHub App user token expires after 8 hours, and the secrets
  of a sandbox change only at a resume.
- A user token reaches every repository where that person installed the
  GitHub App and has access.
- Risk: each process in the sandbox can get the owner's token without an
  agent turn. Each member with a terminal there can get it too.
  A copied token works until it expires, also on that person's repositories
  outside the org.

## Image builds and refreshes

- A build or a refresh copies each repository of the image with Git in the
  build sandbox, as decision 90 requires. Each copy uses its own GitHub App
  installation token, which can only read the contents of that one
  repository.
- The Worker gives the token only to the Git command of that copy. The
  Worker and Git do not write it to command text, command history, a
  remote URL, a Git config, a file, or a saved snapshot.
- The Git command gets the token with a one-use build grant. The grant
  works once, and only for its own build and repository.
- The Worker revokes the token as soon as the Git command ends, also when
  the command fails. The build goes on only after GitHub confirms the
  revocation. The build starts no checkout, software step, install script,
  snapshot, or other repository code before that.
- Risk: a build sandbox starts from the last org image. A program with root
  access that an earlier install left in that image can read the clone
  token of a later copy. That token can only read its own repository, which
  the image already holds. The Worker revokes it when the copy ends.
- Reason: Git in the build sandbox copies a repository of any size, and the
  Git data does not pass through the Worker. Larger uploads and stored
  progress were rejected, because one repository or one Git response must
  still fit in one Worker job. A Git proxy in the Worker and a Workflow
  were rejected, because each puts a new service in the path of the Git
  data.
- A workspace sandbox never gets an installation token. Its Git gets
  GitHub tokens only from the git credential helper.

## The Actions permission

- The GitHub App has Actions write, and each install owner approves it
  (decision 225).
- With it, the agent reads the logs of failed GitHub Actions jobs with
  `gh run view --log-failed`, for Fix checks of the pull request bar.
- Reason: the logs are the main evidence of a failed Actions job.
- A check of another service keeps its log outside GitHub. Fix checks then
  asks the agent to read its details, or to run it locally.
- Risk: write also lets each member token start, re-run, and cancel
  workflow runs, turn workflows on and off, and delete runs, logs,
  artifacts, and caches. This holds on each repository that the token
  reaches, also outside the org. Read access would be enough for the logs.
- These ways were rejected (decision 225):
  - No Actions permission. Fix checks then works only from the check
    summaries and local runs, and a failure that shows only in a log takes
    longer.
  - A Worker that puts the end of each failed log into the prompt. The
    actions of the bar only send their prompt (decision 222).
  - A personal token, or a second GitHub App, for the logs. One GitHub App
    gives the app all of its GitHub access.

## Merge as the member

- The Worker reads, for each member, the access of that member to the
  repository and the merge method that GitHub gives that member
  (decision 221). It reads with the member's own GitHub token, and the
  answer goes only to that member.
- A member may merge when GitHub gives that member write access or more.
  GitHub still checks the rules of the branch at the merge.
- Reason: GitHub reports no single field for the right to merge.
- The Worker merges with the GitHub token of the member who clicks Merge
  (decision 220). GitHub then shows that member as the merger, and checks
  the rights of that member.
- A merge with a token of the app was rejected. GitHub would then show the
  app as the merger, and skip the rights of the member.
- The Worker refuses a merge for a person who is not a member of the org,
  in a suspended org, and in an archived workspace.
- No GitHub error text reaches the browser. The Worker gives each refusal
  of GitHub as an error code of the app.

## Continue

- Continue fetches the latest default branch with the GitHub token of the
  member who pressed Continue (decision 226). GitHub then checks the read
  access of that member.
- The workspace runs this fetch as a trusted Continue job, as it runs the
  fetch of a create. The credential route gives the token to that job only
  while its fetch runs.
- The token reaches only that fetch. No Git setting and no hook of the
  repository folder runs with it. Reason: agent code can change the Git
  settings and the hooks of the repository folder.
- Every member may press Continue (decision 224). So the token of a member
  who is not the owner reaches the sandbox of the owner for the fetch, as
  it does for a message of that member.
- These ways were rejected (decision 226):
  - The token of the workspace owner, through the mode that `gh` uses
    outside a turn. It works only in a workspace from a newer org image.
  - An installation token that reads only the one repository. A workspace
    sandbox then gets an installation token, and the fetch needs the revoke
    steps of image builds.
