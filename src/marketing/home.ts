import { siteActions } from './actions'
import { features, smallerFeatures, type Feature } from './features'
import { pictureFrame } from './frames'
import { html, type Html } from './html'
import { icon } from './icons'
import type { SiteLinks } from './links'
import { pictures } from './pictures'

/** The start of a section: a label in capitals, a headline, and a sentence. */
function sectionIntro(label: string, title: string, text: string): Html {
  return html`<div class="intro">
    <span class="intro-label">${label}</span>
    <h2 class="intro-title">${title}</h2>
    <p class="intro-text">${text}</p>
  </div>`
}

function hero(links: SiteLinks): Html {
  return html`<section class="hero">
    <div class="hero-copy">
      <h1 class="hero-title">Give every coding task its own cloud computer.</h1>
      <p class="hero-text">
        Agents powered by Claude and Codex work on their own branch, in a full
        clone of your repository. You follow along and review the work from any
        browser.
      </p>
      ${siteActions(links)}
    </div>
    <div class="hero-picture">${pictureFrame(pictures.hero, 'eager')}</div>
  </section>`
}

function featureSection(feature: Feature): Html {
  const stage = feature.bleed ? 'stage stage-bleed' : 'stage'
  return html`<section class="feature">
    ${sectionIntro(feature.label, feature.title, feature.text)}
    <div class="${stage}">
      ${pictureFrame(pictures[feature.picture], 'lazy')}
    </div>
  </section>`
}

function featureGrid(): Html {
  const items = smallerFeatures.map(
    (item) =>
      html`<li class="grid-item">
        ${icon(item.icon, { size: 16, className: 'grid-icon' })}
        <h3 class="grid-title">${item.title}</h3>
        <p class="grid-text">${item.text}</p>
      </li>`,
  )
  return html`<section class="grid-section">
    ${sectionIntro('And more', 'Less to look after.', 'The app starts and stops the cloud computers for you.')}
    <ul class="grid">
      ${items}
    </ul>
  </section>`
}

function closingCall(links: SiteLinks): Html {
  return html`<section class="closing">
    <h2 class="closing-title">Try it on your next task.</h2>
    <p class="closing-text">
      Sign up with GitHub, connect your repositories, and send the first task.
    </p>
    ${siteActions(links)}
  </section>`
}

/**
 * The main content of the home page: the hero with the app, the features
 * with real screens, the smaller features, and a last call to action.
 */
export function homeContent(links: SiteLinks): Html {
  return html`<main class="main">
    ${hero(links)}
    <div class="sections" id="features">
      ${features.map(featureSection)}${featureGrid()}${closingCall(links)}
    </div>
  </main>`
}
