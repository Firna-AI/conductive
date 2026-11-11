import { productName } from '../../docs/mockups/src/brand.ts'
import { productSummary } from '../../src/marketing/features.ts'

type PreviewAssets = {
  background: Buffer
  lockup: Buffer
  font: Buffer
  workspace: Buffer
}

function dataUrl(type: string, bytes: Buffer): string {
  return `data:${type};base64,${bytes.toString('base64')}`
}

function escapeText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function previewDocument(assets: PreviewAssets): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeText(productName)} link preview</title>
    <style>
      @font-face {
        font-family: Inter;
        src: url('${dataUrl('font/woff2', assets.font)}') format('woff2');
        font-weight: 100 900;
      }

      html,
      body {
        margin: 0;
      }

      #stage {
        position: relative;
        width: 1200px;
        height: 630px;
        overflow: hidden;
        color: #0b0c0e;
        background: #e3f2fb;
        font-family: Inter, sans-serif;
      }

      .backdrop {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: left top;
      }

      .lockup {
        position: absolute;
        left: 64px;
        top: 36px;
        width: 244px;
        height: auto;
      }

      .headline {
        position: absolute;
        top: 128px;
        left: 64px;
        right: 64px;
        margin: 0;
        text-align: center;
        text-wrap: balance;
        font-size: 64px;
        font-weight: 650;
        line-height: 1.06;
        letter-spacing: -2.5px;
      }

      .window {
        position: absolute;
        box-sizing: border-box;
        left: 64px;
        top: 310px;
        width: 1072px;
        overflow: hidden;
        border: 1px solid #404247;
        border-radius: 10px;
        background: #0b0c0e;
        box-shadow:
          0 24px 56px -12px #04131b66,
          0 6px 18px #04131b40;
      }

      .hero {
        display: block;
        width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div id="stage">
      <img class="backdrop" src="${dataUrl('image/png', assets.background)}" alt="" />
      <img class="lockup" src="${dataUrl('image/svg+xml', assets.lockup)}" alt="${escapeText(productName)}" />
      <p class="headline">${escapeText(productSummary.heroTitle)}</p>
      <div class="window">
        <img class="hero" src="${dataUrl('image/png', assets.workspace)}" alt="${escapeText(productName)} workspace" />
      </div>
    </div>
  </body>
</html>`
}
