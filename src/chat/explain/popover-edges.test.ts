import { expect, test } from 'vitest'
import { popoverLayout } from './popover-edges'

/** A box from its left, its top, its width, and its height, in px. */
function box(left: number, top: number, width: number, height: number) {
  return { left, top, right: left + width, bottom: top + height }
}

/** The app frame of most cases, 1440 px by 900 px. */
const frame = box(0, 0, 1440, 900)

/** The app frame of a narrow window, 800 px by 600 px. */
const narrow = box(0, 0, 800, 600)

const cases = [
  {
    name: 'below the start of its mark',
    panel: box(100, 124, 400, 300),
    mark: box(100, 100, 200, 18),
    frame,
    layout: {
      block: 'bottom',
      inline: 'right',
      height: 300,
      heightRoom: 770,
      widthRoom: 1334,
      widthCap: 1334,
    },
  },
  {
    name: 'above the start of its mark',
    panel: box(100, 380, 400, 414),
    mark: box(100, 800, 200, 18),
    frame,
    layout: {
      block: 'top',
      inline: 'right',
      height: 414,
      heightRoom: 788,
      widthRoom: 1334,
      widthCap: 1334,
    },
  },
  {
    name: 'above the end of its mark, near the end of the frame',
    panel: box(900, 380, 400, 414),
    mark: box(1100, 800, 200, 18),
    frame,
    layout: {
      block: 'top',
      inline: 'left',
      height: 414,
      heightRoom: 788,
      widthRoom: 1294,
      widthCap: 1294,
    },
  },
  {
    name: 'below the end of its mark in a narrow window',
    panel: box(160, 124, 400, 300),
    mark: box(500, 100, 60, 18),
    frame: narrow,
    layout: {
      block: 'bottom',
      inline: 'left',
      height: 300,
      heightRoom: 470,
      widthRoom: 554,
      widthCap: 554,
    },
  },
  {
    // The same mark leaves only 294 px from its start to the end of the
    // frame, so a wider panel would no longer fit on this side.
    name: 'below the start of the same mark in a narrow window',
    panel: box(500, 124, 290, 300),
    mark: box(500, 100, 60, 18),
    frame: narrow,
    layout: {
      block: 'bottom',
      inline: 'right',
      height: 300,
      heightRoom: 470,
      widthRoom: 294,
      widthCap: 554,
    },
  },
  {
    name: 'below a mark that covers the whole width of the frame',
    panel: box(0, 146, 400, 300),
    mark: box(0, 100, 800, 40),
    frame: narrow,
    layout: {
      block: 'bottom',
      inline: 'right',
      height: 300,
      heightRoom: 448,
      widthRoom: 788,
      widthCap: 788,
    },
  },
  {
    name: 'with no shown mark, at the top right of the frame',
    panel: box(1024, 70, 400, 420),
    mark: null,
    frame,
    layout: {
      block: 'bottom',
      inline: 'left',
      height: 420,
      heightRoom: 818,
      widthRoom: 1418,
      widthCap: 1418,
    },
  },
]

test.each(cases)(
  'the free edges and the rooms of a panel $name',
  ({ panel, mark, frame, layout }) => {
    expect(popoverLayout(panel, mark, frame)).toEqual(layout)
  },
)
