# The phone apps

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The phone apps are the iOS app and the Android app. They show the same
screens as the phone layout of the web app. The `phone-app` folder of the
catalogue holds only the states that the phone apps have and the web app
does not have. Screens that the web app also shows, such as the Account
page, keep their place under `app`. Their parts that only the mockups
draw live in `src/components/phone/`.

- The desktop view of a `phone-app` page shows the phone app on a tablet.
  A tablet follows the phone layout or the desktop layout by its width, as
  the web app does. So a wide tablet shows the desktop layout.
- The surfaces of the system, such as the lock screen, the alert of a
  permission, and the in-app browser, follow iOS. Android draws its own
  surfaces with the same words.
- The phone apps show no pricing and no checkout. So no page of a phone
  app links to the home page or the pricing page of the site.

## Sign-in

The phone apps sign in with GitHub in the auth session of the system,
through the auth session of Expo: ASWebAuthenticationSession on iOS, and
Custom Tabs on Android. Expo app decision 8 C of 23 November 2026 chose a
GitHub sign-in in the system browser, with a one-use handoff and a
verifier. A design call of the same day chose the auth session, which
uses the system browser. The session shows GitHub over the app, and it
shares the sign-in of the system browser. It hands the sign-in back to the
app with a one-use code. The app exchanges that code, with a secret that
it made when the sign-in started, for its own sign-in. The Mac app signs
in through the default browser in the same way.

The errors of the GitHub step show in the sheet of the auth session, as
they show in the browser for the Mac app. Examples are a cancel on
GitHub, an expired sign-in, and a suspended account. A close of the sheet
returns to the start, with no error.

`phone-app/sign-in` shows the start. The phone app opens on it when
nobody is signed in. Its card is the sign-in of the app: the title, the
text, the agreement to the Terms, and Continue with GitHub.
`PhoneSignInScreen` in `src/screens/` draws the card in `SignInFrame` with
`phoneApp`. So the wordmark is no link, and the foot has no way back to
the home page. The links to Terms and Privacy stay, and they open in the
in-app browser. Its variants:

- `ask` has the alert of iOS over the start, before the auth session
  opens. iOS writes its words: “Conductive” Wants to Use
  “app.conductive.build” to Sign In, and This allows the app and website
  to share information about you. Cancel returns to the start, and
  Continue opens GitHub in the auth session. Android shows no alert.
  `SystemAlert` in `src/components/phone/` draws it, as it draws the
  permission alert of notices.
- `waiting` has the card after GitHub, while the app exchanges the code
  for its own sign-in: Signing in with a spinner, and no button. The sheet
  of GitHub covers the app until GitHub ends, so the person cannot come
  back to the app before then.
- `failed` has a handoff that the app could not finish: the one-use code
  expired after 60 seconds, the code was already used, or the exchange did
  not reach the server. A danger notice above the agreement says that the
  sign-in did not finish. Continue with GitHub starts a new sign-in. The
  errors of the GitHub step do not reach this state, because they show in
  the sheet.
- `ended` has the sign-in after the phone was signed out, with the title
  Sign in again. Its words hold for each cause: the 30 days ended, a
  refresh found a new revision of the Terms, or an operator suspended the
  account. The agreement above Continue with GitHub asks for the current
  Terms, as on every sign-in. The words name no session, because a session
  in the app is a chat with an agent.

The flow `user-flows/phone-sign-in` goes from the start, through `ask`
and `waiting`, to the workspace list of `app/shell`, where the phone is
signed in. `src/components/phone/phoneSignInCopy.ts` holds the words that
the sign-in of the app does not have, and the words of the alert of iOS.

## Update the app and offline

`phone-app/update` shows Update the app. The server refused the version of
the app, because the version is older than the minimum version. Older
copies keep working until the minimum version passes them, so the page
shows only after such a refusal, before or after a sign-in. Update opens
the page of the app in the store of the platform. The words name no store,
because each platform has its own.

`phone-app/offline` shows the page of an app that starts without a
connection, before or after a sign-in. Try again starts the app again. The
full page shows only while the app has no data to show. When the
connection drops later, the app keeps the page that it shows, and each
view shows the failure that it shows in a browser, such as a list that did
not load.

Both pages stop the app until the person acts, so each has one action.
`UpdateAppScreen` and `OfflineScreen` in `src/screens/` draw them in
`SignInFrame` with `phoneApp` and `bare`, so they have no foot. The legal
pages cannot open without a connection. `src/components/phone/appStopCopy.ts`
holds their words.

## Notices

A notice goes to a phone only when work waits for a person, which is an
approval, a secret request, or a question from the agent, and when a turn
that the member started finishes or fails, from Expo app decision 2 A of
23 November 2026. A notice shows only the workspace name and the kind of
event, from decision 3 A. The web app and the Mac app get no push
notices, from decision 1 F.

