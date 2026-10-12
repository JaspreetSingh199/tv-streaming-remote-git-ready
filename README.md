# TV Streaming Remote

A personal, experimental Chrome extension for navigating Netflix's web player from the sofa with a TV remote.

> **Personal-use project.** This is an unofficial experiment for one home setup, not an official Netflix, Samsung, or Pulse-Eight product. Netflix's interface changes frequently, so some controls may stop working when its DOM or player behavior changes.

![TV Streaming Remote icon](icons/icon128.png)

## The story

This project started with a simple living-room problem: the computer was connected to the TV, but controlling Netflix from the sofa still meant reaching for a mouse or keyboard. The goal was to make the browser experience feel closer to a TV app: directional focus, a clear on-screen selection, a remote-friendly search keyboard, and a compact set of playback controls.

The physical remote is a Samsung TV remote. A Pulse-Eight USB-CEC adapter and libCEC/CEC Tray provide the HDMI-CEC bridge and expose remote actions to the host setup as keyboard-like input. This extension runs in Chrome and interprets those key events to navigate Netflix's web interface. It does **not** talk directly to the CEC adapter or implement HDMI-CEC itself.

The codebase began as an **existing but outdated extension** and evolved through many small, test-driven experiments on the actual TV/PC setup. AI assistance was used to inspect, modify, debug, and package parts of that legacy code. This is not a greenfield implementation written entirely from scratch by AI, and inherited code has not received an independent security audit. The project is kept for personal use and learning.

## Intended setup

The details below describe the setup this extension was made for; other TVs, CEC adapters, Chrome versions, or Netflix layouts may behave differently.

| Component | Setup |
|---|---|
| Host | Windows 11 PC connected to the TV |
| Browser | Chrome / Chromium, including kiosk-style use |
| Streaming site | `https://www.netflix.com/` |
| TV | Samsung Crystal UHD TV, model `UA55UE86AFULXL` |
| Remote | Samsung TV remote |
| CEC hardware | Pulse-Eight USB-CEC Adapter |
| CEC software | libCEC 8.1.1 and CEC Tray |
| TV setting | Samsung Anynet+ (HDMI-CEC) enabled |

### Input path

```text
Samsung TV remote
        │
        ▼
Samsung TV / Anynet+ (HDMI-CEC)
        │
        ▼
Pulse-Eight USB-CEC Adapter ── USB ── host PC
        │                               │
        ▼                               ▼
    HDMI/CEC link                  libCEC / CEC Tray
                                        │
                                        ▼
                               keyboard-like input to Chrome
                                        │
                                        ▼
                              TV Streaming Remote extension
                                        │
                                        ▼
                                  Netflix web UI
```

The adapter's exact cabling and CEC routing depend on the hardware arrangement. In the original setup, the PC's primary HDMI output went to the TV, the Pulse-Eight adapter was USB-connected to the PC, and the adapter's HDMI/CEC connection was connected to a TV HDMI input. Keep the adapter/CEC configuration that already works for your system; the extension only handles browser-side input.

## Features

- Directional, remote-first navigation with a rounded white focus indicator.
- A search keyboard designed for TV use, with larger keys and a clear focus state.
- A compact player overlay with grouped playback actions and icons.
- Native Netflix episode and Audio & Subtitles menu navigation where the live player DOM exposes the required elements.
- Watch-page detection and a guarded page refresh after an episode route change, intended to recover Netflix controls after switching episodes.
- A remote-only mode that suppresses physical pointer interaction over Netflix's app surface.
- A Back/Escape action for navigating overlays and menus; on the bare Netflix browse page, Escape closes the current Netflix tab.
- A custom extension icon and generic UI branding.

