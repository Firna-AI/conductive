import { act } from 'react'
import { getNearestEditorFromDOMNode } from 'lexical'
import { $fieldText } from '../chat/components/chip-field/field-content'

// Finds, types into, pastes into, and reads the message field of a composer,
// which is the chip text field: an editable element with the role textbox.

/**
 * Whether the element is the editable element of a chip text field, also
 * while the field takes no change, such as during a send.
 */
export function isMessageField(element: Element): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    getNearestEditorFromDOMNode(element)?.getRootElement() === element
  )
}

/** The element as a message field. It fails when the element is none. */
export function asMessageField(element: Element): HTMLElement {
  if (!isMessageField(element)) {
    throw new Error('The element is not a message field.')
  }
  return element
}

/**
 * Commits the pending change of the field, as a browser does before the
 * next input: the editor commits each change after the event that made it.
 */
function commit(field: HTMLElement): void {
  getNearestEditorFromDOMNode(field)?.update(() => undefined, {
    discrete: true,
  })
}

/**
 * Types text into the field as a person does after they select all of it:
 * the text takes the place of the content. The field takes the focus. The
 * text has one line, as a person types it before Shift+Enter.
 */
export function typeMessage(field: HTMLElement, text: string): void {
  act(() => {
    field.focus()
    field.ownerDocument.getSelection()?.selectAllChildren(field)
    field.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: text,
        inputType: 'insertText',
      }),
    )
    commit(field)
  })
}

/**
 * Moves the focus into the field as Tab does in Chrome, with no press of
 * the pointer. When the caret of the page is outside the field, Chrome
 * first puts it at the start of the field, before the focus event. Then
 * the change that the focus makes commits.
 */
export function focusMessage(field: HTMLElement): void {
  act(() => {
    const selection = field.ownerDocument.getSelection()
    if (selection && !field.contains(selection.anchorNode)) {
      selection.collapse(field, 0)
    }
    field.focus()
    commit(field)
  })
}

/**
 * Pastes plain text into the field at its caret, as the paste event of a
 * browser gives it. The result is the event, whose `defaultPrevented` says
 * whether the field took the paste.
 */
export function pasteMessage(field: HTMLElement, text: string): Event {
  const data = new DataTransfer()
  data.setData('text/plain', text)
  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: data,
  })
  act(() => {
    field.dispatchEvent(event)
    commit(field)
  })
  return event
}

/**
 * Presses a key in the field, as the keyboard does, and commits its change.
 * The result is the event, whose `defaultPrevented` says whether the field
 * kept the key from the browser.
 */
export function pressInField(
  field: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => {
    field.dispatchEvent(event)
    commit(field)
  })
  return event
}

/**
 * The plain text that the field holds, as its draft and a send take it:
 * each chip is its link.
 */
export function messageText(field: HTMLElement): string {
  const editor = getNearestEditorFromDOMNode(field)
  if (!editor) throw new Error('The field has no editor.')
  return editor.getEditorState().read($fieldText)
}
