import { defineScreen } from '@mokly/mokly'
import { ArchiveScreen, archiveSchema } from '../../../../screens/ArchiveScreen'

export const archivePending = defineScreen({
  title: 'Unresolved cloud computer',
  description:
    'Checkout address autocomplete, archived on 5 November, as it shows while an unresolved create request, or a delete that tries again, can still hold a cloud computer that the workspace does not name. That happens, for example, when Archive ends a first start before the app learns which cloud computer the start made, or while the delete of the cloud computer of a failed first start tries again. The bar does not say that the cloud computer is deleted. It promises only the chat history, and it gives the day when the workspace leaves the list, 19 November. The workspace names no cloud computer to bring back, so the bar offers no Restore. The panel of the files promises the chat history too. Until 19 November the row stays in the open Archived group, without Restore, and the palette offers no Restore workspace.',
  rationale:
    'The user chose option B of the follow-up on archived computer certainty: the app reports what it knows of the cloud computer apart from Restore, so a Restore that is not available never reads as a delete. The words of app/archive/no-computer, which say that the cloud computer is deleted, need a confirmed delete, and the open request can still hold this cloud computer. The bar promises only the chat history, as a refused start and the archived bar of a suspended org do, because the files may not come back. Restore needs a cloud computer that the workspace names, so the app refuses Restore here. When the 14 days end while the request is still open, the bar says that the cloud computer is being deleted, as the deleting variant of app/archive/removed shows.',
  relatedDocs: [],
  propSchema: archiveSchema,
  props: { view: 'pending' },
  render: (props, context) => (
    <ArchiveScreen state={props} viewport={context.viewport} />
  ),
})
