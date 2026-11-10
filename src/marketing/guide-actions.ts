import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri'

/** A plugin of the HTML stage of the Markdown processor of Astro. */
type HastPlugin = NonNullable<SatteriProcessorOptions['hastPlugins']>[number]

/** The class of a guide action. The stylesheet of the docs styles it. */
const guideActionClass = 'guide-action'

/**
 * Marks each guide action of a guide: a link that is the only content of
 * its list item, such as "Read the Overview". On a phone the stylesheet
 * gives that link a touch target of 44px on a line of its own. A loose
 * list puts the content of an item in a paragraph, so the link can also be
 * the only content of that paragraph. Spaces between the parts do not
 * count. A link beside other words stays an ordinary link of the text. The
 * link keeps the classes that it has.
 */
export const guideActions = {
  name: 'conductive-guide-actions',
  element: {
    filter: ['li'],
    visit(node, ctx) {
      /** The children of an element, without the spaces between them. */
      const content = (element: typeof node) =>
        element.children.filter(
          (child) => child.type !== 'text' || child.value.trim() !== '',
        )
      const parts = content(node)
      const [first] = parts
      const inner =
        parts.length === 1 && first.type === 'element' && first.tagName === 'p'
          ? content(first)
          : parts
      const [link] = inner
      if (inner.length !== 1 || link.type !== 'element' || link.tagName !== 'a')
        return
      const classes = link.properties.className
      ctx.setProperty(link, 'className', [
        ...(Array.isArray(classes) ? classes : []),
        guideActionClass,
      ])
    },
  },
} satisfies HastPlugin
