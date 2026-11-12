import { defineCollection } from 'astro/content/config'
import { glob } from 'astro/loaders'
import { changelogFolder } from './changelog-posts'

/** The ID of an entry: its file name without `.md`. */
function idOfFile({ entry }: { entry: string }): string {
  return entry.replace(/\.md$/, '')
}

/**
 * The content of the site: the public guides of the docs and the posts of
 * the changelog. Each Markdown file at the top of `docs/` is one guide, and
 * each one at the top of `changelog/` is the post of one day. Notes for
 * authors live outside these folders, so the site never publishes them.
 * Neither collection has a schema: `docs-guides.ts` and `changelog-posts.ts`
 * read the front matter and give each missing or invalid field its default,
 * so a field never stops the build.
 *
 * The ID of an entry is its file name without `.md`, such as `get-started`
 * or `2026-11-12`. The loader would otherwise take a `slug` field of the
 * front matter as the ID, which would move a guide to another address.
 *
 * Astro loads this file by its name. The import paths are those of the
 * Astro package, not `astro:content`, because the app's typecheck also
 * reads this folder, before Astro writes the types of its virtual modules.
 */
export const collections = {
  docs: defineCollection({
    loader: glob({
      pattern: '*.md',
      base: './src/marketing/docs',
      generateId: idOfFile,
    }),
  }),
  changelog: defineCollection({
    loader: glob({
      pattern: '*.md',
      base: changelogFolder,
      generateId: idOfFile,
    }),
  }),
}
