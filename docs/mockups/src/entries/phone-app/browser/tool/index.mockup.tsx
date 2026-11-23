import { defineScreen } from '@mokly/mokly'
import { PreviewOpensAt } from '../../../../components/tools/previewLink'
import { phonePaths } from '../../../../phonePaths'
import { servicesWorkspace } from '../../../../screens/servicesWorkspace'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import { workspaceStateSchema } from '../../../../screens/workspaceState'

export const phoneBrowserTool = defineScreen({
  title: 'Preview tool',
  description:
    'The Preview tool of the phone app lists the services, then the servers that no service runs, then the Other port row, as the web app lists them. It shows no page in a frame, no tabs of open previews, and no "+". A press on a port of a service or of a server opens its preview in the in-app browser, as phone-app/browser shows. The desktop layout of a tablet lists the same rows in the tools panel, and the centre row has no Preview tab. The web app keeps its frame and its tabs, as app/tools/preview shows.',
  rationale:
    'A design call of the Expo app plan of 23 November 2026: previews open in the in-app browser with the 60-second grant, so code in a preview never runs with the app session. A frame in the phone app would run the page inside the app, so each port opens the browser. The browser keeps no page in the app, so the tool needs no tabs and no "+", and its list always shows. Each press asks the server for a new launch with its own grant.',
  relatedDocs: ['docs/mockups/phone-app.md'],
  propSchema: workspaceStateSchema,
  props: { ...servicesWorkspace, ports: 'detected', tab: 'session' },
  render: (props, context) => (
    <PreviewOpensAt to={phonePaths.browser}>
      <WorkspaceScreen state={props} viewport={context.viewport} />
    </PreviewOpensAt>
  ),
})
