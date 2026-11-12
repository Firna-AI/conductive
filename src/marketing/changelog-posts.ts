import { readBody } from './changelog-body'
import type { ChangelogPost } from './changelog-model'
import { dayWords } from './from-conductor/dates'
import { field, text } from './front-matter'

/** The folder of the posts, from the root of the repository. */
export const changelogFolder = 'src/marketing/changelog'

/**
 * A post file as the `changelog` content collection gives it: its ID, which
 * is the name of the file without `.md`, its front matter, which can hold
 * anything, and its Markdown after the front matter.
 */
type PostFile = {
  readonly id: string
  readonly data: unknown
  readonly body?: string
}

/** Logs a problem of one post, which the post names. */
type Warn = (problem: string) => void

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/

/** Whether a text is a real day as `YYYY-MM-DD`: `2026-02-28`, not `2026-02-30`. */
function isRealDay(day: string): boolean {
  const parts = dayPattern.exec(day)
  if (!parts) return false
  const moment = new Date(0)
  moment.setUTCFullYear(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
  )
  return moment.toISOString().slice(0, 10) === day
}

/** The day in UTC of a date, or none for a date that is not valid. */
function utcDay(moment: Date): string | undefined {
  if (Number.isNaN(moment.getTime())) return undefined
  return moment.toISOString().slice(0, 10)
}

/**
 * The day of a value: text as `YYYY-MM-DD`, or a date that YAML read from a
 * day without quotes. YAML reads such a day as midnight in UTC.
 */
function dayOf(value: unknown): string | undefined {
  const day = value instanceof Date ? utcDay(value) : text(value)
  return day !== undefined && isRealDay(day) ? day : undefined
}

/** The day of a post: the date of its front matter, or else of its file name. */
function postDate(file: PostFile, warn: Warn): string | undefined {
  const written = dayOf(field(file.data, 'date'))
  if (written !== undefined) return written
  const named = dayOf(file.id)
  warn(
    named === undefined
      ? 'the date is missing or not a real day as "YYYY-MM-DD", and the file name is not one either, so the post stays off the page.'
      : `the date is missing or not a real day as "YYYY-MM-DD", so the post takes the day of its file name, ${named}.`,
  )
  return named
}

/** The versions of a post, in their order. A version that is not text stays off. */
function versionsOf(value: unknown, warn: Warn): string[] {
  if (!Array.isArray(value)) {
    warn(
      'the versions are missing or not a list, so the post shows no versions.',
    )
    return []
  }
  return value.flatMap((item: unknown) => {
    const version = text(item)
    if (version === undefined) {
      warn(
        `the version ${JSON.stringify(item) ?? String(item)} is empty or not text, so it stays off the page.`,
      )
    }
    return version === undefined ? [] : [version]
  })
}

/** A post of a known day, from its front matter and its body. */
function postOf(file: PostFile, date: string, warn: Warn): ChangelogPost {
  const title = text(field(file.data, 'title'))
  if (title === undefined) {
    warn(
      'the title is missing, empty, or not text, so the post shows its day in words.',
    )
  }
  const versions = versionsOf(field(file.data, 'versions'), warn)
  return {
    date,
    title: title ?? dayWords(date, 'long'),
    versions,
    ...readBody(file.body ?? '', warn),
  }
}

/** The order of two texts by their characters, as in ASCII. */
function compareText(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * The posts of the changelog page, newest first, from the files of the
 * `changelog` content collection, as docs/protocol/website-changelog.md
 * says. A field without a valid value takes its default, and a post without
 * a real day stays off the page. When two posts give the same day, only the
 * first in the ASCII order of their file names shows. Each such case calls
 * `warn` with a message that names the file, and none stops the build.
 */
export function changelogPosts(
  files: readonly PostFile[],
  warn: (message: string) => void,
): ChangelogPost[] {
  const fileName = (file: PostFile) => `${file.id}.md`
  const firstOfDay = new Map<string, string>()
  const posts: ChangelogPost[] = []
  const ordered = [...files].sort((a, b) =>
    compareText(fileName(a), fileName(b)),
  )
  for (const file of ordered) {
    const name = fileName(file)
    const warnOfPost: Warn = (problem) =>
      warn(`Changelog post ${name}: ${problem}`)
    const date = postDate(file, warnOfPost)
    if (date === undefined) continue
    const first = firstOfDay.get(date)
    if (first !== undefined) {
      warnOfPost(
        `${first} gives the same day, ${date}, so this post stays off the page.`,
      )
      continue
    }
    firstOfDay.set(date, name)
    posts.push(postOf(file, date, warnOfPost))
  }
  return posts.sort((a, b) => compareText(b.date, a.date))
}
