# AI-assisted HTPC experiment

## Goal
Make Netflix usable from the sofa on a Windows 11 HTPC with a Samsung TV remote, minimizing the need to reach for a mouse or keyboard.

## Planning and approach
The problem and constraints were planned in collaboration with ChatGPT. We discussed the input path and chose to adapt an existing outdated extension rather than create a new implementation from scratch. The host setup already handled HDMI-CEC and exposed remote actions as keyboard-like events, so the extension focused on browser-side navigation rather than implementing CEC itself.

## System boundary

```text
Samsung TV remote
  -> Samsung Anynet+ / HDMI-CEC
  -> Pulse-Eight USB-CEC Adapter
  -> libCEC / CEC Tray
  -> keyboard-like events delivered to Chrome
  -> Manifest V3 extension
  -> Netflix web UI
```

The extension does not directly control the CEC adapter. It responds to browser key events and uses a small service worker for the explicitly confirmed kiosk-window close action.

## What was explored and built
- Remote-first directional focus and visible focus feedback.
- A compact virtual search keyboard and search-result navigation.
- A player overlay for playback, episodes, audio/subtitles, seeking, skip-intro, and video volume where Netflix exposes suitable controls.
- Context-aware Back behavior for Escape, Browser Back, Backspace, and the Pulse-Eight `Clear` key mapping.
- A Yes/No close-browser confirmation, defaulting to No, before closing the Chrome window and returning to the launcher.
- Profile-picker navigation based on the observed Netflix `data-uia="profile-selector"` DOM structure.
- Static checks for JavaScript syntax, manifest JSON, referenced assets, and permissions.

## Collaboration and ownership
ChatGPT was used for planning discussions, code exploration, implementation proposals, debugging, documentation, and packaging. The human operator supplied the real hardware setup, observed input behavior, tested the extension on the target HTPC, shared relevant DOM/log evidence, and decided which behaviors were acceptable. This is an AI-assisted experiment on an inherited codebase, not a claim of greenfield authorship.

## Validation status
The final profile-picker navigation and Back/close-confirmation behavior were reported working on the target setup. The included automated checks are static checks; they do not run an automated live Netflix session. Netflix changes its DOM and player behavior, so compatibility can regress.

## Provenance and reuse note
The original codebase was an existing outdated extension. Its complete provenance and third-party rights have not been independently audited. The repository's MIT license applies only to material its contributors are entitled to license and does not override inherited-code or asset rights. Review those rights before public redistribution or commercial use.
