import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri'

/** A plugin of the HTML stage of the Markdown processor of Astro. */
type HastPlugin = NonNullable<SatteriProcessorOptions['hastPlugins']>[number]

/** The name of each code block for screen readers. */
const codeName = 'Code example'

/** The name of a table whose header row has no words. */
const tableName = 'Table'

/**
 * Lets a keyboard scroll each code block and each table of a guide. A
 * long line or a wide table scrolls inside its own box, so the box takes
 * keyboard focus and has a name for screen readers. A code block becomes a
 * region named "Code example". A table keeps its role, and the words of
 * its header row name it, such as "Agent, Login, What to enter". The pages
 * run no script, so every block and table takes focus, not only those that
 * scroll at the width of the window.
 *
 * The processor runs this plugin after Prism colours the code, so it sees
 * the final `pre` of each code block. It reads and sets only properties of
 * the parsed elements.
 */
export const scrollRegions = {
  name: 'conductive-scroll-regions',
  element: {
    filter: ['pre', 'table'],
    visit(node, ctx) {
      ctx.setProperty(node, 'tabIndex', 0)
      if (node.tagName === 'pre') {
        ctx.setProperty(node, 'role', 'region')
        ctx.setProperty(node, 'ariaLabel', codeName)
        return
      }
      const words = node.children
        .flatMap((head) =>
          head.type === 'element' && head.tagName === 'thead'
            ? head.children
            : [],
        )
        .flatMap((row) =>
          row.type === 'element' && row.tagName === 'tr' ? row.children : [],
        )
        .filter((cell) => cell.type === 'element' && cell.tagName === 'th')
        .map((cell) => ctx.textContent(cell).trim())
        .filter((cellWords) => cellWords !== '')
      ctx.setProperty(node, 'ariaLabel', words.join(', ') || tableName)
    },
  },
} satisfies HastPlugin
