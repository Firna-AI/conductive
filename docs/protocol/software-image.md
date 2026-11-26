# Software image

This doc holds the requirements and the decisions in force for the
software image, the saved snapshot of the app's own software that a first
build starts from. It covers what the image holds, the first builds that
start from it, its build at each deploy, and the images that the app
keeps. It belongs to [Sandbox software](sandbox-software.md), which covers
the releases, the updates of each sandbox, and the install in a build.
The terms are those of the [architecture doc](../architecture.md#terms).
A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An e2b
decision number names a decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says.

## The software image

- The software image is a saved snapshot of the base image with the app's
  own software installed. That software is a release of the sandbox
  software, the terminal packages, and the GitHub CLI.
- It holds no org data and no secret, because every org uses it.
- One software image belongs to each version of the app's own software. A
  change of any install step of that software makes a new version.
- The software image lives in the `boat` account. An org on another
  account, such as `e2b`, has none. Its first build starts from the base
  image of its own account, as for a missing software image below
  (e2b decision 222). Reason: a saved snapshot starts sandboxes only in its
  own provider account.
- A build of an org without an org image starts from the ready software
  image of the current version. It copies the repositories, installs the
  newest release, then runs the install script. A later build and a
  refresh start from the last org image.
- Reason: the first build of a new org then installs only the parts that a
  newer release changed.
- In place of the software image, a skip of the parts that each org image
  already holds was rejected. It does not make a first build faster. A
  later build and a refresh still skip the apt part when their org image
  holds it, as
  [Installs in a build](sandbox-software.md#installs-in-a-build) says.
- Without a ready software image of the current version, such a build
  starts from the base image. It copies the repositories, installs the
  app's own software, then runs the install script. A missing software
  image slows a build and never fails it.
- Each deploy run asks the Worker to build the software image of the
  deployed version, and waits for the result. A deploy run whose version
  has a ready software image waits for nothing.
- A Worker cron job that builds it by itself, and a build at the first org
  build after a release, were rejected. Reason: the deploy run then shows
  the result.
- The deploy run proves itself with a token of its own, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says.
- The deploy run fails unless the software image is ready when its wait
  ends. The new Worker stays live. Reason: one rule covers a failed build,
  a wait that ends first, and a refused request. A warning in the summary
  of the run was rejected, because it hides the failure.
- One software image build runs at a time. A build of a newer version ends
  an unfinished build of an older version.
- A failed build starts again only for a later deploy run. So a re-run of
  the deploy builds again.
- A software image build has a time limit of 60 minutes. A build that
  outlasts the wait of its deploy run goes on until it ends or reaches
  that limit.
- The app keeps the ready software image of the current version, whatever
  the start time of its build. It also keeps each software image that a
  running build still starts from. It deletes each other ready software
  image. These rules apply in each account that holds software images.
- Reason: a first build starts only from the image of the current version.
  Keeping only the image with the latest build start was rejected, because
  that image need not be of the current version.
- After a rollback of the Worker that changes the version, first builds
  start from the ready software image of the current version, when one
  exists. Otherwise they start from the base image, as for a missing
  software image above, until the next deploy run builds one.
