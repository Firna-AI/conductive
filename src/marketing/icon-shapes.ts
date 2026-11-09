/** One shape of an icon: a path, a circle, or a rectangle. */
export type IconShape =
  | { readonly kind: 'path'; readonly d: string }
  | {
      readonly kind: 'circle'
      readonly cx: number
      readonly cy: number
      readonly r: number
    }
  | {
      readonly kind: 'rect'
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
      readonly rx: number
    }

function path(d: string): IconShape {
  return { kind: 'path', d }
}

function circle(cx: number, cy: number, r: number): IconShape {
  return { kind: 'circle', cx, cy, r }
}

function rect(
  x: number,
  y: number,
  size: [number, number],
  rx: number,
): IconShape {
  return { kind: 'rect', x, y, width: size[0], height: size[1], rx }
}

/**
 * The lucide icons of the site, as lucide-react 0.577.0 draws them, under
 * the ISC licence. The site runs no script, so it writes the SVG itself.
 */
export const lucideIcons = {
  cloud: [path('M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z')],
  users: [
    path('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'),
    path('M16 3.128a4 4 0 0 1 0 7.744'),
    path('M22 21v-2a4 4 0 0 0-3-3.87'),
    circle(9, 7, 4),
  ],
  'list-tree': [
    path('M8 5h13'),
    path('M13 12h8'),
    path('M13 19h8'),
    path('M3 10a2 2 0 0 0 2 2h3'),
    path('M3 5v12a2 2 0 0 0 2 2h3'),
  ],
  'square-plus': [rect(3, 3, [18, 18], 2), path('M8 12h8'), path('M12 8v8')],
  'panels-top-left': [
    rect(3, 3, [18, 18], 2),
    path('M3 9h18'),
    path('M9 21V9'),
  ],
  archive: [
    rect(2, 3, [20, 5], 1),
    path('M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8'),
    path('M10 12h4'),
  ],
  'circle-check': [circle(12, 12, 10), path('m9 12 2 2 4-4')],
  contrast: [circle(12, 12, 10), path('M12 18a6 6 0 0 0 0-12v12z')],
  'circle-dashed': [
    path('M10.1 2.182a10 10 0 0 1 3.8 0'),
    path('M13.9 21.818a10 10 0 0 1-3.8 0'),
    path('M17.609 3.721a10 10 0 0 1 2.69 2.7'),
    path('M2.182 13.9a10 10 0 0 1 0-3.8'),
    path('M20.279 17.609a10 10 0 0 1-2.7 2.69'),
    path('M21.818 10.1a10 10 0 0 1 0 3.8'),
    path('M3.721 6.391a10 10 0 0 1 2.7-2.69'),
    path('M6.391 20.279a10 10 0 0 1-2.69-2.7'),
  ],
  'arrow-right-left': [
    path('m16 3 4 4-4 4'),
    path('M20 7H4'),
    path('m8 21-4-4 4-4'),
    path('M4 17h16'),
  ],
  'circle-ellipsis': [
    circle(12, 12, 10),
    path('M17 12h.01'),
    path('M12 12h.01'),
    path('M7 12h.01'),
  ],
  'circle-minus': [circle(12, 12, 10), path('M8 12h8')],
  'calendar-check': [
    path('M8 2v4'),
    path('M16 2v4'),
    rect(3, 4, [18, 18], 2),
    path('M3 10h18'),
    path('m9 16 2 2 4-4'),
  ],
  'arrow-right': [path('M5 12h14'), path('m12 5 7 7-7 7')],
} as const satisfies Readonly<Record<string, readonly IconShape[]>>

export type IconName = keyof typeof lucideIcons
