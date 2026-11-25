# Org skills: the list of skills

This doc holds the requirements and the decisions in force for the list of
skills in the Skills section of the org settings. It covers the lookup of
the saved repository on GitHub, the list that it gives, and the notices in
place of the list. It belongs to [Org skills](org-skills.md), which gives
the terms. A skills decision number names a decision of the change that
adds the skills repository, as that doc says. A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws the list and
its notices under `app/org-settings/cloud-computer/skills`.

## The list of skills

- The Skills section looks up the saved repository on GitHub, and lists
  the skills that it finds (skills decision 7 H).
- The lookup runs at each Save and at each load of the section. Nothing
  stores its list. Reason: the list then follows the repository, as the
  copies do.
- The list and its notices belong to the saved repository. Text in the
  field that is not saved changes neither of them.
- The lookup reads the default branch of the repository with the GitHub
  sign-in of the member who views the section, as
  [The skills repository](github-tokens.md#the-skills-repository) says.
- The lookup finds the skill folders by the rule of
  [What loads](org-skills.md#what-loads). So the list names the skill
  folders of the newest commit.
- The list gives the number of skills, then the name of each skill folder,
  in name order. It gives no descriptions. Reason: each description needs
  one more request to GitHub.
- A repository that is private, not found, or without skills gives a
  notice in place of the list. Save still stores the repository. Reason: a
  refusal at Save is a new rejection, and the user did not ask for one.
- The notice of a private repository says that agents get no skills from
  it.
- The notice of a repository that is not found says that GitHub has no
  public repository with this name. Reason: GitHub also answers "not
  found" for a private repository that the sign-in of the viewer cannot
  see.
- Save removes spaces and line breaks at the start and the end of the
  text. Reason: a pasted link often carries them.
- Text that is neither `owner/name` nor a link from GitHub is saved as
  typed. It gives the notice of a repository that is not found, and the
  agents get no skills from it. Reason: a refusal at Save is a new
  rejection.
- A viewer whose GitHub sign-in expired gets the app's sign-in error in
  place of the list, not the notice of a failed lookup.
- The notice of a repository without skills says where the agents look
  for skill folders.
- When GitHub cuts the file tree short, the list gives the skills of the
  part that GitHub sends. A note says that the list can be incomplete, and
  that agents still get all of the skills.
- A cut tree without a skill gives only that note, not the notice of a
  repository without skills. Reason: its skills can lie after the cut, and
  the copy holds the whole repository.
- A lookup that fails, such as in a GitHub outage, gives the notice that
  the app shows for each part that did not load. Its title is "The list of
  skills did not load", and it has Try again. Try again loads the section
  again. The saved repository stays. Reason: the Cloud computer tab shows
  each failed load in this way.
- Members see the list and each notice too. Reason: the lookup runs for
  each viewer. So a member whose agents get no skills learns why, as with
  the
  [repository notice](org-image-repositories.md#the-repository-notice)
  of decision 241.
- The notices of a private repository and of a repository that is not
  found say what an admin can do. A member reads that an admin can act. In
  a suspended org, these notices name no action. The other notices read
  the same for each viewer.
- These ways were rejected (skills decision 7):
  - No sign in the app, with each warning only in the runner log. Admins
    then believe that agents have skills that they do not have.
  - A Save that refuses a repository that GitHub does not find. It is a
    new rejection.
  - A field that lists the repositories that the admin's sign-in reaches,
    as the Repositories tab does. Such a list is slow for many
    installations of the GitHub App.
