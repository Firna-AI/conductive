# GitHub tokens: image builds

This page belongs to [GitHub tokens](github-tokens.md). It states how a
build or a refresh of an org image gets GitHub access to copy each
repository. An image job is a build or a refresh of the org image. A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A parallel
copy decision number names a decision of the change that copies the
repositories of an image job in parallel.

## Image builds and refreshes

- A build or a refresh copies each repository of the image with Git in the
  build sandbox, as decision 90 requires. Each copy uses its own GitHub App
  installation token, which can only read the contents of that one
  repository.
- The copies of one image job run in parallel. Each copy has its own token
  and its own one-use build grant.
- The Git commands of an image job copy and check out its repositories.
  These commands run at the same time only when they fit together in a
  memory budget. The budget comes from the size of each repository that
  GitHub reports and from the free memory of the build sandbox (parallel
  copy decision 1). So a large repository copies alone. Many small
  repositories copy together.
- These ways were rejected (parallel copy decision 1):
  - All copies at once, and a fixed number of copies or Git commands at
    once in place of the budget. Only the budget lets a large repository
    copy alone and many small ones copy together.
  - One sandbox command for all copies. Each token then lives from the
    start of that command until the slowest copy ends.
- To read the size of each repository, the Worker uses installation tokens
  that can only read metadata. Each token covers the repositories of the
  job in one installation, at most 500 of them. When an installation has
  more than 500 repositories of the job, each further batch of at most 500
  gets its own token. Each metadata token stays in the Worker and never
  reaches the build sandbox. The Worker revokes every metadata token before
  the first copy starts.
- The Worker gives each clone token only to the Git command of its copy.
  The Worker and Git do not write it to command text, command history, a
  remote URL, a Git config, a file, or a saved snapshot.
- The Git command gets the token with a one-use build grant. The grant
  works once, and only for its own build and repository.
- The Worker revokes each clone token as soon as its Git command ends, also
  when the command fails. A failed copy fails the job. The Worker then
  revokes each token of the job that still works.
- The job goes on only after GitHub confirms the revocation of every token
  of the job. Before that, the job starts no checkout, software step,
  install script, snapshot, or other repository code.
- Risk: a later build and a refresh start from the last org image. A
  program with root access that an earlier install left in that image can
  read the clone token of a later copy. That token can only read its own
  repository, which the image already holds. The Worker revokes it when
  the copy ends.
- A build of an org without an org image starts from the software image or
  from the base image, where no org code has run.
- Reason: Git in the build sandbox copies a repository of any size, and the
  Git data does not pass through the Worker. Larger uploads and stored
  progress were rejected, because one repository or one Git response must
  still fit in one Worker job. A Git proxy in the Worker and a Workflow
  were rejected, because each puts a new service in the path of the Git
  data.