`phone-app/notices` shows the ask of the app. The app asks once, after
the member sends the first message of a turn in the phone app, because a
notice first helps then. The ask lies over the workspace: a sheet on a
phone, and a dialog in the desktop layout of a tablet. It says what the
notices are for, and that a notice shows the workspace name, not the
chat. Not now closes the ask. Turn on notices opens the alert of the
system. `PhoneNoticesScreen` in `src/screens/` draws the workspace screen
with the ask in its `overlay` prop. So the `overlay` control of the
workspace offers no state that the web app never shows.

`phone-app/notices/system` shows the alert of the system over the whole
screen: “Conductive” Would Like to Send You Notifications, the fixed line
of the system, Don’t Allow, and Allow. Both answers show the running turn
again. Its `preferences` variant has the same alert over Preferences,
after Turn on notices in the Notices section. Allow there turns the
notices on, and Don’t Allow leaves them off in the settings of the device.

`phone-app/notices/denied` shows the Preferences tab of the Account page
of the phone app after Don’t Allow. The system then keeps the notices off,
and the app cannot ask again. The Notices section comes first in the tab:
what the notices are for, the state Off, the line that the notices are
off in the settings of this device, and Open device settings. Its
variants:

- `not-now` has the section after Not now: Off and Turn on notices. The
  system has not asked yet, so Turn on notices opens its alert, as the
  `preferences` variant of `phone-app/notices/system` shows.
- `on` has the notices on: On, the line that the settings of this device
  change them, and Open device settings.

The words say "device", because a tablet shows the same section. The
Account page draws the section only when its state has `notices`, so the
pages of the web app and of the Mac app show no Notices section.
`NoticeAsk`, `SystemAlert`, and `NoticesSection` in
`src/components/phone/` draw the parts, and `noticeCopy.ts` beside them
holds their words.

## The lock screen

`phone-app/lock-screen` shows the lock screen of the phone of Cal: the
date, the time, and one notice for each event that sends one, newest
first. Each notice shows the app icon, the app name, and the age, as the
system draws them. Then it shows the workspace name as its title and the
kind of event as its text. A workspace with no name yet shows Untitled,
from `nameLabel`. The text of each kind:

| Event | Text |
| --- | --- |
| An agent asks to run a command on the Mac of the member | Needs approval |
| An agent asks for a secret | Needs a secret |
| An agent asks a question | Needs an answer |
| A turn that the member started finishes | Turn finished |
| A turn that the member started fails | Turn failed |

The three waits share "Needs", as the list mark says Needs input. A
notice names no session, no command, no secret, and no agent text. The
desktop view shows the lock screen of a tablet in landscape, with the
time on the left and the notices on the right.

A press on a notice opens its workspace. The notice of the secret request
opens `app/secret-requests`, where the phone can answer the request. A
notice of an approval opens the workspace too. Only the Mac app can allow
a command on the Mac, so the phone shows the command that waits without
its choices, as `app/mac-commands` shows.

The flow `user-flows/open-a-notice` goes from the notice of the secret
request on the lock screen to the request above the composer in
`app/secret-requests`. `PhoneLockScreen` in `src/screens/` draws the page
with `LockScreen` in `src/components/phone/`, and
`src/fixtures/phoneNotices.ts` holds the notices and the time.

## The in-app browser

The phone apps open previews and the desktop stream in the in-app browser
of the system, from a design call of the Expo app plan of 23 November
2026, as the Mac app opens previews in the default browser. Each open
gets its own one-use grant of 60 seconds, so code in a preview never runs
with the session of the app. The top bar of the browser holds Done, the
host of the page with the lock of a secure page, and Reload. A phone puts
Back, Forward, Share, and Open in browser in a bar at the bottom, and a
tablet puts them in the top bar. Done closes the browser and shows the
app again.

`phone-app/browser` shows port 3000 of Checkout address autocomplete in
the in-app browser, on its own random host of the preview domain,
`conductive.page`. Its child pages:

- `tool` has the Preview tool of the phone app. It lists the services,
  the servers, and the Other port row, as the web app does. It shows no
  page in a frame, no tabs of open previews, and no "+". A press on a
  port opens the in-app browser. The desktop layout of a tablet has no
  Preview tab in its centre row. The web app keeps its frame and its
  tabs, as `app/tools/preview` shows.
- `opening` has the page of the authorizer, on
  `authorize.conductive.page`, while a preview opens, as
  `app/tools/preview-opening` draws it. Its `failed` variant has a preview
  that did not open: its grant was older than 60 seconds or already used,
  the preview closed, or the cloud computer stopped.
- `desktop` has the desktop stream on a dark page. The app hides Desktop
  from every user while its stream is not reliable, as `app/tools/desktop`
  says, so this page keeps a design for the return of Desktop. Today the
  stream has an address of the provider of the cloud computer, which no
  screen names. So the host in the bar stands for an address of the app on
  the preview domain.

`InAppBrowserScreen` in `src/screens/` draws the pages with
`InAppBrowser` in `src/components/phone/`, and `browserCopy.ts` beside it
holds the words of its bars. `PreviewOpensAt` in
`src/components/tools/previewLink.tsx` sets the page that a port of the
Preview tool opens. The web app keeps the Preview tab, and the tool of the
phone app opens the in-app browser.
