// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest'
import { attachmentUploadUrl } from '../shared/messages'
import { createLiveServices } from './live-services'
import {
  windowInput,
  windowKeys,
  windowLayoutModifiers,
  type KeyPress,
} from './services'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('windowInput', () => {
  test('hears each input on the page, also one that an element stops, until its cleanup', () => {
    const field = document.createElement('input')
    document.body.append(field)
    const events = [
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
      new InputEvent('beforeinput', { data: 'a', bubbles: true }),
      new PointerEvent('pointerdown', { bubbles: true }),
      new WheelEvent('wheel', { deltaY: 40, bubbles: true }),
    ]
    // A field of the app stops its events, as a text field does with keys.
    for (const event of events) {
      field.addEventListener(event.type, (stopped) => stopped.stopPropagation())
    }
    const heard: string[] = []
    let sent = ''
    const stop = windowInput(window)(() => heard.push(sent))
    for (const event of events) {
      sent = event.type
      field.dispatchEvent(event)
    }
    stop()
    sent = 'after the cleanup'
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', bubbles: true }),
    )
    field.remove()
    expect(heard).toEqual(['keydown', 'beforeinput', 'pointerdown', 'wheel'])
  })
})

test('window keys hold a layout modifier until its own keyup or blur and share it with the recorder', () => {
  const heard: KeyPress['layoutModifiers'][] = []
  const hear = (press: KeyPress) => {
    if (press.code === 'Digit1') heard.push(press.layoutModifiers)
  }
  let stop = windowKeys(window)(hear)
  const send = (type: string, key: string, code: string) =>
    window.dispatchEvent(new KeyboardEvent(type, { key, code }))
  const digit = () => send('keydown', '1', 'Digit1')
  try {
    send('keydown', 'GroupNext', 'ShiftLeft')
    digit()
    const recorder = windowKeys(window).layoutModifiers()
    stop()
    stop = windowKeys(window)(hear)
    digit()
    send('keyup', 'Alt', 'AltLeft')
    digit()
    send('keyup', 'Shift', 'ShiftLeft')
    digit()
    send('keydown', 'GroupNext', 'ShiftLeft')
    window.dispatchEvent(new Event('blur'))
    digit()
    expect
      .soft(heard)
      .toEqual([['shiftKey'], ['shiftKey'], ['shiftKey'], null, null])
    expect.soft(recorder).toEqual(['shiftKey'])
    const codes = [
      ['ShiftRight', 'shiftKey'],
      ['AltLeft', 'altKey'],
      ['AltRight', 'altKey'],
      ['ControlLeft', 'ctrlKey'],
      ['ControlRight', 'ctrlKey'],
      ['MetaLeft', 'metaKey'],
      ['MetaRight', 'metaKey'],
      ['CapsLock', null],
    ] as const
    for (const group of [
      'GroupNext',
      'GroupPrevious',
      'GroupFirst',
      'GroupLast',
    ]) {
      for (const [code, modifier] of codes) {
        send('keydown', group, code)
        expect
          .soft(windowLayoutModifiers(window), `${group} ${code}`)
          .toEqual(modifier === null ? [] : [modifier])
        send('keyup', 'changed key', code)
        expect(windowLayoutModifiers(window)).toBeNull()
      }
    }
  } finally {
    window.dispatchEvent(new Event('blur'))
    stop()
  }
})

describe('createLiveServices', () => {
  test('uploads a raw file on the page origin with the cookie and measured progress through native XHR', async () => {
    const fetched = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(Response.json({ id: 'upload-1' }))
    const opened: [string, string][] = []
    const sent: Blob[] = []
    const seen: { credentials: boolean; headers: [string, string][] }[] = []
    class Upload {
      withCredentials = false
      readonly status = 201
      readonly responseText = '{"id":"upload-1"}'
      readonly headers: [string, string][] = []
      readonly upload = new EventTarget()
      private load: () => void = () => {}
      open(method: string, url: string) {
        opened.push([method, url])
      }
      setRequestHeader(name: string, value: string) {
        this.headers.push([name, value])
      }
      addEventListener(type: string, listener: () => void) {
        if (type === 'load') this.load = listener
      }
      send(body: Blob) {
        sent.push(body)
        seen.push({ credentials: this.withCredentials, headers: this.headers })
        this.upload.dispatchEvent(new ProgressEvent('progress', { loaded: 2 }))
        this.load()
      }
      abort() {}
    }
    vi.stubGlobal('XMLHttpRequest', Upload)
    const file = new File(['png'], 'overlap.png', { type: 'image/png' })
    const path = attachmentUploadUrl(
      'org-one',
      { type: 'workspace', workspaceId: 'workspace-one' },
      { name: file.name, mediaType: file.type },
    )
    const progress: number[] = []
    const services = createLiveServices(window)
    await expect(
      services.api.sendFile(path, file, (body) => body, {
        progress: (sentBytes) => progress.push(sentBytes),
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ id: 'upload-1' })
    expect({ opened, seen, progress }).toEqual({
      opened: [['POST', path]],
      seen: [
        {
          credentials: true,
          headers: [['Content-Type', 'application/octet-stream']],
        },
      ],
      progress: [2],
    })
    expect(sent).toHaveLength(1)
    expect(sent[0]).toBe(file)
    expect(fetched).not.toHaveBeenCalled()
  })
})
