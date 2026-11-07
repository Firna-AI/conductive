import {
  marketingPictureKeys,
  marketingPictures,
  type MarketingPictureKey,
  type PictureFrame,
  type PictureView as SharedPictureView,
} from '../../docs/mockups/src/screens/marketingPictureList'
import { pictureFiles, type SchemeFiles } from './picture-files'

/** The phone layout of the site. The stylesheets use the same width. */
export const phoneMedia = '(max-width: 759.98px)'

type PictureView = {
  alt: string
  files: SchemeFiles
  width: number
  height: number
  scale: SharedPictureView['scale']
}

export type PictureKey = MarketingPictureKey

export type Picture = {
  key: PictureKey
  frame: PictureFrame
  desktop: PictureView
  mobile: PictureView
}

function view(definition: SharedPictureView, files: SchemeFiles): PictureView {
  return {
    alt: definition.label,
    files,
    width: definition.crop.width,
    height: definition.crop.height,
    scale: definition.scale,
  }
}

/** Bind the shared picture definitions to the site's bundled image files. */
export const pictures = Object.fromEntries(
  marketingPictureKeys.map((key): [PictureKey, Picture] => {
    const definition = marketingPictures[key]
    const files = pictureFiles[key]
    return [
      key,
      {
        key,
        frame: definition.frame,
        desktop: view(definition.desktop, files.desktop),
        mobile: view(definition.mobile, files.mobile),
      },
    ]
  }),
)
