# GitHub tokens: image builds

This page belongs to [GitHub tokens](github-tokens.md). It states how a
build or a refresh of an org image gets GitHub access to copy each
repository. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

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
