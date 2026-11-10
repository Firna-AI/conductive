import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { satteri } from '@astrojs/markdown-satteri'
import type { AstroIntegration } from 'astro'
import { defineConfig } from 'astro/config'
import type { Plugin } from 'vite'
import { productDomain } from './docs/mockups/src/brand'
import { guideActions } from './src/marketing/guide-actions'
import { picturesCss } from './src/marketing/picture-styles'
import { scrollRegions } from './src/marketing/scroll-regions'
import { tokensCss } from './src/marketing/tokens'
import {
  SITE_FILE_LIST,
  SITE_FOLDER,
  type SiteFile,
  type SiteFileList,
} from './src/shared/site-build'

/** The source folder of the site, with its pages, layouts, and parts. */
const siteSource = './src/marketing/'

/**
 * The font of the site, from the mockups, as a path from the root of the
 * repository. The build gives it an address under the site folder.
 */
const fontPath = '/docs/mockups/src/fonts/InterVariable.woff2'

/**
 * The CSS that code generates, as virtual modules that the layout imports.
 * So it joins the bundled styles, which each page carries inline.
 */
const generatedStyles = new Map<string, () => string>([
  [
    'virtual:site-tokens.css',
    () =>
      `@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url('${fontPath}') format('woff2')}\n${tokensCss()}`,
  ],
  ['virtual:site-pictures.css', picturesCss],
])

function generatedStylesPlugin(): Plugin {
  return {
    name: 'conductive-site-generated-styles',
    resolveId(id) {
      return generatedStyles.has(id) ? `\0${id}` : undefined
    },
    load(id) {
      if (!id.startsWith('\0')) return undefined
      return generatedStyles.get(id.slice(1))?.()
    },
  }
}

/**
 * The pages name the brand icons under the site folder, where the Worker
 * serves them. The Astro development server serves the brand folder at
 * `/`, so it maps each address under the site folder there.
 */
function siteFolderInDevelopmentPlugin(): Plugin {
  const prefix = `/${SITE_FOLDER}/`
  return {
    name: 'conductive-site-folder-in-development',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url?.startsWith(prefix)) {
          request.url = request.url.slice(prefix.length - 1)
        }
        next()
      })
    },
  }
}

/**
 * The SHA-256 hash, in Base64, of the content of each style element of a
 * page. The browser reads each line break of a page as one line feed, so
 * the hash does too.
 */
function styleHashes(page: string): string[] {
  return [...page.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(
    ([, css]) =>
      createHash('sha256').update(css.replace(/\r\n?/g, '\n')).digest('base64'),
  )
}

/** Every file of the built site except the file list, sorted by path. */
async function builtFiles(folder: string): Promise<SiteFile[]> {
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  })
  const paths = entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(folder, join(entry.parentPath, entry.name)).split(sep).join('/'),
    )
    .filter((path) => path !== SITE_FILE_LIST)
    .sort()
  return Promise.all(
    paths.map(async (path) => {
      if (!path.endsWith('.html')) return { path }
      const page = await readFile(join(folder, path), 'utf8')
      return { path, styleHashes: styleHashes(page) }
    }),
  )
}

/**
 * Writes the file list after each build. The Worker needs it, because the
 * static assets binding answers a missing file with the app's page. It
 * reads the final files, so each hash matches what the browser gets.
 */
function siteFileList(): AstroIntegration {
  return {
    name: 'conductive-site-file-list',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const folder = fileURLToPath(dir)
        const list: SiteFileList = { files: await builtFiles(folder) }
        await writeFile(
          join(folder, SITE_FILE_LIST),
          `${JSON.stringify(list, null, 2)}\n`,
        )
        logger.info(`${SITE_FILE_LIST} lists ${list.files.length} files.`)
      },
    },
  }
}

/**
 * The marketing site. Astro builds each page into an HTML file in
 * `public/_site/`, which the Worker's static assets hold. Every other file
 * loads from `/_site/`. The public folder is the brand folder, so the
 * favicons keep fixed addresses.
 *
 * The guides of the docs are Markdown. Prism gives each token of their
 * code a class, and the stylesheet of the docs colours the classes, so the
 * policy of the pages needs no other style. One plugin lets a keyboard
 * scroll each code block and table. The other marks each guide action, a
 * link that is the only content of its list item.
 */
export default defineConfig({
  site: `https://${productDomain}`,
  srcDir: siteSource,
  publicDir: './docs/brand/web',
  outDir: `./public/${SITE_FOLDER}`,
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    assetsPrefix: `/${SITE_FOLDER}`,
  },
  vite: {
    build: {
      // No file becomes a data: address. The policy allows site files only.
      assetsInlineLimit: 0,
      // The browsers of the app, which Vite targets by default. Astro
      // targets only the newest browsers, so the CSS would lose prefixes.
      target: 'baseline-widely-available',
    },
    plugins: [generatedStylesPlugin(), siteFolderInDevelopmentPlugin()],
  },
  markdown: {
    syntaxHighlight: 'prism',
    processor: satteri({ hastPlugins: [scrollRegions, guideActions] }),
  },
  integrations: [siteFileList()],
})
