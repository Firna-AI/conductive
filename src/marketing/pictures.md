# Pictures

The [marketing site README](README.md) gives the pages and how the
Worker serves them. This page gives the product pictures of the home
page and the command that captures them.

Each product picture is a still image of a real screen of the mockups.
One list defines every picture:
[`marketingPictureList.ts`](../../docs/mockups/src/screens/marketingPictureList.ts),
beside the marketing mockup. The marketing mockup, the site, and the
capture command all read it, so no copy of a picture can go stale. The
list imports nothing, so the browser, the Worker, and Node can all import
it. For each picture, it gives:

- the key, such as `hero`, in the order of the home page
- the label in each layout, which is the alt text on the site and the
  label in the mockups
- the screen of each layout: a desktop screen of 1440 × 900, or a phone
  screen of 390 × 800
- the crop of each layout: the part of the screen that the picture shows,
  in CSS px of the screen
- the scale at which the page shows the crop in each layout
- the frame: a window that becomes a phone in the phone layout, a quiet
  excerpt, or a phone
- the files: one file for each layout, or one file that both layouts share

[`marketingPictureCaptures.ts`](../../docs/mockups/src/screens/marketingPictureCaptures.ts)
beside the list gives the capture page of each picture, its captures, and
the file name of each capture. It imports only the list, so Node can
import it too.

`components/PictureFrame.astro` reads each picture from the list by its
key and layout. `picture-urls.ts` reads the files with one glob keyed by
the list. So the site keeps no label, size, or scale of its own.
[`marketingPictures.tsx`](../../docs/mockups/src/screens/marketingPictures.tsx)
chooses the screen and the state that each picture shows.

Each picture has a file for each layout and each colour scheme, in
`pictures/`, as `<picture>-<layout>-<scheme>.webp`. The phone picture and
the Mac picture each show the same screen in both layouts. So each has one
file for each scheme, such as `phone-<scheme>.webp`, which both layouts
share. That gives 14 captures and 28 files, and each file keeps its name
on each run.

When a screen of the app or a picture of the list changes, capture the
pictures again with `npm run marketing:pictures` from the repository root.
The command needs Node 24, the packages from `npm install`, and Chrome
available as `google-chrome`. It builds the current mockups and serves
them on a free local port.

Each picture has a capture page in the catalogue, at
`marketing/pictures/<picture>`. Its desktop and mobile views show the
crop of each layout at its own size, at scale 1 and without a frame, from
the top left corner of the page. For each capture and each colour scheme,
the command opens that view with the browser viewport at the size of the
screen that the picture shows, from the list. So a size that follows the
viewport, such as the height of a menu, is the same as in the app. The
command then captures a rectangle of the size of the crop from the top
left corner, and names the file from the list. So the command reads no
markup of the mockups, changes no style, and does not depend on the order
of the pictures on the page.

The command captures at two device pixels for each CSS pixel of the
screen. The site then shows each file at the scale of the list. The
command freezes each animation of the clock at the same phase on each run.
An animation that scrolling drives keeps the state of its scroll position.
The command uses the direct development dependency `sharp` to write
lossless WebP files in `pictures/`, so each pixel stays as the mockup draws
it. The command stops its server and browser and removes its temporary
files on success, failure, or interruption.
