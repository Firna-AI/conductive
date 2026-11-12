# Writing the changelog posts

The changelog page of the marketing site, at `/changelog`, shows one post
for each day with a release. This page gives the rules and the steps for
each author of a post. An author is the daily routine that drafts the
posts, or a person.
[Website changelog](../../docs/protocol/website-changelog.md) states the
requirements of the page and its posts.
[The changelog page](../../docs/mockups/marketing-site.md#the-changelog-page)
of the marketing mockups is its visual spec. The mockup holds sample
posts, not the posts of the site.

The routine reads this page from `main` at each run. So a change to this
page changes the next run, and the prompt of the routine stays short.

## Where a post goes

- Each post is one Markdown file in `src/marketing/changelog/`, named by
  its day, such as `2026-11-12.md`. Put the file directly in that folder,
  with the extension `.md`.
- One file holds the post of one day. A later version of the same day goes
  into the post of that day.
- Every file in that folder is public. Keep notes for authors, such as
  this page, outside that folder.
- Each push to `main` deploys the site. So a post on `main` is public at
  once. Merge only a complete post, with no placeholder text.

## The file

The front matter gives three fields. Write each value in double quotes.

| Field | What to write | Default |
| --- | --- | --- |
| `title` | A short headline that names the biggest change of the day | The day in words |
| `date` | The day of the releases, as `"YYYY-MM-DD"`, the same as the name of the file | The date in the name of the file |
| `versions` | The versions of the day on one line, oldest first, such as `["0.13.0", "0.14.0"]`, without the `v` of the tag | None, so the page shows no versions |

- Put the date in quotes. Without quotes, YAML reads the date as a time,
  and a day that does not exist, such as `2026-02-30`, moves to another
  day without a warning.
- Put the title in quotes. A title without quotes that holds a colon and a
  space stops the build at that file. Do not use a double quote in a title.
- A value that is not valid takes its default, and the build logs a
  warning.
  [Fields and defaults](../../docs/protocol/website-changelog.md#fields-and-defaults)
  gives each default.

The body has an optional lead, then up to three sections:

- The lead is one short paragraph before the first section.
- The sections are `## New`, `## Improved`, and `## Fixed`, in that order.
  Write each section once, and leave out a section without changes.
- Each section is a `-` list, with one change on each line. Do not nest a
  list.
- Write plain text. The page shows a link, a code mark, or bold only as
  its words.
- The page draws the names of the sections itself. Another heading, a
  second paragraph before the first section, and other text outside the
  lists do not show. The build logs a warning for each, and also for a
  repeated section.

This example is a sample. It is not a post of the site.

```markdown
---
title: "Syntax colours in diffs"
date: "2026-11-12"
versions: ["0.13.0", "0.14.0", "0.15.0"]
---

Diffs now show the colours of your code, so each change is quicker to read.

## New

- Diffs show the colours of your code, in light and dark.
- Copy a link to a workspace or a session from its menu.

## Improved

- Long chats open faster, because the newest messages load first.

## Fixed

- A workspace that resumes shows Starting, not a Resume bar.
```

When no change of a day goes in a post, still write the post, so that each
version has its place. Give it the title "Maintenance updates" and its
versions, with no lead and no sections.

## What goes in a post

A post is for the users of the app and the Mac app, and for the visitors
of the site. It gives each change that they can see or use. A notable
change to the site, such as a new page or a new public guide, counts. The
GitHub releases keep the complete list, so leave out the rest:

- Refactors, tests, CI, builds, and the release flow.
- Refreshes of the comparison page, such as new notes or statuses.
- Plans, mockups, and internal docs, also when their entry is a feature,
  such as "plan terminal tabs and draw their mockups".
- Changes for operators only, such as the operator section.
- A change inside the service that no person sees. When a person sees its
  effect, give that effect, not the change.
- A feature that the product hides, and work that only prepares a later
  feature.

Choose the section by what a person sees, not by the type of the entry:

- New: a thing that a person can do or see for the first time.
- Improved: a thing that works better, faster, or more clearly.
- Fixed: a thing that did not work as it should, and now does.

So a fix that users see as new goes under New. When a change reaches only
workspaces from a new build of the cloud computer, say so in its line.
When a change is only in the Mac app, start its line with "In the Mac
app,".

## The words

- Use the words of the screens and the public guides. The Copy rules of
  the `product-ui` skill apply: lead with what a person can do, keep a
  positive frame, and leak no internal detail.
- Each line says what a person can now do or see, in the present tense.
  Start it with the thing that changed or with an action verb, such as
  "Long chats open faster" or "Copy a link".
- Give one change on each line, in about 20 words or fewer. End each line
  with a period.
- Put first the change that most people meet. Join small fixes of one
  area into one line when each alone says little.
- Never name the sandbox provider. Write "cloud computer" or "sandbox".
- Never write "Claude Code". Write "agents powered by Claude and Codex",
  or name Claude or Codex.
- Name no internal part. Examples are D1, Durable Objects, Worker, runner,
  gateway, release-please, CI, commit scopes such as `chat:`, code names,
  file paths, and pull request numbers.
- Name no person, org, or customer. Quote no data of a user, and give no
  secret.
- For a security fix, say what is now protected. Do not say how the old
  fault worked.
- Check each claim against the pull request and the product, not only
  against the subject of the entry.

The title is a short headline that names the biggest change of the day,
in sentence case, with no final period. The lead is optional. In one or
two sentences, it says why the biggest change matters. That change still
has its line in its section.

## The steps of the routine

The routine follows these steps at each run. A person who writes posts by
hand follows them too. Run each command in bash, from the repository root.

1. Look for an open pull request of posts. If the command lists one, stop.
   Two open pull requests can add the same version or change the same
   post. The first run after its merge adds the rest.

   ```bash
   gh pr list --state open --json number,title \
     --jq '.[] | select(.title | startswith("docs(changelog):")) | "\(.number) \(.title)"'
   ```

2. Run the check below. It reads the version headings of `CHANGELOG.md`
   and the `versions` of each post. Its first list gives each released
   version that no post lists, with its day. If that list is empty, stop.
   Make no commit, and open no pull request.

   ```bash
   posts=src/marketing/changelog
   # Each released version and its day, such as "0.15.0 2026-11-12".
   released=$(grep -E '^## \[?[0-9]' CHANGELOG.md \
     | sed -E 's/^## \[?([0-9][^] ]*)\]?.* \(([0-9-]{10})\)$/\1 \2/')
   # Each version that a post lists, with the day in the name of its file.
   listed=$(for post in "$posts"/*.md; do
     [ -e "$post" ] || continue
     grep -h '^versions:' "$post" | grep -o '"[^"]*"' | tr -d '"' \
       | sed "s/\$/ $(basename "$post" .md)/"
   done)

   echo "Released versions that no post lists:"
   while read -r version day; do
     cut -d' ' -f1 <<<"$listed" | grep -qxF "$version" || echo "$version $day"
   done <<<"$released"
   echo "Versions that more than one post lists:"
   cut -d' ' -f1 <<<"$listed" | sort | uniq -d
   echo "Versions in a post of another day, or without a release:"
   comm -13 <(sort <<<"$released") <(sort <<<"$listed") | grep -v '^$'
   echo "Posts whose date is not the name of their file, in quotes:"
   for post in "$posts"/*.md; do
     [ -e "$post" ] || continue
     grep -qx "date: \"$(basename "$post" .md)\"" "$post" || echo "$post"
   done
   ```

3. For each version of that list, read its entries in `CHANGELOG.md`. The
   number after `#` in an entry is its pull request. Read the title and
   the body of each pull request, and its changed files when the body is
   unclear. An entry without a number comes from the message of a squash
   commit. The subject of that commit ends with the number of its pull
   request. If the history of the cloud computer does not hold the commit,
   ask GitHub. Use your version, numbers, and commit in place of those of
   the examples.

   ```bash
   awk -v v="0.15.0" '/^## /{p = $2 == v || index($2, "[" v "]") == 1} p' CHANGELOG.md
   gh pr view 281
   gh pr diff 281 --name-only
   git log -1 --format=%s 579ad69
   gh api 'repos/{owner}/{repo}/commits/579ad69/pulls' --jq '.[].number'
   ```

4. Write the posts. Put each version in the post of its day, the date of
   its heading. When that post exists, add the versions to its list and
   keep the list oldest first. Add the new lines to its sections. You can
   change its title and its lead, so that they name the biggest change of
   the whole day. When that post does not exist, create it. Change no
   other post.
5. Run the check of step 2 again. Each of its lists must now be empty.
   Then read each line again against the rules of this page.
6. Run the light checks below. Prettier skips Markdown, so the format
   check shows only that the run changed no other file. The site build
   reads the posts. Read its log for a warning that names a post, and
   correct the post. If a command cannot find its tools, run `npm ci`
   once, then run the command again. Do not run the complete gate, because
   CI runs it on the pull request. To see the page, run `npm run site:dev`
   and open `http://localhost:4321/changelog`.

   ```bash
   npm run format:check
   npm run site:build
   ```

7. Commit the posts on the branch of the run workspace, with the type
   `docs(changelog)`. The release notes then leave the commit out. Name
   one or two versions in the subject, such as
   `docs(changelog): add the notes for 0.16.0`. For three or more, name the
   first and the last, such as
   `docs(changelog): add the notes for 0.16.0 to 0.18.0`.
8. Push the branch. Open a pull request into `main`, with the subject of
   the commit as its title. Its description gives:
   - each version, with a link to its GitHub release, such as
     `https://github.com/Firna-AI/conductive/releases/tag/v0.16.0`
   - each line of the posts, with the numbers of its pull requests
   - each entry that the posts leave out, with a short reason
9. Never merge the pull request. A person reviews and merges it.

In the commit message and in the description, never start a line with a
commit type and a colon, such as `fix(files):`. The release flow reads
such a line in a squash commit as a change of the next release. Put a
quoted entry in a list item, in backticks.

## The routine

The routine lives in the Conductive org of the app. Each run creates a
new workspace, and it uses the agent login and the GitHub access of the
owner, as [Routine runs](../../docs/protocol/routine-runs.md) says. After
you create the routine, use Run now once, and review its pull request.

| Setting | Value |
| --- | --- |
| Name | Changelog posts |
| Repository | `Firna-AI/conductive`, the repository of this site |
| Section | Any section, such as General |
| Model | The model of the `external docs implementor` action of the `models` skill. At the time of writing, that is GPT-6.1 Sol, a Codex model, at its highest effort. |
| Trigger | Daily, at a time that the owner chooses, such as 08:00 |
| Time zone | The zone of the owner, such as Europe/London |

The prompt:

```text
Follow src/marketing/changelog-authoring.md in this repository. Write the changelog posts for each released version that no post lists yet, and open a pull request. When every version has its post, or a pull request of posts is open, stop and open no pull request. Never merge a pull request.
```

## Requirement sources

- [Names in the product](../../docs/protocol/agents-and-sessions.md#names-in-the-product)
  and [The provider](../../docs/protocol/workspaces-and-sandboxes.md#the-provider)
  give the naming rules.
- [Releases](../../docs/protocol/desktop-packages-and-updates.md#releases)
  gives the release flow that writes `CHANGELOG.md`.
- [Routines](../../docs/protocol/routines.md) gives what a routine does.
- [The changelog page](README.md#the-changelog-page) in the marketing
  README gives the place of the page in the site.
