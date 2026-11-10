import type { ParityFeature } from '../model'

export const appsAndDevicesFeatures: readonly ParityFeature[] = [
  {
    id: 'mac-app',
    area: 'apps-and-devices',
    name: 'Mac app',
    status: 'available',
    note: 'Mac downloads support Apple silicon and Intel. Join the waitlist and open private port previews in the Mac app.',
  },
  {
    id: 'app-updates',
    area: 'apps-and-devices',
    name: 'App updates',
    status: 'available',
    note: 'Release builds update automatically. Install a release manually to move from an alpha build.',
  },
  {
    id: 'ios-app',
    area: 'apps-and-devices',
    name: 'iOS app',
    status: 'different',
    note: 'Use Conductive in your phone browser for chat, files, the terminal, previews, and pull request status.',
  },
  {
    id: 'notifications',
    area: 'apps-and-devices',
    name: 'Notifications',
    status: 'considering',
    note: 'Agent completion and question notifications are under consideration. The Mac app already notifies you about Mac command requests.',
  },
  {
    id: 'completion-sounds',
    area: 'apps-and-devices',
    name: 'Completion sounds',
    status: 'considering',
    note: 'Completion sounds are under consideration.',
  },
  {
    id: 'help-and-feedback',
    area: 'apps-and-devices',
    name: 'Help and feedback',
    status: 'considering',
    note: 'An in app feedback form is under consideration. Contact details are on the Terms and Privacy pages.',
  },
  {
    id: 'product-documentation',
    area: 'apps-and-devices',
    name: 'Product documentation',
    status: 'available',
    note: 'Public guides cover getting started, workspaces, chat, files, port previews, and the Mac app.',
  },
  {
    id: 'product-changelog',
    area: 'apps-and-devices',
    name: 'Product changelog',
    status: 'considering',
    note: 'A public website changelog is under consideration. GitHub releases already list changes.',
  },
  {
    id: 'web-account-pages',
    area: 'apps-and-devices',
    name: 'Web account pages',
    status: 'available',
    note: 'Users with app access get the full browser app. Other signed-in users see the waitlist.',
  },
]
