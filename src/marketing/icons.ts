import { html, type Html } from './html'

function path(d: string): Html {
  return html`<path d="${d}"></path>`
}

function circle(cx: number, cy: number, r: number): Html {
  return html`<circle cx="${cx}" cy="${cy}" r="${r}"></circle>`
}

function rect(x: number, y: number, size: [number, number], rx: number): Html {
  return html`<rect
    width="${size[0]}"
    height="${size[1]}"
    x="${x}"
    y="${y}"
    rx="${rx}"
  ></rect>`
}

/**
 * The lucide icons of the site, as lucide-react 0.577.0 draws them, under
 * the ISC licence. The site runs no script, so it writes the SVG itself.
 */
const lucideIcons = {
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
} as const

export type IconName = keyof typeof lucideIcons

/** A lucide icon, hidden from assistive technology, in the text colour. */
export function icon(
  name: IconName,
  options: { size: number; strokeWidth?: number; className?: string },
): Html {
  const { size, strokeWidth = 2, className } = options
  const classes = ['lucide', `lucide-${name}`, className].filter(Boolean)
  return html`<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${size}"
    height="${size}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="${strokeWidth}"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="${classes.join(' ')}"
    aria-hidden="true"
  >
    ${lucideIcons[name]}
  </svg>`
}

/**
 * The GitHub mark, for the actions that sign in with GitHub. The path is the
 * `mark-github` icon of GitHub's Octicons, under the MIT licence, copyright
 * GitHub, Inc. It takes the colour of the text around it.
 */
export function gitHubMark(size: number): Html {
  return html`<svg
    aria-hidden="true"
    fill="currentColor"
    height="${size}"
    viewBox="0 0 16 16"
    width="${size}"
  >
    <path
      d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
    ></path>
  </svg>`
}
