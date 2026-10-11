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
