import { previewDocument } from './preview-blocks'

/*
 * The module worker of the Markdown view. It parses the text that the view
 * posts with the shared parser, through the preview adapter, and posts the
 * document back. So a long or crafted file never blocks the page while it
 * parses. The view starts one worker for each text, and ends it after the
 * reply.
 */
addEventListener('message', (event: MessageEvent<unknown>) => {
  if (typeof event.data === 'string') postMessage(previewDocument(event.data))
})
