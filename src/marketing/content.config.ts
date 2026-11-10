import { defineCollection } from 'astro/content/config'
import { glob } from 'astro/loaders'

/**
 * The content of the site: the public guides of the docs. Each Markdown
 * file at the top of `docs/` is one guide. Notes for authors live outside
 * that folder, so the site never publishes them. The collection has no
 * schema: `docs-guides.ts` reads the front matter and gives each missing or
 * invalid field its default, so a field never stops the build.
 *
 * The ID of a guide is its file name without `.md`, such as `get-started`.
 * The loader would otherwise take a `slug` field of the front matter as the
 * ID, which would move the guide to another address.
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
      generateId: ({ entry }) => entry.replace(/\.md$/, ''),
    }),
  }),
}
