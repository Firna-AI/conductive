# Marketing pictures

This folder holds the product pictures of the
[marketing site](../README.md). Each product picture is a still image of a
real screen of the mockups.

## The picture list

One list defines every picture:
[`marketingPictureList.ts`](../../../docs/mockups/src/screens/marketingPictureList.ts),
beside the marketing mockup. The marketing mockup, the site, and the
capture command all read it, so no copy of a picture can go stale. The
list imports nothing, so the browser, the Worker, and Node can all import
it. For each picture, it gives:

- the key, such as `hero`, in the order of the home page
- the label in each layout, which is the alt text on the site and the
  label in the mockups
- the screen of each layout: 1440 × 900 on desktop, or 390 × 800 on a
  phone
- the crop of each layout: the part of the screen that the picture shows,
  in CSS px of the screen
- the scale at which the page shows the crop in each layout
- the frame: a window that becomes a phone in the phone layout, a quiet
  excerpt, or a phone
- the files: one file for each layout, or one file that both layouts share
- the capture page and the file name of each capture

[`components/PictureFrame.astro`](../components/PictureFrame.astro) reads
each picture from the list by its key and layout.
[`picture-urls.ts`](../picture-urls.ts) reads the files with one glob keyed
by the list. So the site keeps no label, size, or scale of its own.
[`marketingPictures.tsx`](../../../docs/mockups/src/screens/marketingPictures.tsx)
chooses the screen and the state that each picture shows.

## The files

Each picture has a file for each layout and each colour scheme, in this
folder, `src/marketing/pictures/`, as `<picture>-<layout>-<scheme>.webp`.
The phone picture shows the same phone screen in both layouts. So it has
one file for each scheme, `phone-<scheme>.webp`, which both layouts share.
That gives 13 captures and 26 files, and each file keeps its name on each
run.

## Capture the pictures

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
command freezes animations at the same phase on each run. It uses the
direct development dependency `sharp` to write lossless WebP files in this
folder, so each pixel stays as the mockup draws it. The command stops its
server and browser and removes its temporary files on success, failure, or
interruption.

## Key code

The [key code of the marketing site](../README.md#key-code) lists the
picture list, the capture command and its parts, and their tests, with
the other entry points of the site.
