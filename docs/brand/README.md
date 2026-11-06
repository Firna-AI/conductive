# Brand

The logo of Conducting is six white lines of code that form a C, on a
graphite tile. The ragged line ends read as code, and the rows recall the
block C of the Conductor icon. The user chose this logo as option C2.3b of
the logo exploration.

This folder holds the logo files for the web app, the mockups, the Mac app,
and the marketing site. The SVG files are the masters. The PNG and ICO
files are exports of them.

## Files

| File                                                             | Use                                                                                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `conducting-icon.svg`                                            | The master of the app icon: the macOS tile of 824 px, with its shadow, on a canvas of 1024 px.                                |
| `conducting-icon-1024.png`                                       | The master of the app icon as a PNG file of 1024 px.                                                                          |
| `conducting.iconset/`                                            | The macOS icon set, from 16 px to 1024 px. `iconutil -c icns conducting.iconset` makes `conducting.icns` on a Mac.            |
| `conducting-mark.svg`                                            | The lines alone, without the tile. The fill is `currentColor`, so the mark takes the text colour of its parent.               |
| `conducting-lockup-dark.svg`                                     | The tile and the name in light text, for dark backgrounds.                                                                    |
| `conducting-lockup-light.svg`                                    | The tile and the name in dark text, for light backgrounds.                                                                    |
| `web/favicon.svg`                                                | The favicon. Its lines sit on a 32 px grid, so it stays sharp at 16 px and at 32 px.                                          |
| `web/favicon.ico`                                                | The favicon for browsers that do not read SVG, at 16, 32, and 48 px.                                                          |
| `web/favicon-16.png`, `web/favicon-32.png`, `web/favicon-48.png` | The favicon as PNG files.                                                                                                     |
| `web/apple-touch-icon.png`                                       | The icon of 180 px for the iOS home screen. The tile fills the square, and iOS rounds the corners.                            |
| `web/icon-192.png`, `web/icon-512.png`                           | The icons of the web app manifest with the purpose `any`. They have the rounded tile.                                         |
| `web/icon-maskable-512.png`                                      | The icon of the web app manifest with the purpose `maskable`. The tile fills the square, and the lines stay in the safe zone. |

## Colours

| Part                    | Colour                 |
| ----------------------- | ---------------------- |
| The tile, top to bottom | `#2c2f35` to `#0f1114` |
| The lines               | `#eef0f3`              |
| The name on dark        | `#eef0f3`              |
| The name on light       | `#0b0c0e`              |

## Rules

- Do not redraw, recolour, or stretch the lines. Make new sizes from the
  SVG masters.
- Use the app icon or the favicon where the logo stands alone. Use
  `conducting-mark.svg` only beside the product name, in the colour of the
  text.
- Keep a clear space around a lockup of at least half the height of the
  tile.
- The lockups draw the name as outlines of Inter, weight 600, so they need
  no font. When the product name changes, make new lockups.
