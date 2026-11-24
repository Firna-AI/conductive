# Continue tests

This page belongs to [Continue](continue.md). It gives the tests of
Continue and their fixtures.

These entries test Continue. The code report gives their commands and
results.

- [`continue-routes.test.ts`](../features/continue-routes.test.ts) runs
  Continue through the real routes of the production Worker: the resume,
  the hold of sends and Archive, the credentials after recovery, and the
  routing of webhooks to the new branch.
  [`continue-entry.test-support.ts`](../features/continue-entry.test-support.ts)
  gives its workspace object the fixed future clock of the fixtures, so the
  native alarms stay in the future while the test drives each phase.
  [`continue-routes.test-support.ts`](../features/continue-routes.test-support.ts)
  builds its production Worker fixture with the fake GitHub repository.
- [`continue.test.ts`](continue.test.ts): a Continue by another member, the
  note in every open and closed session, the local-work question, a failed
  move, a publication that lost its reply, and a move that lost its exit
  result, also while the read of its branch fails. Each exit status of the
  failed move saves its stop cause and gives its exact text. The failed
  read saves the metadata cause until the repair.
  [`continue.test-support.ts`](continue.test-support.ts) builds its
  chat fixture with the Continue hold, the fake GitHub repository, the
  fake Boat, and the [fake host](tests.md#image-and-provider-boundaries).
  The fake host connects with a machine token that the fixture issues, so
  the Continue commands cross the host socket.
- [`continue-stop-causes.test.ts`](continue-stop-causes.test.ts) uses the
  same fixture: the causes of a cancel, a provider failure, and a failed
  start, an uncertain start that never repeats the move, and the read of a
  missing or unrecognized cause as `unknown`, with its saved error. Each
  case checks its exact text, also the GitHub access hint of a failed fetch.
- [`continue-access.test.ts`](continue-access.test.ts): the admission
  checks, and a member removed while Continue waits for the chat queue.
- [`continue-base.test.ts`](continue-base.test.ts): the live merged base,
  a deleted base, a default base stored as null, a failed branch read, and
  recovery of a job saved without a separate default branch.
- [`continue-concurrency.test.ts`](continue-concurrency.test.ts): the hold
  of dispatch and of a second Continue, a move after a member removal, and a
  saved resume.
- [`continue-credentials.test.ts`](continue-credentials.test.ts): the fetch
  grant and its end, also when membership ends during the token refresh.
- [`continue-native.test.ts`](continue-native.test.ts) runs the commands
  with real Git: the isolated fetch, the kept files and commits, a clash
  with the new base, and the count of every local branch. It also checks
  an index lock that stays in place, and a target branch that exists,
  which is not a clash. Each failed move writes no output.
  [`continue-native.test-support.ts`](continue-native.test-support.ts)
  builds its real Git repositories.
- [`continue-comparisons.test.ts`](continue-comparisons.test.ts) checks the real Git
  refs, content, and status across fetch, Continue, and a remote default rename.
  The local default keeps its commit. The new branch has only its `gh-merge-base`
  setting. Locks on `origin/HEAD` and Git config fail the metadata read until
  both locks go. The move and each failed read end with status 82 and no
  output. The next read repairs both without another checkout.
  Rust repository and report tests check the runner's comparison output.
- [`branch-context.test.ts`](../chat/branch-context.test.ts): the current
  branches of each runner command.
- [`continue.test.ts` route](../app-api/continue.test.ts): the
  [labels](continue-routes.md#labels) of a question in a POST and a GET
  reply. It also checks a question that needs no label, and a stop message
  that hides a secret value. The stored question and stop message keep the
  real names.
  A refusal for a missing workspace or a workspace of another org passes
  unchanged, and the route reads no secret value for it.
- [`continue-labels.test.ts`](../chat/continue-labels.test.ts): the
  [labels](continue.md#labels) of a new and a replayed note, on a tab that
  opened before the secret values changed. The saved note keeps its real
  names beside its labels. The job and the Git commands keep the real
  names. It also checks an old note without labels in the history of a new
  tab, a page of the session history, and the transcript copy.
  It also checks a note that a plain `changeWorkspace` writes with its real
  names only, after the secret values changed. A tab that opened before the
  change gets the note with the new labels. The stored note keeps the same
  labels, and the next event gets the next number.
