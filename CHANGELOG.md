# Changelog

This is a condensed milestone history. Many intermediary builds were experiments; notes describe intent and do not imply that every behavior is fully reliable against the live Netflix site.

## 1.5.44 — Generic branding and Back label

- Replaced personal project branding with **TV Streaming Remote** / **TV Remote**.
- Changed the visible close hint to **Back closes** while preserving Escape and Browser Back key handling.

## Earlier milestones carried into this repository

- **Player overlay and controls:** added playback, episode, audio/subtitle, seeking, skip-intro, and volume actions with a remote-friendly layout and icons.
- **Virtual search keyboard:** added a QWERTY on-screen keyboard with Space, Clear, Done, Backspace, and directional navigation.
- **Search-grid navigation:** added a geometric grid navigator for search results to avoid browser-page scrolling stealing arrow-key navigation.
- **Remote-only interaction:** blocked trusted physical pointer events on Netflix's main app surface so the UI can be operated from remote/keyboard input.
- **Episode navigation:** detect the native episode list, highlight its live rows, use a two-stage select/activate flow, and attempt a guarded refresh when the watch route changes.
- **Audio and subtitles:** detect and navigate live native options when Netflix exposes them.
- **Recovery and dismissal:** added attempts to wake controls and close native menus without using Chrome's debugger or moving the physical mouse.
- **Generic extension icon:** included 16, 32, 48, and 128-pixel PNG icons.

For the actual behavior and limitations of the captured version, see the README.


## v1.5.45

- Escape on the bare Netflix browse/home page now asks the extension service worker to close the Chrome window when Netflix is its only tab (the kiosk/Playnite setup); if other tabs exist, only the Netflix tab is closed.
- Added the `tabs` and `windows` permissions required for that close behavior. Escape inside search, modals, player controls, and menus retains its existing scoped behavior.
- Static validation only; live kiosk behavior should be tested on the target machine.


## v1.5.46

- On the bare Netflix home/browse page, Backspace now closes the Netflix kiosk window only when neither a DOM element nor the extension's logical selection is focused. Escape retains its existing homepage exit behavior. Search inputs, the virtual keyboard, cards, menus, modals, and playback keep their existing Backspace handling.
- Static validation only; live kiosk behavior should be tested on the target machine.


## v1.5.47

- Added a 2-second Backspace hold detector on Netflix home/browse routes, with console logs for press, release-before-threshold, hold detection, and close response/errors.
- Removed the focus/selection restriction: a qualifying hold requests closure regardless of the focused Netflix element.
- The background worker now closes the whole Chrome window regardless of how many tabs it contains.
- Static validation only; verify the key events and close behavior in the target kiosk session.


## v1.5.48 — Key-event debug build

- Logs when the content script loads and records all keydown/keyup event key values for diagnosing Pulse-Eight/CEC Tray mappings.
- Logs Backspace hold start, early release, 2-second hold detection, and the window-close response.
- Backspace hold-exit remains enabled on Netflix browse routes and requests closing the current Chrome window.


## v1.5.49 — Back confirmation and compact search keyboard

- Removed the Backspace long-press timer. On Netflix home/browse tabs, Backspace (the Samsung remote's current mapping), Escape, or Browser Back now opens a Yes/No confirmation instead of immediately closing the Chrome window.
- The prompt defaults to **No** and can be operated with arrows + Enter/OK; Backspace/Escape dismiss it. More Info modals, search input/keyboard, menus, and the player retain priority and do not invoke the close prompt.
- Confirming **Yes** asks the extension service worker to close the current Chrome window, returning to the launcher/Playnite in the kiosk setup.
- Reduced virtual search keyboard height by shrinking vertical padding, preview area, row gaps, and key height.
- Removed the previous 2-second Backspace hold detector and per-key debug spam. Static validation only; test on the target Netflix session.


## v1.5.50 — Pulse-Eight Clear-key mapping

- Treats the reported remote event `key: "Clear"`, `keyCode: 12` as the homepage Back action, alongside standard Backspace.
- On Netflix `/`, `/browse`, and `/browse/*`, the key opens the Yes/No close-browser confirmation when the user is not in the More Info modal, search input/virtual keyboard, or player.
- The close flow has no long-press timer. Startup logs explicitly identify v1.5.50 and key logs report the incoming Back/Clear event plus repeat state.
- Static validation only; live test with the target CEC key mapping is required.


## v1.5.51
- Unified Escape, BrowserBack, Backspace, and Clear key detection on the bare Netflix home/browse page.
- Moved the browse exit prompt earlier in key routing, after search/player/modal handlers, so page focus or an anchor target does not prevent the prompt.
- No hold detection or timer.


## 1.5.52
- Treat Escape, Backspace, BrowserBack, and Pulse-Eight Clear (`keyCode: 12`) as the same Back action across the extension, not only on the browse page.
- Preserve context-specific behavior in search, player controls, native audio/episode menus, and modal handling.
- No hold detection.

## v1.5.53
- Removed the background service worker browse-route restriction from the confirmed close action. After the user selects Yes, the extension may close its current Chrome window from any Netflix route, including dialogs/player routes.
- Still validates that the request originates from `https://www.netflix.com`; the close is only requested after explicit confirmation.


## v1.5.54
- Added dedicated Netflix “Who’s watching?” profile-picker navigation using profile tile and Manage Profiles buttons.
- Directional keys enter and move focus among profile tiles, Add Profile, and Manage Profiles; Enter/OK activates the focused option.
- No hold detection added; existing back-key and close-confirmation behavior retained.


## v1.5.55
- Added a dedicated handler for Netflix profile picker tiles using `data-uia="profile-selector"`.
- Arrow navigation moves across profile tiles; Down reaches Manage Profiles when present; Up returns to the nearest profile.
- Enter/OK activates the focused profile or action.
- Added console diagnostics for profile-picker navigation.


## v1.5.56

- Hide **Episodes**, **Previous Episode**, and **Next Episode** together when the current title is detected as non-episodic.
- Preserve all three controls for episodic titles.
