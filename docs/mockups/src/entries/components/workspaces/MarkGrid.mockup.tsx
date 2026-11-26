import { defineComponent } from '@mokly/mokly'
import {
  cells,
  MarkGrid,
  ring,
} from '../../../../../../src/ui/components/workspaces/MarkGrid'

/** A cell of the grid, row by row from the top left. */
const cellSchema = { type: 'integer', minimum: 0, maximum: 8 } as const

/** The opacity of a cell that is not lit, as the status glyph dims it. */
const faint = 0.16

/**
 * The grid of the marks, registered with Mokly. The list mark and the
 * status glyph give the look of each cell, and the app reaches both, so no
 * mockup part renders this wrapper. These pages light the cells of a shape
 * in the colour of the text and dim the rest, without the CSS of a mark.
 */
export const markGrid = defineComponent({
  slug: 'mark-grid',
  title: 'Mark grid',
  description:
    'The grid of the marks of a workspace: 3 × 3 small square cells in a 12 px box, in the colour of the text around it. The list mark and the status glyph give each cell its look. These pages light the cells of a shape and dim the rest. Its own page lights the ring, where the light of a working agent runs.',
  relatedDocs: ['docs/mockups/design-marks.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['lit'],
    properties: {
      /** The cells at full strength. The other cells are faint. */
      lit: { type: 'array', items: cellSchema },
    },
  } as const,
  props: { lit: ring },
  render: (props) => (
    <MarkGrid
      cell={(cell) => ({
        style: { opacity: props.lit.includes(cell) ? 1 : faint },
      })}
    />
  ),
  variants: [
    {
      slug: 'full',
      title: 'Full grid',
      description: 'Every cell lit, as for a finished turn with output.',
      props: { lit: cells },
    },
  ],
})