These are intended behaviors, not a promise that every action works against every current Netflix layout. See [Known limitations](#known-limitations).

## Controls

The exact result depends on which part of Netflix is active. `OK` means the Samsung remote's Enter/Select key as forwarded by the host setup.

### General navigation

| Remote input | Intended action |
|---|---|
| **Up / Down / Left / Right** | Move the focus through the active navigation area |
| **OK / Enter** | Activate the highlighted item or button |
| **Back / Escape** | Close the active overlay/menu or navigate back |

**Important:** on the bare Netflix browse page, Escape is configured to close the current Netflix tab. If that is the only tab in a kiosk window, Chrome may close that window and return to the launcher. In playback, Search, and modal contexts, Back is intended to be handled by the active UI instead.

### Search keyboard

| Input / key | Action |
|---|---|
| **Arrows** | Move between keys on the on-screen keyboard |
| **OK / Enter** | Type the highlighted key, or activate the focused search result when the keyboard is not active |
| **Space** | Insert a space while the virtual keyboard is active |
| **Backspace / `⌫`** | Delete the previous character |
| **Clear** | Empty the query |
| **Done** | Submit/show search results; if the query is empty, leave Search |
| **Back / Escape** | Close the virtual keyboard and return to browsing |

On the Search results page, arrows are intended to navigate the poster grid instead of letting the document scroll arbitrarily.

### Player overlay

| Button | Action |
|---|---|
| **Back** | Return from the player overlay / navigate back in Netflix |
| **Play / Pause** | Toggle playback |
| **Episodes** | Open Netflix's native episode list when the current title supports episodes |
| **Previous Episode / Next Episode** | Try a player shortcut, then fall back to a native control or episode list |
| **Audio & Subs** | Open Netflix's native audio/subtitle options |
| **−10 sec / +10 sec** | Try Netflix's native seek controls |
| **Skip Intro** | Try the Netflix shortcut and/or its currently mounted Skip Intro control |
| **Volume − / Volume +** | Adjust the web video's volume in 10% increments |

The episode flow is intended to use two OK presses: the first selects/highlights an episode so its details can be read; the second activates it. When Netflix changes to a different `/watch/<id>` route, the extension may refresh the page after the route settles to help Netflix rebuild its player controls.

The volume buttons adjust the HTML video element's volume. They do not directly control the Samsung TV or an ARC-connected soundbar's hardware volume.

## Install locally

This is a plain Manifest V3 extension; no package manager or build step is required.

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the repository folder that contains `manifest.json`.
5. Open Netflix and test the controls with the intended CEC/keyboard input setup.

To revert to normal mouse interaction, disable this extension and reload Netflix. This extension intentionally blocks trusted physical pointer events over Netflix's main app area while enabled.

## Development and validation

The extension uses plain JavaScript, CSS, and a Manifest V3 service worker; there are no third-party runtime dependencies.

Run the built-in static checks with Node.js:

```sh
node scripts/check-extension.mjs
```

The checks cover JavaScript syntax, manifest JSON, and local files referenced by the manifest. They do **not** automate a live Netflix session. Manual testing is required because Netflix's DOM, focus management, and native menu behavior can change without notice.

## Known limitations

- Netflix is a dynamic single-page application. Its DOM attributes and playback controls can change at any time.
- On the main Browse page, Enter activation has occasionally moved the focus to the row above rather than opening the selected title. Search-grid activation has behaved better in testing; the Browse issue is not considered conclusively fixed in this version.
- Native Episodes and Audio & Subtitles menus can remain open or fail to dismiss consistently.
- After an episode switch, player controls do not always mount or wake reliably. The guarded refresh is a workaround, not a guarantee.
- Previous/Next Episode shortcuts are experimental and may not be recognized by Netflix; fallbacks depend on the native controls being mounted.
- Seek, Skip Intro, and menu selection depend on Netflix exposing a usable control. Synthetic page events are not the same as trusted physical input, and Netflix may ignore them.
- Remote-only pointer blocking makes physical mouse interaction with Netflix unavailable while the extension is enabled. Disable the extension to restore normal pointer use.
- Escape on the bare Browse page closes the active Netflix tab. Use care if you have unsaved state or other work in that tab.

## Privacy and permissions

- The content script is configured to run on `https://www.netflix.com/*` only.
- The manifest does not request the Chrome debugger permission and the implementation does not attach through Chrome DevTools Protocol.
- The code in this repository contains no analytics or telemetry uploader. It uses Netflix's page DOM and browser-local state for navigation, capability detection, and recovery.
- The background service worker handles one narrow request: closing the sender's current Netflix tab when the bare Browse-page Back/Escape action is invoked.

## Personal-use and affiliation notice

This is an unofficial **personal-use project**. It is not affiliated with, endorsed by, or supported by Netflix, Samsung, or Pulse-Eight. Product and company names are used only to describe the environment this extension was built for.

AI tools were used as development assistance on an existing, outdated codebase. The result contains legacy code, experimental changes, and behavior that has not been independently audited. Do not assume that AI assistance means the project is correct, secure, or production-ready.

**No open-source license is granted by this repository.** It is kept for personal use and documentation of this setup; do not redistribute or reuse the code without the owner's permission. If you intend to publish the repository, check the code and any included assets for rights and licensing first.

## Version

Current extension package version: **1.5.47** (`manifest.json`). This code is an evolving snapshot and is not a promise of compatibility with future Netflix updates.


### Kiosk Escape behavior (v1.5.45)

On the bare Netflix home/browse page, Escape closes the Chrome window if it contains only the Netflix tab, which is intended to return control to the launcher such as Playnite. If that window contains multiple tabs, Escape closes only the Netflix tab. Inside Search, More Info, menus, or playback, Escape keeps its scoped navigation behavior. This requires the `tabs` and `windows` extension permissions.


### Backspace kiosk exit behavior (v1.5.46)

On the bare Netflix home/browse page, Backspace closes the kiosk window only when the browser focus is on the document body/document root and the extension has no logical selection. If a card, navigation item, text input, virtual keyboard, menu, modal, or player is active, the existing scoped Backspace behavior remains in place. Escape continues to use the v1.5.45 homepage exit behavior.


### Backspace hold debug behavior (v1.5.47)

On Netflix home/browse routes, holding Backspace for 2 seconds logs the hold detection and requests closure of the entire Chrome window, regardless of current focus or tab count. Short releases log that the hold threshold was not reached. Open DevTools Console to inspect `[TV Remote]` messages. Static validation only; test on the kiosk machine.


## v1.5.48 — Key-event debug build

This diagnostic build logs content-script startup plus every page `keydown` and `keyup`, including `key`, `code`, legacy key codes, repeat state, route, and focused element. On Netflix browse routes, a Backspace key held for 2 seconds still requests closing the entire Chrome window. Test only in a browser window you are comfortable closing.


## Back-to-close confirmation (v1.5.49)

On Netflix home/browse tabs, the remote's Backspace mapping opens a Yes/No confirmation to close the current Chrome window. Escape and Browser Back use the same confirmation. The default selection is **No**. Use the arrow keys to choose and Enter/OK to confirm; Backspace/Escape dismisses the prompt. Existing search keyboard/input, More Info dialog, and playback handlers take priority. The search keyboard was also made shorter vertically. This behavior has passed static checks but still requires live testing with the specific Pulse-Eight/CEC Tray key mapping and Netflix layout.


### v1.5.50 — Pulse-Eight `Clear` key mapping

The Samsung remote's Back button may arrive from CEC Tray/libCEC as `key: "Clear"`, `keyCode: 12`, not as a normal `Backspace` (`keyCode: 8`). v1.5.50 recognizes either mapping as Back on Netflix browse/home routes and opens the Yes/No close-browser confirmation outside More Info, search input/keyboard, and playback. There is no hold timer in this build. The console startup line is `[TV Remote] v1.5.50 loaded (no hold detector): ...`; Back-key diagnostics start with `[TV Remote] Back/Clear key received:`. If a hold-detection log still appears, verify that only v1.5.50 is enabled and inspect the exact log prefix/version.
