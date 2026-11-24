/**
 * The layers of the marks of explanations, as the CSS of `explain.module.css`
 * names them in `::highlight()`: the fill of each mark, the deeper fill
 * where marks overlap, and the deeper fill of the mark under the pointer
 * and of the mark whose popover is open. The last layer is the quote that
 * an unsent Ask keeps, in the colours of a selection. A later layer paints
 * over an earlier one.
 */
const highlightLayers = ['mark', 'overlap', 'hover', 'active', 'kept'] as const

type HighlightLayer = (typeof highlightLayers)[number]

export type LayerRanges = Partial<Record<HighlightLayer, readonly Range[]>>

const owners = new Map<object, LayerRanges>()

/** The registry of the page, when the browser draws highlights. */
function registry(): HighlightRegistry | null {
  if (typeof CSS === 'undefined' || typeof Highlight === 'undefined')
    return null
  return 'highlights' in CSS ? CSS.highlights : null
}

/** Draws each layer from the ranges of every owner. */
function draw(): void {
  const highlights = registry()
  if (!highlights) return
  highlightLayers.forEach((layer, priority) => {
    const name = `explain-${layer}`
    const ranges = [...owners.values()].flatMap((item) => item[layer] ?? [])
    if (ranges.length === 0) {
      highlights.delete(name)
      return
    }
    const highlight = new Highlight(...ranges)
    highlight.priority = priority
    highlights.set(name, highlight)
  })
}

/**
 * Sets the ranges that one owner, such as a message, draws in each layer,
 * or none. The marks draw over the text with no change of the page, so the
 * parts that React draws stay its own. A browser without highlights draws
 * no fill, and the state at the end of each mark still shows it.
 */
export function setHighlights(owner: object, ranges: LayerRanges | null) {
  if (ranges) owners.set(owner, ranges)
  else owners.delete(owner)
  draw()
}
