# Website changelog

This doc holds the requirements and the decisions in force for the
changelog page of the marketing site, at `conductive.build/changelog`. The
page tells users and visitors what changed in the product. A version is one
release of the product, such as 0.15.0. A post is the part of the page for
one day with a release. The terms are those of the
[architecture doc](../architecture.md#terms). The
[marketing mockups](../mockups/marketing-site.md#the-changelog-page) draw
the page at `marketing/changelog` in the
[catalogue](../mockups/catalogue.md), and that mockup is its visual spec.
[Writing the changelog posts](../../src/marketing/changelog-authoring.md)
gives the file format of a post and the steps of the routine that drafts
the posts.

## Curated posts

- The team selects the changes of each post and writes them in the words
  of the product, as the user chose on 12 November 2026. The GitHub
  releases stay the complete list of changes, and the page links them.
- A footer link to the GitHub releases was rejected. Reason: the releases
  are for engineers. They hold internal names and changes that no user can
  see.
- A page built from `CHANGELOG.md` was rejected. Reason: many of its
  entries are refreshes of the comparison page, internal words, or changes
  that users cannot see. One entry names the sandbox provider.
- A note in each pull request was rejected. Reason: every pull request must
  then add a note, and only a new gate could check it.
- A hosted changelog service was rejected, because its embed needs a
  script. Notes in the database of the app were rejected, because the
  static site cannot read them.

## The page

- The page lives at `https://conductive.build/changelog`, on the
  [marketing site](../architecture/marketing-site.md). Visitors need no
  sign-in.
- The page has the header and the footer of the site. The header marks no
  section.
- The top of the page has a label, a title, and one sentence. The sentence
  links the releases on GitHub. The posts follow, newest first.
- A page without posts shows one line in their place. The line says that
  the first post comes with the next release.
- One page holds every post. A post has no page of its own, and the page
  has no pages of posts, no feed, and no filter. Reason: the site has few
  posts, and the address of a post points to one day.
- The page is static content. It runs no script, sets no cookie, has no
  tracking, and reads no user data. The Worker serves it with the methods
  and the response headers of the other pages of the site.
- The browser title names the page and the product. The page has a
  description of its own. Link previews show both, as
  [Public link previews](link-previews.md) says.
- The page follows the layouts of the mockup and the colour scheme of the
  visitor. It never scrolls sideways at a width of 320 px or more.

## Entry points

- The footer of each page of the site links the page, with the name
  Changelog, as the last link of its Product column.
- The header of the site keeps its links. Reason: the header has no free
  width on a phone.
- The web app and the Mac app do not link the page.

## Posts

- The page has one post for each day with a release. Reason: releases come
  several times a day, so a post for each release would be very short.
- Each post shows its day, its title, its versions, its lead when it has
  one, and its sections. The day shows in words, such as
  "12 November 2026".
- A post lists its versions oldest first, and the page keeps that order.
  Each version shows in full, such as "Versions 0.13.0, 0.14.0, and
  0.15.0". Reason: a Mac user then finds the installed version with the
  find of the browser. A range of versions was rejected for that reason.
- The sections are New, Improved, and Fixed, in that order. A section
  without changes is left out. Reason: a reader looks for what is new
  first.
- Each section is a list with one change on each line. The lead and each
  change show as plain text, so a link or a mark in the file shows only
  its words.
- The page names the sections and sets their order, whatever the order in
  the file. The title of each post is a level-two heading under the one
  main heading of the page. The name of each section is a level-three
  heading. Reason: headings from the file would be at the level of the
  titles of the posts.
- A post whose versions hold no change for users or visitors still lists
  its versions. It then has no sections.

## Post addresses

- Each post has an address: the address of the page, `#`, and its day,
  such as `/changelog#2026-11-12`. The day of the post links to that
  address, so a visitor copies the link of one day without a script.
- An address with an unknown day opens the top of the page. Each other
  address under `/changelog`, such as `/changelog/`, shows the page for an
  unknown address, with status 404.
- A keyboard reaches each link of the page in reading order, with the focus
  ring of the site. On a phone, the link of each day is a target at least
  44 px high.

## Versions and days

- A post covers released versions only. A version is released when
  `CHANGELOG.md` on `main` has its heading. So a change on `main` waits for
  the release of its version.
- Reason: the Mac app gets a change only at a release. A version is also a
  fixed point, so the routine finds each version again without a gap or a
  double entry.
- The day of a post is the date of the headings of its versions in
  `CHANGELOG.md`. Reason: the release flow writes that date, so the routine
  needs no clock of its own.
- Each released version is in exactly one post.

## What a post says

- A post gives each change of its versions that a user of the app or the
  Mac app, or a visitor of the site, can see or use. A notable change to
  the site, such as a new page, counts.
- A post leaves out refactors, tests, CI, the release flow, refreshes of
  the comparison page, and changes for operators only. It leaves out every
  other change that no user or visitor can see.
- A post describes only what its versions give to users. It does not
  describe a hidden or planned feature as available.
- A post is for users and visitors, in the words of the product. It names
  no internal part, commit scope, code name, or file of this repository.
- [Names in the product](agents-and-sessions.md#names-in-the-product) and
  [The provider](workspaces-and-sandboxes.md#the-provider) apply to the
  posts. So a post never names the sandbox provider, and it never uses
  "Claude Code" as a name.
- A post holds no secret. It names no user, org, or customer.

## How a post is made

- The team writes each post as a Markdown file in this repository. Each
  change to a post then gets the review of a pull request.
- A routine of the Conductive org runs each day. It finds each released
  version that no post lists, and it reads the pull requests of those
  versions. It then drafts their posts and opens one pull request. A run
  that finds no such version opens no pull request.
- While a pull request of posts is open, a run opens no second one.
  Reason: two open pull requests can add the same version to two posts.
- A person reviews and merges that pull request. An agent never merges it.
  Reason: the review catches a wrong claim of the model, and agent merges
  are off.
- A daily run won over a weekly run, as the user chose. A CI job with a
  stored model key was rejected, because a routine gives the same draft
  without a new secret.
- A commit of the posts has the type `docs`. So the release notes leave it
  out, and it starts no release.

## Fields and defaults

- The front matter of each post gives its date, its title, and its
  versions. The body gives the lead and the changes of each section.
- A valid date is a real day in the form `YYYY-MM-DD`. A valid title is
  text that is not empty. A valid version is text that is not empty, and
  the versions field is a list of them.
- A field that is missing, or that has no valid value, takes its default:
  - date: the date in the name of the file of the post
  - title: the day in words
  - versions: none, so the post shows no versions
- A version in the list that is not valid stays off the page. A post
  without a valid date in its front matter or in the name of its file stays
  off the page.
- The lead is the first paragraph before the first section. Each section
  starts at a level-two heading with its name. Another heading stays off
  the page, with its list. Other text outside the lead and the lists of
  the sections stays off the page too.
- When a post repeats a section, the page joins their lines, in the order
  of the file.
- When two posts give the same day, the page shows only the first of them,
  in the ASCII order of the names of their files.
- Each of these cases logs a warning in the build, and none stops the
  build. A build error was rejected, because the defaults keep the page
  readable, as for the guides.
