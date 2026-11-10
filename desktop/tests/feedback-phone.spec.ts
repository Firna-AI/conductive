import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { routes } from '../../src/app/router.ts'
import { redPixelPng } from '../../src/app/screenshots/images.test-support.ts'
import { FEEDBACK_PATH } from '../../src/shared/feedback.ts'
import { FakeApiServer } from '../../src/test-support/fake-api.ts'
import { FAKE_IDS } from '../../src/test-support/fixtures/core.ts'
import { withBrowserEntry } from './browser-entry.js'
import { installWindowApi } from './window-shell.js'

// The page of a small phone, without the frame of the window.
const phone = { width: 375, height: 667, useContentSize: true }

const lines = [
  'The Preview tab stays blank after a restart.',
  'Steps:',
  '1. Open the workspace.',
  '2. Start the dev server.',
  '3. Open the Preview tab.',
  '4. Restart the dev server.',
  'Expected: the page shows again.',
  'Actual: the preview stays blank.',
  'A reload of the page fixes it.',
  'It happens in each browser.',
  'It started this week.',
  'The screenshots show each step.',
]

const screenshots = ['14.31.08', '14.32.05', '14.33.51'].map((time) => ({
  name: `Screenshot 2026-11-10 at ${time}.png`,
  mimeType: 'image/png',
  buffer: Buffer.from(redPixelPng()),
}))

/**
 * Turns the wheel over the lower part of the sheet, as a person swipes up
 * on it. Neither a script scroll nor the scroll of a locator click runs,
 * because either would also move the frame that clips the sheet.
 */
async function swipeUp(page: Page): Promise<void> {
  await page.mouse.move(phone.width / 2, phone.height - 120)
  await page.mouse.wheel(0, 2000)
}

/** The middle of the part of a control that the window shows. */
async function shownMiddle(control: Locator): Promise<[number, number]> {
  const box = await control.boundingBox()
  if (!box) throw new Error('The control has no box.')
  const top = Math.max(box.y, 0)
  const bottom = Math.min(box.y + box.height, phone.height)
  return [box.x + box.width / 2, (top + bottom) / 2]
}

/** Whether a press at the middle of the control reaches the control itself. */
async function takesPress(page: Page, control: Locator): Promise<boolean> {
  const [x, y] = await shownMiddle(control)
  const handle = await control.elementHandle()
  return page.evaluate(
    ([target, left, top]) =>
      target instanceof Element &&
      target.contains(document.elementFromPoint(left, top)),
    [handle, x, y] as const,
  )
}

test('on a small phone a long feedback draft that failed to send keeps Cancel and Send within a swipe, and Send sends it again', async () => {
  const server = new FakeApiServer()
  server.json('GET', FEEDBACK_PATH, { replyEmail: 'mira@example.com' })
  server.json(
    'POST',
    FEEDBACK_PATH,
    {
      error: {
        code: 'feedback_email_failed',
        message: 'The email did not go.',
      },
    },
    502,
  )
  await withBrowserEntry('feedback-phone', phone, async ({ page, origin }) => {
    await installWindowApi(page, origin, false, server)
    await page.goto(new URL(routes.org(FAKE_IDS.org), origin).href)
    expect(
      await page.evaluate(() => [window.innerWidth, window.innerHeight]),
    ).toEqual([phone.width, phone.height])
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByRole('combobox', { name: 'Search' }).fill('feedback')
    await page.keyboard.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Send feedback' })
    const message = sheet.getByRole('textbox', { name: 'Message' })
    await expect(message).toBeFocused()
    for (const [index, line] of lines.entries()) {
      if (index > 0) await page.keyboard.press('Enter')
      await page.keyboard.type(line)
    }
    await sheet.locator('input[type="file"]').setInputFiles(screenshots)
    const chips = sheet.getByRole('list', { name: 'Screenshots' })
    await expect(chips.getByRole('listitem')).toHaveCount(3)
    await expect(
      sheet.getByText('The team replies to mira@example.com.'),
    ).toBeVisible()
    const send = sheet.getByRole('button', { name: 'Send', exact: true })
    const cancel = sheet.getByRole('button', { name: 'Cancel', exact: true })
    await swipeUp(page)
    await expect(send).toBeInViewport()
    await page.mouse.click(...(await shownMiddle(send)))
    await expect(sheet.getByText("The feedback wasn't sent")).toBeVisible()
    await expect(message).toHaveText(lines.join(''))
    await expect(chips.getByRole('listitem')).toHaveCount(3)
    await swipeUp(page)
    await expect(cancel).toBeInViewport({ ratio: 1 })
    await expect(send).toBeInViewport({ ratio: 1 })
    await expect(
      sheet.getByRole('heading', { name: 'Send feedback' }),
    ).toBeInViewport({ ratio: 1 })
    expect({
      cancel: await takesPress(page, cancel),
      send: await takesPress(page, send),
    }).toEqual({ cancel: true, send: true })
    server.empty('POST', FEEDBACK_PATH)
    await page.mouse.click(...(await shownMiddle(send)))
    await expect(
      page
        .getByRole('region', { name: 'Notifications' })
        .getByText('Thanks for your feedback'),
    ).toBeVisible()
    await expect(sheet).toHaveCount(0)
    const sends = server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === FEEDBACK_PATH,
    )
    const [first, second] = await Promise.all(
      sends.map((request) => request.clone().json()),
    )
    expect({ sends: sends.length, same: second }).toEqual({
      sends: 2,
      same: first,
    })
    expect(first).toMatchObject({
      text: lines.join('\n'),
      screenshots: screenshots.map(({ buffer }) => ({
        content: buffer.toString('base64'),
      })),
    })
  })
})
