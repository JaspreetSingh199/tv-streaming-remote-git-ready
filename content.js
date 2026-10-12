(() => {
"use strict";
if (window.__HNR1543) return;
window.__HNR1543 = true;

const S = {
  nav: 'nav[data-uia="navigation"]',
  search: '[data-uia="navigation+actions+search+input"]',
  sub: '[data-uia="navigation+subheader"]',
  row: '.carousel-row, [data-uia="slider"]',
  card: 'a[data-uia$="-card"], .slider-refocus',
  heroPlay: '[data-uia="play-video-button"], [data-uia="play-button"]',
  heroRemind: '[data-uia="add-to-remind-me"]',
  heroInfo: '[data-uia="billboard-more-info"]',
  modal: '[data-uia^="modal-motion-container"], .previewModal--container',
  modalControls: '[data-uia="mini-modal-controls"], .buttonControls--container',
  modalAction: '[data-uia="play-button"], [data-uia="add-to-remind-me"], [data-uia^="add-to-my-list"], [data-uia="thumbs-rate-button"]',
  modalCard: '[data-uia="titleCard--container"]',
  episode: '[data-uia="titleCard--container"].episode-item',
  seasonToggle: '[data-uia="episode-selector"] [data-uia="dropdown-toggle"]',
  sectionToggle: '[data-uia="section-expand"], [data-uia="section-collapse"]',
  close: '[data-uia*="close" i], button[aria-label*="close" i], [aria-label*="Close" i], .previewModal-close'
};
const PROFILE_LABELS = ["Manage Profiles", "Transfer Profile", "Help Centre"];
const css = document.createElement("style");
css.textContent = `
.hnr1533-focus{outline:3px solid #fff!important;outline-offset:3px!important;z-index:2147483646!important}
#hnr1533-status{position:fixed;z-index:2147483647;left:16px;bottom:16px;padding:7px 11px;background:#111;color:#fff;border:1px solid #f5c518;border-radius:8px;font:14px system-ui,sans-serif;pointer-events:none}
`;
(document.head || document.documentElement).append(css);

// Remote-first mode: disable trusted physical pointer interaction with Netflix's
// app surface while keeping extension-owned overlays usable as a fallback.
document.documentElement.classList.add("hnr1533-remote-only");
const hnr1537BlockedPointerEvents = [
  "pointerdown", "pointerup", "pointermove", "pointerover", "pointerout", "pointerenter", "pointerleave",
  "mousedown", "mouseup", "mousemove", "mouseover", "mouseout", "mouseenter", "mouseleave",
  "click", "auxclick", "dblclick", "contextmenu", "wheel", "dragstart", "dragover", "drop",
  "touchstart", "touchmove", "touchend"
];
function hnr1537BlockPhysicalPointer(event) {
  if (!event.isTrusted || !(event.target instanceof Element)) return;
  // Only suppress events aimed at Netflix itself; the custom TV keyboard and
  // remote overlay are siblings outside #appMountPoint and remain available.
  if (!event.target.closest("#appMountPoint")) return;
  if (event.cancelable) event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
}
for (const eventType of hnr1537BlockedPointerEvents) {
  document.addEventListener(eventType, hnr1537BlockPhysicalPointer, { capture: true, passive: false });
}

let selected = null, statusNode = null, statusTimer = 0, keyPressCount = 0;
let hnr1533BypassKeyRouter = false;
const rowTurns = new WeakMap();
const norm = s => (s || "").replace(/\s+/g, " ").trim();
const rendered = el => {
  if (!(el instanceof HTMLElement) || !el.isConnected || !el.getClientRects().length) return false;
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
};
const visible = el => {
  if (!rendered(el)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
};
const isText = el => !!el && (el.matches?.('input,textarea,select,[contenteditable="true"],[role="textbox"]') || el.isContentEditable);
const label = el => norm(el?.getAttribute("aria-label") || el?.getAttribute("title") || el?.innerText || el?.getAttribute("data-uia") || el?.tagName).slice(0, 58);
function status(msg) {
  if (!statusNode) { statusNode = document.createElement("div"); statusNode.id = "hnr1533-status"; document.documentElement.append(statusNode); }
  statusNode.textContent = "TV Remote · " + msg; statusNode.hidden = false; clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { if (statusNode) statusNode.hidden = true; }, 1300);
}
function clearSelection() { if (selected) selected.classList.remove("hnr1533-focus"); selected = null; }
function horizontalScrolls(el) {
  const out = [];
  for (let n = el.parentElement; n; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1) out.push([n, n.scrollLeft]);
  }
  return out;
}
function revealVertical(el, modal = null) {
  // A detail modal can be a tall flow or a scrollable pane. Reveal in its own
  // scrollable ancestors first; never scroll the page behind a fixed modal.
  const root = modal;
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    if (root && !root.contains(n) && n !== root) break;
    const r = n.getBoundingClientRect();
    if (n.scrollHeight > n.clientHeight + 1) {
      const overflow = getComputedStyle(n).overflowY;
      if (/(auto|scroll|hidden|clip)/.test(overflow)) {
        const er = el.getBoundingClientRect();
        if (er.top < r.top + 12) n.scrollTop -= (r.top + 12 - er.top);
        else if (er.bottom > r.bottom - 12) n.scrollTop += (er.bottom - (r.bottom - 12));
        if (root && n === root) break;
      }
    }
    if (n === root) break;
  }
  if (root) {
    // Some Netflix dialogs use overflow:visible content inside a fixed panel.
    // Scroll the modal root if it itself can scroll.
    const rr = root.getBoundingClientRect(), er = el.getBoundingClientRect();
    if (root.scrollHeight > root.clientHeight + 1) {
      if (er.top < rr.top + 12) root.scrollTop -= (rr.top + 12 - er.top);
      else if (er.bottom > rr.bottom - 12) root.scrollTop += (er.bottom - (rr.bottom - 12));
    } else {
      // Use page scroll only when the modal is not fixed to the viewport.
      const fixed = [...function*(){ for(let n=el;n;n=n.parentElement) yield n; }()].some(n => ["fixed","sticky"].includes(getComputedStyle(n).position));
      if (!fixed) revealWindow(el);
    }
    return;
  }
  revealWindow(el);
}
function revealWindow(el) {
  const r = el.getBoundingClientRect(), nav = document.querySelector(S.nav);
  const stickyBottom = nav && ["fixed","sticky"].includes(getComputedStyle(nav).position) ? nav.getBoundingClientRect().bottom : 0;
  if (r.top < stickyBottom + 12) window.scrollBy({ top: r.top - stickyBottom - 16, behavior: "auto" });
  else if (r.bottom > innerHeight - 12) window.scrollBy({ top: r.bottom - innerHeight + 16, behavior: "auto" });
}
function focus(el, modal = null) {
  if (!el || !rendered(el)) return false;
  // Never highlight an entire More Info dialog as if it were a focusable control.
  const activeDetail = modal || activeModal();
  if (activeDetail && el === activeDetail) return false;
  // Remove any stale highlights, including overlapping old descendants. Netflix
  // sometimes rerenders the Play/Like row while a focus move is happening.
  for (const stale of document.querySelectorAll(".hnr1533-focus")) {
    if (stale !== el) stale.classList.remove("hnr1533-focus");
  }
  const hs = horizontalScrolls(el);
  selected = el;
  el.classList.add("hnr1533-focus");
  try { el.focus({ preventScroll: true }); } catch { try { el.focus(); } catch {} }
  for (const [node, left] of hs) if (node.scrollLeft !== left) node.scrollLeft = left;
  revealVertical(el, modal);
  status(label(el) || "item");
  return true;
}
function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function nearest(current, targets, key) {
  const a = center(current); let best = null, bestScore = Infinity;
  for (const el of targets) {
    if (el === current || !rendered(el)) continue;
    const b = center(el), dx = b.x - a.x, dy = b.y - a.y;
    let p, s;
    if (key === "ArrowRight") { if (dx <= 6) continue; p = dx; s = Math.abs(dy); }
    else if (key === "ArrowLeft") { if (dx >= -6) continue; p = -dx; s = Math.abs(dy); }
    else if (key === "ArrowDown") { if (dy <= Math.min(current.getBoundingClientRect().height, el.getBoundingClientRect().height) / 2) continue; p = dy; s = Math.abs(dx); }
    else { if (dy >= -Math.min(current.getBoundingClientRect().height, el.getBoundingClientRect().height) / 2) continue; p = -dy; s = Math.abs(dx); }
    const score = p + s * 1.6 + (s > p ? s : 0);
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

// Netflix main page regions
const nav = () => document.querySelector(S.nav);
const navItems = () => nav() ? [...nav().querySelectorAll('a[href],button')] .filter(rendered) : [];
const navTarget = () => { const n = nav(); return n && (n.querySelector('[aria-current="page"]') || n.querySelector('[data-uia="nav-home"]') || navItems()[0] || null); };
const sub = () => document.querySelector(S.sub);
const subItems = () => sub() ? [...sub().querySelectorAll('[role="button"],a[href],button')].filter(rendered) : [];
const rows = () => [...document.querySelectorAll(S.row)].filter(rendered);
const cardsIn = row => [...row.querySelectorAll(S.card)].filter(c => rendered(c) && c.getAttribute("aria-hidden") !== "true");
const firstCard = () => {
  for (const r of rows()) { const c = cardsIn(r); if (c.length) return c[0]; }
  const g = document.querySelector('section[data-uia="gallery"]');
  return g ? [...g.querySelectorAll(S.card)].find(rendered) || null : null;
};
const rowOf = el => el?.closest?.(S.row) || null;
const cardOf = el => el?.matches?.(S.card) ? el : el?.closest?.(S.card) || null;
const heroActions = () => {
  const find = selector => [...document.querySelectorAll(selector)].find(el => rendered(el) && !el.closest(S.modal)) || null;
  const primary = find(S.heroPlay) || find(S.heroRemind);
  const more = find(S.heroInfo);
  return [primary, more].filter(Boolean);
};

// More Info/detail modal. This is intentionally separate from base-page focus.
function activeModal() {
  // Netflix has used both of these roots for the title detail/hover preview.
  // Do not rely on opacity during the open animation; wait for actual layout and
  // visibility, then choose the modal container with the most modal-specific DOM.
  const direct = [...document.querySelectorAll(S.modal)].filter(el => {
    if (!(el instanceof HTMLElement) || !el.isConnected || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && el.getAttribute("aria-hidden") !== "true";
  });
  const score = el => {
    const modalBits = el.querySelectorAll(
      `${S.modalControls},${S.modalAction},${S.modalCard},${S.sectionToggle},${S.seasonToggle}`
    ).length;
    const r = el.getBoundingClientRect();
    return modalBits * 100000 + Math.min(10000, r.width * r.height);
  };
  if (direct.length) return direct.sort((a,b) => score(b) - score(a))[0];

  // Resilient fallback if Netflix retains the controls but changes the wrapping
  // modal class. Climb from modal-only controls, never from the base-page hero.
  const seeds = [...document.querySelectorAll(`${S.modalControls},${S.modalAction},${S.sectionToggle}`)]
    .filter(el => el instanceof HTMLElement && el.isConnected && el.getClientRects().length);
  const candidates = [];
  for (const seed of seeds) {
    for (let p = seed.parentElement, depth = 0; p && p !== document.body && depth < 10; p = p.parentElement, depth++) {
      if (!(p instanceof HTMLElement) || !p.getClientRects().length) continue;
      const cs = getComputedStyle(p), r = p.getBoundingClientRect();
      const cls = String(p.className || "");
      const likely = /previewModal|modal-motion|modal-container|dialog/i.test(cls)
        || p.getAttribute("role") === "dialog"
        || (["fixed","absolute"].includes(cs.position) && r.width > innerWidth * 0.35 && r.height > innerHeight * 0.25);
      if (likely && p.querySelector(S.modalAction) && (p.querySelector(S.modalControls) || p.querySelector(S.modalCard))) {
        candidates.push(p); break;
      }
    }
  }
  if (candidates.length) return candidates.sort((a,b) => score(b)-score(a))[0];
  return null;
}
function modalClose(modal) {
  const exact = modal.querySelector('[data-uia="previewModal-closebtn"][role="button"]') ||
    modal.querySelector('[data-uia="previewModal-closebtn"]');
  if (exact && rendered(exact)) return exact;
  const fallback = modal.querySelector('.previewModal-close [role="button"], .previewModal-close button, .previewModal-close');
  if (fallback && rendered(fallback)) {
    // Don't return the container if it has no interaction semantics; try its
    // actual child control first. The outer wrapper is used only for activation.
    const inner = fallback.querySelector('[role="button"],button,a[href],[tabindex]');
    return inner || fallback;
  }
  return null;
}

function modalActions(modal) {
  // Prefer Netflix's dedicated action row. If the data-uia names change, fall
  // back to clickable controls near the top of the More Info panel.
  const parent = modal.querySelector(S.modalControls) || modal;
  const exact = [...parent.querySelectorAll(S.modalAction)].filter(el => rendered(el));
  if (exact.length) return [...new Set(exact)];
  const mr = modal.getBoundingClientRect();
  const candidates = [...parent.querySelectorAll('button,a[href],[role="button"],[tabindex]:not([tabindex="-1"])')]
    .filter(el => rendered(el) && !el.closest(S.modalCard) &&
      !el.matches(S.sectionToggle) && !el.closest(S.sectionToggle));
  const filtered = candidates.filter(el => {
    const r = el.getBoundingClientRect();
    const text = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-uia") || ""} ${el.getAttribute("title") || ""} ${typeof el.className === "string" ? el.className : ""}`.toLowerCase();
    if (/close|dismiss|episode|season|expand|collapse/.test(text)) return false;
    return r.top < mr.top + Math.max(300, mr.height * 0.5) && r.width < mr.width * 0.6 && r.height < mr.height * 0.25;
  });
  // Avoid nested duplicate candidates; keep the actual clickable node.
  return [...new Set(filtered)].filter(el =>
    !filtered.some(other => other !== el && other.contains(el) && other.matches('button,a[href],[role="button"]'))
  ).slice(0, 8);
}

function clipped(el, modal) {
  const rect = el.getBoundingClientRect();
  for (let n = el.parentElement; n && n !== modal && n !== document.body; n = n.parentElement) {
    if (n.scrollHeight <= n.clientHeight + 1) continue;
    const overflow = getComputedStyle(n).overflowY;
    if (overflow !== "hidden" && overflow !== "clip") continue;
    const box = n.getBoundingClientRect();
    const shown = Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top);
    if (shown < rect.height / 2) return true;
  }
  return false;
}
function modalStops(modal) {
  const close = modalClose(modal);
  // Include rendered episode cards even when clipped/off-screen. focus() will
  // scroll the modal to them; excluding them made the episode selector unreachable.
  const exact = [...modal.querySelectorAll(`${S.seasonToggle},${S.modalCard},${S.sectionToggle},[data-uia="episode-selector"] [data-uia="titleCard--container"]`)]
    .filter(el => rendered(el) && el.getAttribute("aria-hidden") !== "true");
  const extras = [...modal.querySelectorAll('button,a[href],[role="button"],[role="option"],[tabindex]:not([tabindex="-1"])')]
    .filter(el => rendered(el) && el.getAttribute("aria-hidden") !== "true" &&
      !el.closest(S.modalControls) && !el.closest(S.sectionToggle) &&
      !el.closest('[data-uia="mini-modal-controls"]'));
  const unique = [...new Set([...(close ? [close] : []), ...exact, ...extras])];
  return unique.filter((el, i) => !unique.some((other, j) => i !== j && other !== el &&
    other.contains(el) && (exact.includes(other) || other.matches(S.modalCard))));
}function gridModalCard(el) { return el.matches(S.modalCard) && !el.matches(S.episode); }
function cardSection(stops, card) { return stops.filter(stop => stop.parentElement === card.parentElement); }
function closeDetailModal(modal) {
  const close = modalClose(modal);
  if (close) { close.click(); status("Closing More Info"); return true; }
  // Netflix usually puts the selected title in the URL/history while its detail
  // overlay is open. Back returns to the base page without leaving Netflix.
  if (location.search || history.length > 1) {
    history.back(); status("Going back from More Info"); return true;
  }
  const scrim = document.querySelector('[data-uia="scrim-overlay"]');
  if (scrim && rendered(scrim)) { scrim.click(); return true; }
  return false;
}
function toggleModalSection(modal, el) {
  el.click();
  setTimeout(() => {
    const close = modalClose(modal);
    const stops = modalStops(modal);
    const target = stops.find(s => s !== el) || close;
    if (target) focus(target, modal);
  }, 350);
}
function activateModalClose(modal, detectedClose) {
  // The supplied live DOM shows:
  // <div class="previewModal-close">
  //   <span data-uia="previewModal-closebtn" role="button" aria-label="close">...</span>
  // Keep the span as the focus target, but try the containing Netflix wrapper if
  // its click handler owns the close action.
  const exact = modal.querySelector('[data-uia="previewModal-closebtn"][role="button"]') ||
    modal.querySelector('[data-uia="previewModal-closebtn"]');
  const wrapper = exact?.closest(".previewModal-close") || null;
  const candidates = [...new Set([exact, detectedClose, wrapper].filter(Boolean))]
    .filter(el => modal.contains(el) && rendered(el));
  if (!candidates.length) return false;

  const initial = candidates[0];
  try { initial.click(); } catch {}
  status("Close activated");

  // Netflix can ignore a synthetic click on the semantic span in some builds.
  // If the detail overlay is still mounted, try the wrapper, then the SPA back
  // route as a last resort. Delays allow React to process each attempt.
  setTimeout(() => {
    if (!modal.isConnected || !activeModal()) return;
    const fallback = candidates.find(el => el !== initial && el === wrapper);
    if (fallback && rendered(fallback)) {
      try { fallback.click(); } catch {}
      status("Retrying close");
    }
    setTimeout(() => {
      if (!modal.isConnected || !activeModal()) return;
      // The title detail overlay is a route-backed modal in the supplied page DOM;
      // history.back() is the final close fallback if the overlay survives clicks.
      if (history.length > 1) {
        history.back();
        status("Returning from title details");
      } else {
        status("Close did not respond; use Back or refresh");
      }
    }, 450);
  }, 350);
  return true;
}

function handleModal(e, modal) {
  const domActive = document.activeElement;
  const close = modalClose(modal);
  const actions = modalActions(modal);
  const stops = modalStops(modal);

  // The yellow ring is the extension's logical focus. Some Netflix modal
  // controls (including the X in some layouts) are not natively focusable, so
  // document.activeElement can remain on Play even when the X is highlighted.
  const selectedInside = !!selected && modal.contains(selected) &&
    (selected === close || actions.includes(selected) || stops.includes(selected));
  const active = selectedInside ? selected : domActive;
  const inside = !!active && modal.contains(active);

  if (e.key === "Escape" || e.key === "BrowserBack" || e.key === "Backspace") {
    if (close && activateModalClose(modal, close)) {
      status("Closing More Info");
      // Some Netflix click handlers schedule the state update asynchronously.
    } else if (new URLSearchParams(location.search).has("jbv") || location.search || history.length > 1) {
      history.back();
      status("Going back from More Info");
    } else {
      const scrim = document.querySelector('[data-uia="scrim-overlay"]');
      if (scrim && rendered(scrim)) scrim.click();
    }
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  if (inside && isText(active) && !selectedInside) return false;

  if ((e.key === "Enter" || e.key === " ") && inside && active.matches(S.sectionToggle)) {
    toggleModalSection(modal, active); e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  if (e.key === "Enter" || e.key === " ") {
    // Prioritize the highlighted selection over document.activeElement. This
    // prevents Enter on the highlighted X from activating the old Play target.
    let target = null;
    if (selectedInside && close && (selected === close || close.contains(selected))) target = close;
    else if (selectedInside) target = selected;
    else if (inside && (actions.includes(active) || stops.includes(active))) target = active;

    if (target) {
      const isClose = !!close && (target === close || close.contains(target) || target.contains(close));
      if (isClose) {
        activateModalClose(modal, close);
        status("Closing More Info");
      } else {
        target.click();
      }
      e.preventDefault(); e.stopImmediatePropagation();
      return true;
    }
    const first = actions[0] || close || stops[0];
    if (first) focus(first, modal);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) return true;

  if (!inside || (!actions.includes(active) && !stops.includes(active))) {
    const first = actions[0] || close || stops[0];
    if (first) focus(first, modal);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  if (close && (active === close || close.contains(active))) {
    if (e.key === "ArrowDown") {
      const firstAction = actions[0] || stops.find(s => s !== close);
      if (firstAction) focus(firstAction, modal);
    }
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  const ai = actions.indexOf(active);
  if (ai >= 0) {
    if (e.key === "ArrowUp") {
      if (close) focus(close, modal);
    } else if (e.key === "ArrowDown") {
      const target = nearest(active, stops.filter(s => s !== close), "ArrowDown") || stops.find(s => s !== close);
      if (target) focus(target, modal);
    } else {
      const ring = [...new Set([...actions, ...(close ? [close] : [])])];
      const target = nearest(active, ring, e.key);
      if (target) focus(target, modal);
      else {
        const fallbackIndex = e.key === "ArrowRight" ? Math.min(actions.length - 1, ai + 1) : Math.max(0, ai - 1);
        if (actions[fallbackIndex] && actions[fallbackIndex] !== active) focus(actions[fallbackIndex], modal);
      }
    }
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  if (stops.includes(active)) {
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && gridModalCard(active)) {
      const section = cardSection(stops, active), idx = section.indexOf(active), d = e.key === "ArrowRight" ? 1 : -1;
      const target = section.length ? section[(idx + d + section.length) % section.length] : null;
      if (target) focus(target, modal);
    } else {
      const target = nearest(active, stops.filter(s => s !== close), e.key);
      if (target) focus(target, modal);
      else if (e.key === "ArrowUp") focus(actions[0] || close, modal);
    }
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }

  e.preventDefault(); e.stopImmediatePropagation(); return true;
}

// ---- TV-style virtual keyboard for Netflix Search ----
let hnr1533Keyboard = null;
const HNR14_SEARCH_IDLE_MS = 20000;
let hnr1533SearchIdleTimer = 0;
let hnr1533KeyboardVisible = false;
let hnr1533KeyboardSelection = 0;
let hnr1533KeyboardInput = null;
const HNR13_KEYS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Z","X","C","V","B","N","M","⌫"],
  ["Space","Clear","Done"]
];
function hnr1533ResetSearchWatchdog() {
  clearTimeout(hnr1533SearchIdleTimer);
  if (!hnr1533KeyboardVisible || !hnr1533Keyboard || hnr1533Keyboard.hidden) return;
  hnr1533SearchIdleTimer = setTimeout(() => {
    if (!hnr1533KeyboardVisible) return;
    const input = hnr1533KeyboardInput;
    // Always restore the normal Netflix navigation state after inactivity,
    // even if Netflix moved focus away from the Search input. Otherwise its
    // expanded search bar can remain onscreen with no active keyboard.
    if (input && input.isConnected) {
      closeSearch();
    } else {
      hnr1533HideKeyboard(false);
      const nav = navTarget();
      if (nav) focus(nav);
    }
    status("Search idle · returned to browsing");
  }, HNR14_SEARCH_IDLE_MS);
}
function hnr1533ClearSearchWatchdog() {
  clearTimeout(hnr1533SearchIdleTimer);
  hnr1533SearchIdleTimer = 0;
}

function hnr1533BuildKeyboard() {
  if (hnr1533Keyboard) return hnr1533Keyboard;
  const css = document.createElement("style");
  css.id = "hnr1533-keyboard-css";
  css.textContent = `
    #hnr1533-keyboard{position:fixed;z-index:2147483647;left:50%;bottom:2vh;transform:translateX(-50%);width:min(1020px,94vw);padding:11px 16px 9px;background:linear-gradient(155deg,rgba(29,29,29,.985),rgba(7,7,7,.985));border:1px solid rgba(255,255,255,.22);border-top:3px solid #e50914;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.06);color:#fff;font:600 16px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    #hnr1533-keyboard[hidden]{display:none!important}
    #hnr1533-keyboard .hnr1533-kb-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 7px;padding:0 2px 7px;border-bottom:1px solid rgba(255,255,255,.12)}
    #hnr1533-keyboard .hnr1533-kb-brand{display:flex;align-items:center;gap:10px;min-width:0}
    #hnr1533-keyboard .hnr1533-kb-mark{width:28px;height:28px;flex:0 0 28px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:#e50914;color:#fff;font-size:17px;font-weight:900;box-shadow:0 4px 14px rgba(229,9,20,.25)}
    #hnr1533-keyboard .hnr1533-kb-title{font-size:14px;letter-spacing:.04em;font-weight:800;margin:0}
    #hnr1533-keyboard .hnr1533-kb-subtitle{font-size:10px;letter-spacing:.16em;font-weight:800;color:#aaa;margin-top:4px}
    #hnr1533-keyboard .hnr1533-kb-preview{font-size:18px;line-height:1.15;min-height:22px;max-height:42px;overflow:hidden;overflow-wrap:anywhere;background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px 10px;margin-bottom:8px;color:#fff;box-shadow:inset 0 1px 4px rgba(0,0,0,.35)}
    #hnr1533-keyboard .hnr1533-kb-row{display:flex;gap:6px;justify-content:center;margin:4px 0}
    #hnr1533-keyboard .hnr1533-kb-row:nth-child(3){padding-left:4.5%;padding-right:0}
    #hnr1533-keyboard .hnr1533-kb-row:nth-child(4){padding-left:8%;padding-right:8%}
    #hnr1533-keyboard .hnr1533-kb-key{flex:1;min-width:0;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:linear-gradient(160deg,rgba(66,66,66,.94),rgba(37,37,37,.98));color:#f4f4f4;font-size:16px;font-weight:650;letter-spacing:.015em;user-select:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.045);transition:background .12s ease,border-color .12s ease,transform .12s ease}
    #hnr1533-keyboard .hnr1533-kb-key.wide{flex:1.8;font-size:14px}
    #hnr1533-keyboard .hnr1533-kb-key[data-key="Space"]{flex:4.2;font-size:14px;color:#ddd}
    #hnr1533-keyboard .hnr1533-kb-key[data-key="Clear"]{flex:1.5}
    #hnr1533-keyboard .hnr1533-kb-key[data-key="Done"]{flex:1.8;background:linear-gradient(150deg,#b80710,#e50914);border-color:rgba(255,255,255,.16);font-weight:800}
    #hnr1533-keyboard .hnr1533-kb-key[data-key="⌫"]{font-size:22px}
    #hnr1533-keyboard .hnr1533-kb-key.selected{background:#f6f6f6;color:#111;border-color:#fff;outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 2px rgba(0,0,0,.9),0 0 20px rgba(255,255,255,.18);transform:translateY(-1px);z-index:1}
    #hnr1533-keyboard .hnr1533-kb-key[data-key="Done"].selected{background:#fff;color:#111}
    #hnr1533-keyboard .hnr1533-kb-hint{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;font-size:10px;color:#bdbdbd;text-align:center;margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.1)}
    #hnr1533-keyboard .hnr1533-kb-hint strong{color:#fff;font-weight:750}
    @media(max-width:900px){#hnr1533-keyboard{width:95vw;padding:9px 10px 7px}#hnr1533-keyboard .hnr1533-kb-row{gap:4px;margin:3px 0}#hnr1533-keyboard .hnr1533-kb-key{height:36px;font-size:14px}}
    @media(max-height:650px){#hnr1533-keyboard{bottom:1vh;padding:7px 10px 6px}#hnr1533-keyboard .hnr1533-kb-header{margin-bottom:5px;padding-bottom:5px}#hnr1533-keyboard .hnr1533-kb-mark{width:24px;height:24px;flex-basis:24px;font-size:14px}#hnr1533-keyboard .hnr1533-kb-preview{font-size:16px;min-height:19px;padding:4px 8px;margin-bottom:5px}#hnr1533-keyboard .hnr1533-kb-key{height:31px;font-size:13px}#hnr1533-keyboard .hnr1533-kb-row{gap:3px;margin:2px 0}#hnr1533-keyboard .hnr1533-kb-hint{margin-top:5px;padding-top:4px;font-size:9px}}
  `;
  document.documentElement.append(css);
  const root = document.createElement("div");
  root.id = "hnr1533-keyboard";
  root.hidden = true;
  root.setAttribute("role","dialog");
  root.setAttribute("aria-label","Netflix search keyboard");
  root.innerHTML = '<div class="hnr1533-kb-header"><div class="hnr1533-kb-brand"><div class="hnr1533-kb-mark">TV</div><div><div class="hnr1533-kb-title">Search</div><div class="hnr1533-kb-subtitle">TV REMOTE</div></div></div><div class="hnr1533-kb-subtitle">TV KEYBOARD</div></div><div class="hnr1533-kb-preview" id="hnr1533-kb-preview"></div><div id="hnr1533-kb-keys"></div><div class="hnr1533-kb-hint"><span><strong>Arrows</strong> move</span><span><strong>OK</strong> types</span><span><strong>⌫</strong> deletes</span><span><strong>Done</strong> shows results</span><span><strong>Back</strong> closes</span></div>';
  document.documentElement.append(root);
  const area = root.querySelector("#hnr1533-kb-keys");
  for (const [rowIndex, rowKeys] of HNR13_KEYS.entries()) {
    const row = document.createElement("div");
    row.className = "hnr1533-kb-row hnr1533-kb-row-" + rowIndex;
    for (const key of rowKeys) {
      const el = document.createElement("div");
      el.className = "hnr1533-kb-key" + (["Space","Clear","Done","⌫"].includes(key) ? " wide" : "");
      el.dataset.key = key;
      el.textContent = key === "Space" ? "Space" : key;
      el.setAttribute("aria-label", key);
      row.append(el);
    }
    area.append(row);
  }
  root.addEventListener("mousedown", e => {
    if (e.target.closest(".hnr1533-kb-key")) e.preventDefault(); // keep Netflix input as DOM focus
  });
  root.addEventListener("click", e => {
    const key = e.target.closest(".hnr1533-kb-key")?.dataset.key;
    if (key) hnr1533ActivateKey(key);
  });
  hnr1533Keyboard = root;
  return root;
}
function hnr1533KeyboardKeys() {
  return hnr1533Keyboard ? [...hnr1533Keyboard.querySelectorAll(".hnr1533-kb-key")] : [];
}
function hnr1533UpdateKeyboard() {
  if (!hnr1533Keyboard) return;
  const input = hnr1533KeyboardInput || searchInput();
  const preview = hnr1533Keyboard.querySelector("#hnr1533-kb-preview");
  if (preview) preview.textContent = input?.value || "Type a title…";
  const keys = hnr1533KeyboardKeys();
  keys.forEach((key,i) => key.classList.toggle("selected",i===hnr1533KeyboardSelection));
}
function hnr1533ShowKeyboard(input) {
  if (!input) return;
  hnr1533BuildKeyboard();
  hnr1533KeyboardInput = input;
  hnr1533KeyboardVisible = true;
  hnr1533Keyboard.hidden = false;
  const keys = hnr1533KeyboardKeys();
  const initial = keys.findIndex(key => key.dataset.key === "Q");
  hnr1533KeyboardSelection = initial >= 0 ? initial : 0;
  hnr1533UpdateKeyboard();
  hnr1533ResetSearchWatchdog();
  status("Search keyboard opened");
}
function hnr1533HideKeyboard(returnToResults = true) {
  hnr1533ClearSearchWatchdog();
  if (hnr1533Keyboard) hnr1533Keyboard.hidden = true;
  hnr1533KeyboardVisible = false;
  const input = hnr1533KeyboardInput;
  hnr1533KeyboardInput = null;
  if (returnToResults) {
    if (input) input.blur();
    setTimeout(() => {
      const suggestion = document.querySelector('[data-uia="search-suggestion-item-link"],[data-uia*="search-suggestion"] a,[role="option"]');
      const target = suggestion && rendered(suggestion) ? suggestion : firstCard();
      if (target) focus(target);
      else if (navTarget()) focus(navTarget());
    },100);
  }
}
function hnr1533WriteInput(value) {
  hnr1533ResetSearchWatchdog();
  const input = hnr1533KeyboardInput || searchInput();
  if (!input) return;
  input.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
  if (setter) setter.call(input,value); else input.value=value;
  input.dispatchEvent(new Event("input",{bubbles:true}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
  hnr1533UpdateKeyboard();
}
function hnr1533ActivateKey(key) {
  hnr1533ResetSearchWatchdog();
  const input = hnr1533KeyboardInput || searchInput();
  if (!input) { hnr1533HideKeyboard(false); return; }
  const value = input.value || "";
  if (key === "Done") {
    if ((input.value || "").trim()) {
      hnr1533HideKeyboard(true); // keep a non-empty query so the user can choose a result
    } else {
      closeSearch(); // empty Done means exit Search and restore normal browsing
    }
    return;
  }
  if (key === "Clear") { hnr1533WriteInput(""); return; }
  if (key === "⌫") { hnr1533WriteInput(value.slice(0,-1)); return; }
  if (key === "Space") { hnr1533WriteInput(value+" "); return; }
  hnr1533WriteInput(value+key.toLowerCase());
}
function hnr1533KeyboardMove(direction) {
  hnr1533ResetSearchWatchdog();
  const keys = hnr1533KeyboardKeys();
  const current = keys[hnr1533KeyboardSelection];
  if (!current) return false;

  // Navigate the keyboard's actual rows, not a global nearest-neighbour search.
  // Global geometry occasionally preferred the M/backspace row when moving
  // right from Space, causing the bottom row (Space → Clear → Done) to jump up.
  const rows = hnr1533Keyboard
    ? [...hnr1533Keyboard.querySelectorAll('.hnr1533-kb-row')].map(row => [...row.querySelectorAll('.hnr1533-kb-key')])
    : [];
  const rowIndex = rows.findIndex(row => row.includes(current));
  if (rowIndex < 0) return false;
  const row = rows[rowIndex];
  const columnIndex = row.indexOf(current);
  let target = null;

  if (direction === 'ArrowLeft' || direction === 'ArrowRight') {
    const nextColumn = columnIndex + (direction === 'ArrowRight' ? 1 : -1);
    // Horizontal movement is constrained to the current row; never jump to the
    // row above just because an adjacent key has a closer geometric centre.
    target = row[nextColumn] || current;
  } else {
    const nextRow = rows[rowIndex + (direction === 'ArrowDown' ? 1 : -1)];
    if (nextRow?.length) {
      const currentRect = current.getBoundingClientRect();
      const currentX = currentRect.left + currentRect.width / 2;
      target = nextRow.reduce((best, candidate) => {
        if (!best) return candidate;
        const br = best.getBoundingClientRect(), cr = candidate.getBoundingClientRect();
        const bestX = br.left + br.width / 2, candidateX = cr.left + cr.width / 2;
        return Math.abs(candidateX - currentX) < Math.abs(bestX - currentX) ? candidate : best;
      }, null) || current;
    } else target = current;
  }

  const nextIndex = keys.indexOf(target);
  if (nextIndex >= 0) hnr1533KeyboardSelection = nextIndex;
  hnr1533UpdateKeyboard();
  return true;
}
let hnr1533PlayerMode = false;
let hnr1533PlayerKeepAliveTimer = 0;
let hnr1533PlayerWakePending = false;
let hnr1533PlayerHoldUntil = 0;
let hnr1533PlayerLastFocusPulse = 0;
const HNR1533_PLAYER_CLASS = "hnr1533-player-mode";
const HNR1533_KEEP_CLASS = "hnr1533-player-keep-visible";
let hnr1533PlayerOverlay = null;
let hnr1533PlayerOverlayIndex = 0;
let hnr1533OverlayPendingNative = null;
let hnr1533OverlayMode = "main";
let hnr1533DispatchingNativeShortcut = false; // lets simulated shortcut reach Netflix without our remote handler consuming it
let hnr1533NativeEpisodeMode = false;
let hnr1533NativeAudioMode = false;
let hnr1533NativeAudioIndex = 0;
let hnr1533NativeAudioOpenAt = 0;
let hnr1533NativeAudioTriggerClicked = false;
let hnr1533NativeAudioPollTimer = 0;
let hnr1533EpisodeCapabilityProbe = new Map();
let hnr1533EpisodeCapabilityByWatch = new Map();

// After Netflix confirms an episode change, do not automatically reopen the tray.
// A deliberate Episodes action resets this flag.
let hnr1533EpisodeAutoReopenPaused = false;
let hnr1533NativeEpisodeOpenAt = 0;
let hnr1533NativeEpisodePollTimer = 0;
let hnr1533NativeEpisodeWatchTimer = 0;
let hnr1533NativeEpisodeIndex = 0;
let hnr1533NativeEpisodeClickPending = false;
let hnr1533LastPointerPulseAt = 0;
let hnr1533PendingEpisodeStep = null;
let hnr1533LastActivatedEpisodeIndex = null;
let hnr1533LastActivatedEpisodeRoute = "";
let hnr1533EpisodeSelectionArmedKey = "";
const HNR1533_OVERLAY_ICONS = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  toggle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none"/><path d="M12 2.8a9.2 9.2 0 1 1-9.2 9.2"/></svg>',
  episodes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="13" height="16" rx="2"/><path d="M7 8h5M7 12h5M7 16h3M18 7h3v13h-3"/></svg>',
  previousEpisode: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M19 6 8 12l11 6z"/></svg>',
  nextEpisode: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14M5 6l11 6-11 6z"/></svg>',
  rewind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2 6M3 4v7h7"/><path d="M13 9v6M11.5 10h3"/><text x="12" y="21" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>',
  forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11a9 9 0 1 0-2 6M21 4v7h-7"/><path d="M11 9v6M9.5 10h3"/><text x="12" y="21" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">10</text></svg>',
  volumeDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM17 10l4 4M21 10l-4 4"/></svg>',
  volumeUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9zM16 9a5 5 0 0 1 0 6M18.5 6.5a8.5 8.5 0 0 1 0 11"/><path d="M17 10v4M15 12h4"/></svg>',
  audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 10h5M6 14h8M16 10h2"/></svg>',
  skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5v13L15 12zM18 5v14M3 21h18"/></svg>'
};
const HNR1533_OVERLAY_ACTIONS = [
  { id: "back", label: "Back", icon: "back", group: "navigation" },
  { id: "toggle", label: "Play / Pause", icon: "toggle", group: "playback" },
  { id: "episodes", label: "Episodes", icon: "episodes", group: "navigation" },
  { id: "previousEpisode", label: "Previous Episode", icon: "previousEpisode", group: "episode" },
  { id: "nextEpisode", label: "Next Episode", icon: "nextEpisode", group: "episode" },
  { id: "audio", label: "Audio & Subs", icon: "audio", group: "settings" },
  { id: "rewind", label: "−10 sec", icon: "rewind", group: "seek" },
  { id: "forward", label: "+10 sec", icon: "forward", group: "seek" },
  { id: "skip", label: "Skip Intro", icon: "skip", group: "playback" },
  { id: "volumeDown", label: "Volume −", icon: "volumeDown", group: "volume" },
  { id: "volumeUp", label: "Volume +", icon: "volumeUp", group: "volume" }
];
function hnr1533RenderOverlayMarkup() {
  return '<div class="hnr1533-overlay-head">' +
    '<div class="hnr1533-overlay-brand"><span class="hnr1533-brand-mark">TV</span><span class="hnr1533-brand-copy"><span class="hnr1533-brand-name">TV Remote</span><span class="hnr1533-brand-subtitle">PLAYER CONTROLS</span></span></div>' +
    '<div class="hnr1533-overlay-hint">← ↑ ↓ → Navigate <span>·</span> OK Select <span>·</span> Back closes</div>' +
    '</div>' + HNR1533_OVERLAY_ACTIONS.map(action =>
      `<div class="hnr1533-overlay-item hnr1533-action-${action.group}" data-action="${action.id}" role="button" aria-label="${action.label}" tabindex="-1"><span class="hnr1533-overlay-icon">${HNR1533_OVERLAY_ICONS[action.icon]}</span><span class="hnr1533-overlay-label">${action.label}</span></div>`
    ).join("");
}

function hnr1533PlayerRoot() {
  // Netflix can leave the video rendered while hiding every control layer, or
  // briefly replace the video node while changing episodes. Detect the player
  // from its stable /watch route and control host first; do not require visible
  // video pixels before the remote can wake the controls.
  const route = location.pathname.startsWith("/watch/");
  const host = document.querySelector('[data-uia="controls-standard"]');
  const videoNodes = [...document.querySelectorAll("video")].filter(v =>
    v instanceof HTMLVideoElement && v.isConnected && v.getClientRects().length
  );
  const video = videoNodes.find(rendered) || videoNodes[0] || null;
  const hasRect = el => !!el && el.isConnected && el.getClientRects().length > 0;

  // Prefer the smallest ancestor that contains both video and Netflix's main
  // controls. Importantly, don't use rendered() for ancestors: an opacity:0
  // player wrapper is precisely what we need to be able to wake.
  if (video && host) {
    for (let p = video.parentElement; p && p !== document.body; p = p.parentElement) {
      if (!p.contains(host) || !hasRect(p)) continue;
      const r = p.getBoundingClientRect();
      if (r.width >= innerWidth * 0.42 && r.height >= innerHeight * 0.22) return p;
    }
  }

  // Known player shells used across Netflix UI revisions.
  const knownSelectors = [
    '.watch-video--player-view',
    '.watch-video',
    '[data-uia="video-canvas"]',
    '[data-uia="player"]',
    '[data-uia*="player"]'
  ];
  for (const selector of knownSelectors) {
    const el = document.querySelector(selector);
    if (hasRect(el) && (!route || !video || el.contains(video) || (host && el.contains(host)))) return el;
  }

  // The control host is a valid root even when the video/wrapper has no visible
  // layout box; the control list can be scoped to this exact Netflix subtree.
  if (host && host.isConnected) {
    return host.closest('.watch-video--bottom-controls-container, .watch-video--controls-container') || host;
  }
  if (video && video.isConnected) return video.parentElement || video;

  // During playback transitions Netflix may mount controls a moment after the
  // route changes. Keep the route classified as playback only when a known shell
  // exists, rather than accidentally treating the More Info preview as a player.
  if (route) {
    const shell = document.querySelector(
      '.watch-video--bottom-controls-container, .watch-video--top-controls-container, .watch-video--controls-container'
    );
    if (shell && shell.isConnected) return shell;
  }
  return null;
}
function hnr1533IsPlayerActive() {
  // On the actual Netflix /watch route, don't gate remote ownership on video
  // visibility. Netflix can temporarily hide/replace its video node while the
  // controls remain mounted; the More Info preview is not on this route.
  if (!location.pathname.startsWith("/watch/")) return false;
  return !!(
    document.querySelector("video") ||
    document.querySelector('[data-uia="controls-standard"]') ||
    document.querySelector('.watch-video--player-view, .watch-video--bottom-controls-container, .watch-video--top-controls-container, .watch-video--controls-container')
  );
}
function hnr1533PlayerBack() {
  if (hnr1533KeyboardVisible) { closeSearch(); return; }
  const root = hnr1533PlayerRoot();
  const nativeBack = hnr1533PlayerControls(root).find(el => {
    const id = `${el.getAttribute("data-uia") || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.toLowerCase();
    return /(?:^|[\s_-])(?:control-)?back(?:$|[\s_-])|back to browse|exit player/.test(id) &&
      !/rewind|seek|seconds/.test(id);
  });
  hnr1533StopPlayerFocusMode();
  if (nativeBack) {
    nativeBack.click();
    status("Back to Netflix");
    return;
  }
  status("Back to Netflix");
  if (history.length > 1) history.back();
  else location.href = "https://www.netflix.com/browse";
}
function hnr1533EnsurePlayerOverlay() {
  if (hnr1533PlayerOverlay?.isConnected) return hnr1533PlayerOverlay;
  const overlay = document.createElement("div");
  overlay.id = "hnr1533-player-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "TV player remote");
  overlay.innerHTML = hnr1533RenderOverlayMarkup();
  overlay.addEventListener("mousedown", event => event.preventDefault());
  overlay.addEventListener("click", event => {
    const id = event.target.closest("[data-action]")?.dataset.action;
    if (id) hnr1533RunOverlayAction(id);
  });
  document.documentElement.append(overlay);
  hnr1533PlayerOverlay = overlay;
  return overlay;
}
function hnr1533CurrentWatchKey() {
  const m = location.pathname.match(/^\/watch\/(\d+)/);
  return m ? m[1] : '';
}
function hnr1533EpisodeMetadataEvidence() {
  const title = document.querySelector('[data-uia="video-title"]');
  if (!title) return false;
  const text = norm(title.innerText || title.textContent || '');
  const spans = title.querySelectorAll('span');
  // Netflix's observed episode title block has a series heading plus separate
  // season/episode and episode-title spans. Plain movie titles do not.
  if (title.querySelector('h4') && spans.length >= 2) return true;
  return /\b(?:season\s+\d+|episode\s+\d+|s\d{1,2}\s*e\d{1,2})\b/i.test(text);
}
function hnr1533CorePlayerControlsMounted() {
  const host = document.querySelector('[data-uia="controls-standard"]');
  if (!host) return false;
  const play = host.querySelector('[data-uia^="control-play-pause"],button[aria-label="Play"],button[aria-label="Pause"]');
  const audio = host.querySelector('[data-uia="control-audio-subtitle"],button[aria-label*="Audio" i][aria-label*="Subtitle" i]');
  const seek = host.querySelector('[data-uia="control-back10"], [data-uia="control-forward10"]');
  const buttonCount = host.querySelectorAll('button,[role="button"]').length;
  return !!(play && audio && (seek || buttonCount >= 5));
}
function hnr1533RememberEpisodeCapability(value, watchKey = hnr1533CurrentWatchKey()) {
  if (!watchKey) return;
  hnr1533EpisodeCapabilityByWatch.set(watchKey, !!value);
  try { sessionStorage.setItem(`hnr1533:episode-capability:${watchKey}`, value ? 'series' : 'movie'); } catch {}
  try {
    sessionStorage.setItem('hnr1533:last-episode-capability', JSON.stringify({ watchKey, value: !!value, at: Date.now() }));
  } catch {}
}
function hnr1533HasEpisodeCapability() {
  const watchKey = hnr1533CurrentWatchKey();
  if (!watchKey) return false;
  const nativeButton = [...document.querySelectorAll(
    '[data-uia="control-episodes"],button[aria-label="Episodes"],[aria-label="Episodes"]'
  )].some(el => el instanceof HTMLElement && el.isConnected &&
    !el.closest('#hnr1533-player-overlay') && !el.closest('[data-uia^="modal-motion-container"]'));
  const rowsPresent = hnr1533PlayerEpisodeItems().length > 0 || !!hnr1533PlayerEpisodeOverlay();
  const episodicMetadata = hnr1533EpisodeMetadataEvidence();
  if (nativeButton || rowsPresent || episodicMetadata) {
    hnr1533RememberEpisodeCapability(true, watchKey);
    return true;
  }
  // A positive classification survives Netflix unmounting/fading its controls.
  if (hnr1533EpisodeCapabilityByWatch.has(watchKey)) return hnr1533EpisodeCapabilityByWatch.get(watchKey);
  let persisted = '';
  try { persisted = sessionStorage.getItem(`hnr1533:episode-capability:${watchKey}`) || ''; } catch {}
  if (persisted === 'series') { hnr1533EpisodeCapabilityByWatch.set(watchKey, true); return true; }
  if (persisted === 'movie') { hnr1533EpisodeCapabilityByWatch.set(watchKey, false); return false; }

  // Do not classify a title as a movie while Netflix is still mounting the UI.
  // Only a complete, stable native control row with no episode evidence can set
  // the negative cache, so the Episodes action remains hidden for real movies.
  if (hnr1533CorePlayerControlsMounted()) {
    const since = hnr1533EpisodeCapabilityProbe.get(watchKey) || Date.now();
    hnr1533EpisodeCapabilityProbe.set(watchKey, since);
    if (Date.now() - since >= 1800) {
      hnr1533RememberEpisodeCapability(false, watchKey);
      return false;
    }
  } else {
    hnr1533EpisodeCapabilityProbe.delete(watchKey);
  }

  // After an episode selection, a refresh may load a new watch ID before the
  // controls appear. Carry recent positive classification forward provisionally,
  // but do not cache it on the new ID: once a complete control bar appears, the
  // absence of episode capability can still classify a movie correctly.
  try {
    const last = JSON.parse(sessionStorage.getItem('hnr1533:last-episode-capability') || 'null');
    if (last?.value === true && last.watchKey !== watchKey && Date.now() - Number(last.at || 0) < 90000) {
      return true;
    }
  } catch {}
  return false;
}
function hnr1533VisibleOverlayItems() {
  return hnr1533PlayerOverlay
    ? [...hnr1533PlayerOverlay.querySelectorAll('.hnr1533-overlay-item')].filter(item => !item.hidden)
    : [];
}
function hnr1533UpdatePlayerOverlay() {
  const overlay = hnr1533PlayerOverlay;
  if (!overlay) return;
  const episodeAction = overlay.querySelector('[data-action="episodes"]');
  if (episodeAction) episodeAction.hidden = !hnr1533HasEpisodeCapability();
  const items = hnr1533VisibleOverlayItems();
  if (items.length) hnr1533PlayerOverlayIndex = Math.max(0, Math.min(items.length - 1, hnr1533PlayerOverlayIndex));
  else hnr1533PlayerOverlayIndex = 0;
  items.forEach((item, index) => item.classList.toggle('selected', index === hnr1533PlayerOverlayIndex));
  [...overlay.querySelectorAll('.hnr1533-overlay-item[hidden]')].forEach(item => item.classList.remove('selected'));
}
function hnr1533ShowOverlayMain() {
  const overlay = hnr1533EnsurePlayerOverlay();
  hnr1533OverlayMode = "main";
  hnr1533PlayerOverlayIndex = 0;
  overlay.classList.remove("hnr1533-episodes-mode");
  overlay.innerHTML = hnr1533RenderOverlayMarkup();
  hnr1533UpdatePlayerOverlay();
}
function hnr1533DispatchTabPulse(source, backwards = false) {
  const target = source instanceof HTMLElement && source.isConnected
    ? source
    : (document.activeElement instanceof HTMLElement ? document.activeElement : document.body);
  const options = {
    key: "Tab", code: "Tab", keyCode: 9, which: 9,
    bubbles: true, cancelable: true, composed: true,
    shiftKey: !!backwards
  };
  // Dispatch the key event so Netflix can react to keyboard activity, then
  // explicitly move focus because synthetic Tab events do not invoke the
  // browser's built-in sequential focus navigation.
  try { target.dispatchEvent(new KeyboardEvent("keydown", options)); } catch {}
  try { target.dispatchEvent(new KeyboardEvent("keyup", options)); } catch {}
}

function hnr1533FocusNativeTabStop(preferredPattern = null) {
  // Netflix's real Tab key wakes the controls. Approximate that behavior without
  // CDP or moving the OS cursor: send Tab events, then advance actual DOM focus
  // through the mounted player tab stops one by one.
  if (!location.pathname.startsWith('/watch/')) return false;
  const root = hnr1533PlayerRoot();
  if (root) hnr1533KeepPlayerVisible(root);

  const selector = [
    '[data-uia="controls-standard"] button:not([disabled])',
    '[data-uia="controls-standard"] a[href]',
    '.watch-video--top-controls-container button:not([disabled])',
    '.watch-video--bottom-controls-container button:not([disabled])',
    '.watch-video--controls-container button:not([disabled])',
    '.watch-video--skip-content button:not([disabled])',
    '[data-uia="control-episodes"]',
    '[data-uia^="control-"]',
    '[data-uia="player-skip-intro"]',
    '[data-uia="player-skip-recap"]',
    '[data-uia="player"][tabindex]',
    '.watch-video--player-view[tabindex]',
    'button:not([disabled])[tabindex]:not([tabindex="-1"])',
    '[role="button"][tabindex]:not([tabindex="-1"])',
    '[role="slider"][tabindex]:not([tabindex="-1"])'
  ].join(',');

  const isMountedTabStop = el => {
    if (!(el instanceof HTMLElement) || !el.isConnected || el.closest('#hnr1533-player-overlay')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.matches(':disabled')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 5 || r.height < 5) return false;
    // Do not filter opacity:0: hidden opacity is the exact state we need to wake.
    const inPlayerTree = (root && root.contains(el)) || !!el.closest(
      '.watch-video--top-controls-container,.watch-video--bottom-controls-container,.watch-video--controls-container,.watch-video--skip-content,[data-uia="controls-standard"],[data-uia="episode-selector"]'
    ) || el.matches('[data-uia="player"][tabindex],.watch-video--player-view[tabindex]');
    return !!inPlayerTree && (el.tabIndex >= 0 || el.matches('button,a[href],[role="button"],[role="slider"]'));
  };

  const stops = [...new Set([...document.querySelectorAll(selector)])].filter(isMountedTabStop);
  if (!stops.length) {
    const surface = root?.querySelector?.('[data-uia="player"][tabindex]') ||
      document.querySelector('[data-uia="player"][tabindex]') ||
      hnr1533Video();
    if (surface instanceof HTMLElement) {
      hnr1533DispatchTabPulse(surface, false);
      try { surface.focus({ preventScroll: true }); } catch { try { surface.focus(); } catch {} }
      hnr1533PlayerHoldUntil = Date.now() + 4500;
      return document.activeElement === surface;
    }
    return false;
  }

  let desiredIndex = -1;
  if (preferredPattern instanceof RegExp) {
    desiredIndex = stops.findIndex(el => {
      const text = `${el.getAttribute('data-uia') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.innerText || ''} ${el.parentElement?.getAttribute('class') || ''}`;
      preferredPattern.lastIndex = 0;
      return preferredPattern.test(text);
    });
  }

  const activeIndex = stops.findIndex(el =>
    el === document.activeElement || el.contains(document.activeElement)
  );

  if (desiredIndex < 0) {
    desiredIndex = activeIndex >= 0 ? (activeIndex + 1) % stops.length : 0;
  }

  // Walk the actual player tab stops, sending a Tab pulse at every transition.
  // If we cannot infer a useful current stop, start from the first player stop.
  let currentIndex = activeIndex;
  if (currentIndex < 0) {
    const current = document.activeElement instanceof HTMLElement ? document.activeElement :
      root?.querySelector?.('[data-uia="player"][tabindex]') || document.body;
    hnr1533DispatchTabPulse(current, false);
    try { stops[0].focus({ preventScroll: true }); } catch { try { stops[0].focus(); } catch {} }
    currentIndex = 0;
  }

  if (currentIndex === desiredIndex) {
    // Even when already on the requested control, a Tab key pulse is useful to
    // reset Netflix's inactivity state. Restore focus after the pulse.
    hnr1533DispatchTabPulse(stops[currentIndex], false);
    try { stops[desiredIndex].focus({ preventScroll: true }); } catch { try { stops[desiredIndex].focus(); } catch {} }
  } else {
    const forwardDistance = (desiredIndex - currentIndex + stops.length) % stops.length;
    const backwardDistance = (currentIndex - desiredIndex + stops.length) % stops.length;
    const backwards = backwardDistance < forwardDistance;
    const steps = Math.min(12, backwards ? backwardDistance : forwardDistance);
    for (let step = 0; step < steps; step++) {
      const nextIndex = (currentIndex + (backwards ? -1 : 1) + stops.length) % stops.length;
      hnr1533DispatchTabPulse(stops[currentIndex], backwards);
      try { stops[nextIndex].focus({ preventScroll: true }); }
      catch { try { stops[nextIndex].focus(); } catch {} }
      currentIndex = nextIndex;
    }
    // If the target was not reached within the bounded traversal, focus it after
    // one final Tab pulse rather than getting trapped in a long focus loop.
    if (currentIndex !== desiredIndex) {
      hnr1533DispatchTabPulse(stops[currentIndex], false);
      try { stops[desiredIndex].focus({ preventScroll: true }); }
      catch { try { stops[desiredIndex].focus(); } catch {} }
    }
  }

  const target = stops[desiredIndex];
  const child = target.querySelector?.('button,[role="button"],a[href],[tabindex="0"]');
  if (document.activeElement !== target && child instanceof HTMLElement) {
    try { child.focus({ preventScroll: true }); } catch {}
  }
  hnr1533PlayerHoldUntil = Date.now() + 4500;
  hnr1533PlayerLastFocusPulse = Date.now();
  if (root) hnr1533KeepPlayerVisible(root);
  return !!(document.activeElement === target || root?.contains(document.activeElement));
}

function hnr1533DispatchNativeShortcut(key, { shiftKey = false, preferredPattern = null } = {}) {
  if (!location.pathname.startsWith('/watch/')) return false;
  const root = hnr1533PlayerRoot();
  if (root) hnr1533KeepPlayerVisible(root);

  // Wake/establish a native player focus before sending Netflix's shortcut.
  hnr1533FocusNativeTabStop(preferredPattern);
  let target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (!target || target.closest('#hnr1533-player-overlay') ||
      !(root?.contains(target) || target.closest('.watch-video--skip-content,[data-uia="episode-selector"]'))) {
    target = root?.querySelector?.('[data-uia="player"][tabindex]') ||
      document.querySelector('[data-uia="player"][tabindex]') ||
      hnr1533Video() || root;
  }
  if (!(target instanceof HTMLElement)) return false;

  const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
  const options = {
    key, code, shiftKey: !!shiftKey, bubbles: true, cancelable: true,
    composed: true, repeat: false
  };
  const oldGuard = hnr1533DispatchingNativeShortcut;
  hnr1533DispatchingNativeShortcut = true;
  try {
    target.dispatchEvent(new KeyboardEvent('keydown', options));
    if (key.length === 1) {
      target.dispatchEvent(new KeyboardEvent('keypress', {
        ...options, charCode: key.toLowerCase() === key ? key.charCodeAt(0) : 0
      }));
    }
    target.dispatchEvent(new KeyboardEvent('keyup', options));
  } finally {
    hnr1533DispatchingNativeShortcut = oldGuard;
  }
  return true;
}

function hnr1533NativeEpisodesButton(root = hnr1533PlayerRoot()) {
  const candidates = [...document.querySelectorAll('[data-uia="control-episodes"], button[aria-label="Episodes"], [aria-label="Episodes"]')]
    .filter(el => el instanceof HTMLElement && el.isConnected && rendered(el) && !el.closest('#hnr1533-player-overlay'));
  return candidates.find(el => root?.contains(el)) || candidates[0] || null;
}
function hnr1533RevealNativeEpisode(item) {
  if (!(item instanceof HTMLElement) || !item.isConnected) return;
  // Netflix's episode menu may be its own scroll pane. Scroll that pane instead
  // of only changing document scroll, and keep a small margin around the row.
  try { item.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }); } catch {}
  const er = item.getBoundingClientRect();
  for (let n = item.parentElement; n && n !== document.body; n = n.parentElement) {
    if (n.closest?.("#hnr1533-player-overlay")) break;
    const cs = getComputedStyle(n);
    const scrollable = n.scrollHeight > n.clientHeight + 2 && /(auto|scroll|hidden|clip)/.test(cs.overflowY || "");
    if (!scrollable) continue;
    const nr = n.getBoundingClientRect();
    const margin = Math.min(28, Math.max(12, er.height * 0.15));
    if (er.top < nr.top + margin) n.scrollTop -= (nr.top + margin - er.top);
    else if (er.bottom > nr.bottom - margin) n.scrollTop += (er.bottom - (nr.bottom - margin));
    // Scroll the nearest actual list viewport, not every ancestor.
    break;
  }
  const refreshed = item.getBoundingClientRect();
  if (refreshed.top < 0 || refreshed.bottom > innerHeight) {
    try { item.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }); } catch {}
  }
}
function hnr1533NativeEpisodeRowKey(row) {
  if (!(row instanceof HTMLElement)) return "";
  if (row.id) return `id:${row.id}`;
  const labelText = norm(row.getAttribute("aria-label") || row.innerText || row.textContent).slice(0, 100);
  const index = hnr1533PlayerEpisodeItems().indexOf(row);
  return `label:${labelText}|${index}`;
}
function hnr1533FocusNativeEpisode(item) {
  if (!(item instanceof HTMLElement) || !item.isConnected || !rendered(item)) return false;
  const newKey = hnr1533NativeEpisodeRowKey(item);
  if (hnr1533EpisodeSelectionArmedKey && newKey !== hnr1533EpisodeSelectionArmedKey) {
    hnr1533EpisodeSelectionArmedKey = "";
  }
  hnr1533NativeEpisodeMode = true;
  const currentRows = hnr1533PlayerEpisodeItems();
  const itemIndex = currentRows.indexOf(item);
  if (itemIndex >= 0) hnr1533NativeEpisodeIndex = itemIndex;
  // Hide only the extension overlay; leave Netflix's real tray alone.
  hnr1533EnsurePlayerOverlay().hidden = true;
  if (!item.matches('button,a[href],[tabindex]')) item.setAttribute('tabindex', '-1');
  hnr1533RevealNativeEpisode(item);
  const focused = focus(item);
  // A separate extension-owned border guarantees a visible yellow square even
  // when Netflix's own row styles override outline/focus styles.
  requestAnimationFrame(() => hnr1533UpdateNativeEpisodeFocusRing(item));
  setTimeout(() => hnr1533UpdateNativeEpisodeFocusRing(item), 70);
  return focused;
}
function hnr1533PlayerWakeTarget(root = hnr1533PlayerRoot()) {
  return document.querySelector('[data-uia="player"][tabindex]') ||
    document.querySelector('.watch-video--player-view') ||
    hnr1533Video() || root || null;
}
function hnr1533RequestPagePlayerWake(target = hnr1533PlayerWakeTarget()) {
  // Safe fallback only: dispatch page-level hover/move events. This never uses
  // chrome.debugger, never attaches a debugger, and never moves the OS cursor.
  if (!location.pathname.startsWith('/watch/')) return false;
  const node = target && target.isConnected ? target : hnr1533PlayerWakeTarget();
  if (!node) return false;
  return hnr1533PulsePlayerPointer(node);
}
function hnr1533PulsePlayerPointer(target = hnr1533PlayerRoot()) {
  // Page-level fallback: send a complete hover/move sequence to the element at
  // the coordinates rather than dispatching events on a huge parent shell.
  const now = Date.now();
  if (!target || !target.isConnected || now - hnr1533LastPointerPulseAt < 180) return false;
  hnr1533LastPointerPulseAt = now;
  const r = target.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const x = Math.round(Math.max(2, Math.min(innerWidth - 2, r.left + Math.min(r.width - 1, Math.max(1, r.width * 0.52)))));
  const y = Math.round(Math.max(2, Math.min(innerHeight - 2, r.top + Math.min(r.height - 1, Math.max(1, r.height * 0.72)))));
  const hit = document.elementFromPoint(x, y);
  const dispatchTarget = hit instanceof HTMLElement && (target.contains(hit) || hit.contains(target)) ? hit : target;
  const common = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: 0 };
  try { dispatchTarget.dispatchEvent(new PointerEvent('pointerover', { ...common, pointerId: 1, pointerType: 'mouse', isPrimary: true })); } catch {}
  try { dispatchTarget.dispatchEvent(new MouseEvent('mouseover', common)); } catch {}
  try { dispatchTarget.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 1, pointerType: 'mouse', isPrimary: true })); } catch {}
  try { dispatchTarget.dispatchEvent(new MouseEvent('mousemove', common)); } catch {}
  try { document.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 1, pointerType: 'mouse', isPrimary: true })); } catch {}
  try { document.dispatchEvent(new MouseEvent('mousemove', common)); } catch {}
  return true;
}
function hnr1533CurrentNativeEpisode(rows) {
  if (!rows?.length) return null;
  const activeSelectors = [
    '[aria-current]:not([aria-current="false"])', '[aria-selected="true"]', '[aria-pressed="true"]',
    '[data-selected="true"]', '[data-current="true"]', '.episode-current', '.episode-selected',
    '.current-episode', '.selected-episode', '.playing', '[data-uia*="current-episode"]',
    '[class*="episode-selected" i]', '[class*="episode-current" i]', '[class*="titleCard--selected" i]'
  ];
  for (const row of rows) {
    const marker = `${row.className || ""} ${row.getAttribute("data-uia") || ""} ${row.getAttribute("data-testid") || ""}`.toLowerCase();
    if (/episode-(current|selected)|current-episode|selected-episode|titlecard--selected|playing/.test(marker)) return row;
    if (activeSelectors.some(sel => { try { return row.matches(sel) || !!row.querySelector(sel); } catch { return false; } })) return row;
  }
  // If this build already activated an episode in this player route, preserve
  // its row index as a fallback for Netflix versions that expose no current flag.
  if (hnr1533LastActivatedEpisodeIndex !== null && hnr1533LastActivatedEpisodeRoute === location.pathname) {
    return rows[Math.min(hnr1533LastActivatedEpisodeIndex, rows.length - 1)] || null;
  }
  return null;
}
function hnr1533FindEpisodeActionTarget(row) {
  if (!(row instanceof HTMLElement) || !row.isConnected) return null;
  const selectors = [
    '[data-uia*="play-button"]', '[data-uia*="episode-option"] button',
    'button[aria-label*="Play" i]', '[role="button"]', 'button', 'a[href]', '[role="option"]'
  ];
  for (const selector of selectors) {
    const child = row.matches(selector) ? row : row.querySelector(selector);
    if (child instanceof HTMLElement && child.isConnected && rendered(child)) return child;
  }
  return row;
}
function hnr1533WaitForNativeEpisodeRows(attempt = 0) {
  if (!hnr1533NativeEpisodeMode) return;
  const rows = hnr1533PlayerEpisodeItems();
  if (rows.length) {
    if (hnr1533PendingEpisodeStep) {
      const direction = hnr1533PendingEpisodeStep;
      hnr1533PendingEpisodeStep = null;
      // For a step action, never assume row 0 is the playing episode. Only
      // advance when Netflix exposes an explicit current/selected row marker.
      const current = hnr1533CurrentNativeEpisode(rows);
      if (!current) {
        hnr1533FocusNativeEpisode(rows[0]);
        status("Native list open; Netflix did not mark the playing episode. Use yellow arrows to choose one.");
        return;
      }
      const index = rows.indexOf(current);
      const next = rows[index + (direction === "next" ? 1 : -1)];
      if (next) {
        hnr1533FocusNativeEpisode(current);
        status(`Opening ${norm(next.getAttribute("aria-label") || next.innerText || next.textContent).slice(0, 50)}…`);
        setTimeout(() => hnr1533ActivateNativeEpisode(next), 120);
        return;
      }
      hnr1533FocusNativeEpisode(current);
      status(direction === "next" ? "Already at the last detected episode" : "Already at the first detected episode");
      return;
    }
    let current = rows.find(row => row === selected || row.contains(selected) || selected?.contains?.(row));
    if (!current) current = hnr1533CurrentNativeEpisode(rows) || rows[Math.min(hnr1533NativeEpisodeIndex, rows.length - 1)] || rows[0];
    hnr1533FocusNativeEpisode(current);
    status(`Netflix episodes · ${rows.length} live rows · arrows move · OK selects`);
    return;
  }
  if (attempt >= 18) {
    if (hnr1533EpisodeAutoReopenPaused) {
      status('Episode changed; Episodes tray left as Netflix currently shows it');
    } else {
      status('Waiting for Netflix episode list; reopening automatically');
      hnr1533RetryNativeEpisodeTray();
    }
    return;
  }
  hnr1533NativeEpisodePollTimer = setTimeout(() => hnr1533WaitForNativeEpisodeRows(attempt + 1), 140);
}
function hnr1533StartNativeEpisodeWatch() {
  clearTimeout(hnr1533NativeEpisodeWatchTimer);
  const tick = () => {
    if (!hnr1533NativeEpisodeMode) return;
    const rows = hnr1533PlayerEpisodeItems();
    if (rows.length) {
      hnr1533KeepPlayerVisible(hnr1533PlayerRoot());
      const selectedStillLive = rows.some(row => row === selected || row.contains(selected) || selected?.contains?.(row));
      if (!selectedStillLive) hnr1533FocusNativeEpisode(rows[Math.min(hnr1533NativeEpisodeIndex, rows.length - 1)] || rows[0]);
    } else {
      // After a confirmed episode switch, do not automatically reopen the tray.
      // A fresh Episodes action re-enables reopening if the user wants the list.
      if (!hnr1533EpisodeAutoReopenPaused && Date.now() - hnr1533NativeEpisodeOpenAt > 2200) {
        hnr1533OpenNativeEpisodeTray();
      }
    }
    hnr1533NativeEpisodeWatchTimer = setTimeout(tick, rows.length ? 300 : 450);
  };
  hnr1533NativeEpisodeWatchTimer = setTimeout(tick, 250);
}
function hnr1533StopNativeEpisodeWatch() {
  clearTimeout(hnr1533NativeEpisodeWatchTimer);
  hnr1533NativeEpisodeWatchTimer = 0;
}
function hnr1533EnterNativeEpisodes() {
  hnr1533EpisodeAutoReopenPaused = false;
  hnr1533EpisodeSelectionArmedKey = "";
  clearSelection();
  const staleRing = document.getElementById("hnr1533-native-episode-focus-ring");
  if (staleRing) staleRing.hidden = true;
  const root = hnr1533PlayerRoot();
  if (root) {
    hnr1533KeepPlayerVisible(root);
    hnr1533FocusPlayerSurface(root);
    // Cycle the live native player tab stops toward Episodes to wake Netflix's
    // controls using the same focus behavior as a physical Tab press.
    hnr1533FocusNativeTabStop(/episodes?/i);
    hnr1533PulsePlayerPointer(hnr1533PlayerWakeTarget(root));
    hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(root));
  } else {
    hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(null));
  }
  hnr1533NativeEpisodeMode = true;
  hnr1533NativeEpisodeClickPending = false;
  hnr1533NativeEpisodeIndex = 0;
  clearTimeout(hnr1533NativeEpisodePollTimer);
  hnr1533EnsurePlayerOverlay().hidden = true;
  hnr1533StartNativeEpisodeWatch();

  const rows = hnr1533PlayerEpisodeItems();
  if (rows.length) {
    const initial = hnr1533CurrentNativeEpisode(rows) || rows[0];
    hnr1533FocusNativeEpisode(initial);
    status(`Netflix episodes · ${rows.length} live rows`);
    return;
  }
  // Open the native tray through the same wake-and-activate path used for
  // native player controls. The watch loop reopens it if Netflix unmounts it.
  setTimeout(() => {
    if (hnr1533NativeEpisodeMode && !hnr1533PlayerEpisodeItems().length) {
      hnr1533OpenNativeEpisodeTray(root);
    }
  }, 90);
  status('Waking player and opening Netflix episode list');
  hnr1533WaitForNativeEpisodeRows();
}
function hnr1533RetryNativeEpisodeTray() {
  if (!hnr1533NativeEpisodeMode) return;
  const rows = hnr1533PlayerEpisodeItems();
  if (rows.length) {
    const current = rows.find(row => row === selected || row.contains(selected) || selected?.contains?.(row));
    if (!current) hnr1533FocusNativeEpisode(rows[0]);
    return;
  }
  // Netflix sometimes removes the tray subtree. Reopen it automatically, but
  // throttle clicks so a stream of remote keys cannot toggle it repeatedly.
  if (Date.now() - hnr1533NativeEpisodeOpenAt > 2200) {
    hnr1533OpenNativeEpisodeTray();
  }
  clearTimeout(hnr1533NativeEpisodePollTimer);
  hnr1533WaitForNativeEpisodeRows();
}
function hnr1533HasLiveEpisodeTray() {
  return hnr1533PlayerEpisodeItems().length > 0;
}
function hnr1533HasLiveAudioTray() {
  return !!hnr1533NativeAudioMenuRoot() && hnr1533AudioOptionRows().length > 0;
}
function hnr1533DispatchNativeMenuEscape(target) {
  const node = target instanceof HTMLElement && target.isConnected
    ? target
    : (document.activeElement instanceof HTMLElement ? document.activeElement : document.body);
  const opts = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27,
    bubbles: true, cancelable: true, composed: true };
  // Bypass the extension's capture handler for these synthetic events so Netflix gets
  // Escape instead of recursively reopening/exiting the extension's mode.
  hnr1533BypassKeyRouter = true;
  try {
    node.dispatchEvent(new KeyboardEvent('keydown', opts));
    node.dispatchEvent(new KeyboardEvent('keyup', opts));
  } catch {}
  finally { hnr1533BypassKeyRouter = false; }
}
function hnr1533DispatchNativeClickAt(hit, x, y) {
  if (!(hit instanceof HTMLElement) || !hit.isConnected) return false;
  const common = { bubbles:true, cancelable:true, composed:true, view:window,
    clientX:x, clientY:y, screenX:x, screenY:y, button:0, buttons:0, detail:1 };
  try {
    hit.dispatchEvent(new PointerEvent('pointerover', {...common, pointerId:1, pointerType:'mouse', isPrimary:true}));
    hit.dispatchEvent(new MouseEvent('mouseover', common));
    hit.dispatchEvent(new PointerEvent('pointerdown', {...common, pointerId:1, pointerType:'mouse', isPrimary:true, buttons:1}));
    hit.dispatchEvent(new MouseEvent('mousedown', {...common, buttons:1}));
    hit.dispatchEvent(new PointerEvent('pointerup', {...common, pointerId:1, pointerType:'mouse', isPrimary:true, buttons:0}));
    hit.dispatchEvent(new MouseEvent('mouseup', common));
    hit.dispatchEvent(new MouseEvent('click', common));
    return true;
  } catch { return false; }
}
function hnr1533ClickOutsideNativeMenu(kind, menuRoot) {
  const player = hnr1533PlayerRoot();
  if (!player || !player.isConnected) return false;
  const pr = player.getBoundingClientRect();
  if (pr.width < 80 || pr.height < 80) return false;
  const mr = menuRoot?.getBoundingClientRect?.();
  const insideMenu = (x,y) => !!(menuRoot?.isConnected && mr &&
    x >= mr.left - 4 && x <= mr.right + 4 && y >= mr.top - 4 && y <= mr.bottom + 4);
  const forbidden = [
    '#hnr1533-player-overlay', '#hnr1533-keyboard', '#hnr1533-status',
    '[data-uia="controls-standard"]', '.watch-video--top-controls-container',
    '.watch-video--bottom-controls-container', '.watch-video--controls-container',
    'button', 'a[href]', '[role="button"]', '[role="option"]', '[role="radio"]',
    '[role="slider"]', 'input', 'textarea'
  ].join(',');
  // Probe around the player perimeter, away from menu bounds and controls.
  const points = [
    [0.06,0.46], [0.94,0.46], [0.08,0.28], [0.92,0.28],
    [0.22,0.16], [0.78,0.16], [0.22,0.82], [0.78,0.82]
  ];
  for (const [fx,fy] of points) {
    const x = Math.round(pr.left + pr.width * fx);
    const y = Math.round(pr.top + pr.height * fy);
    if (x < 2 || y < 2 || x > innerWidth-2 || y > innerHeight-2 || insideMenu(x,y)) continue;
    const hit = document.elementFromPoint(x,y);
    if (!(hit instanceof HTMLElement) || !player.contains(hit) || hit.closest(forbidden)) continue;
    if (kind === 'episodes' && hit.closest('[id^="selector-episode-option-"],[data-uia="episode-selector"]')) continue;
    if (kind === 'audio' && hit.closest('.track-list-container,.track-list-audio,.track-list-subtitle,[data-uia*="audio-subtitle" i]')) continue;
    if (hit instanceof HTMLVideoElement) continue;
    if (hnr1533DispatchNativeClickAt(hit,x,y)) return true;
  }
  return false;
}
function hnr1533FindNativeMenuTrigger(kind) {
  const selectors = kind === 'episodes'
    ? '[data-uia="control-episodes"],button[aria-label="Episodes"],[aria-label="Episodes"]'
    : '[data-uia="control-audio-subtitle"],[data-uia*="audio-subtitle" i],button[aria-label*="Audio & Subtitles" i],button[aria-label*="Audio and Subtitles" i]';
  const root = hnr1533PlayerRoot();
  const candidates = [...document.querySelectorAll(selectors)].filter(el => {
    if (!(el instanceof HTMLElement) || !el.isConnected || el.closest('#hnr1533-player-overlay')) return false;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    // Accept opacity:0 controls: Netflix often fades without unmounting them.
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 3 && r.height > 3 &&
      (root?.contains(el) || el.matches('[data-uia="control-episodes"],[data-uia="control-audio-subtitle"]'));
  });
  return candidates[0] || null;
}
function hnr1533ScheduleNativeMenuDismiss(kind, menuRoot, oldTrigger) {
  const isOpen = kind === 'episodes' ? hnr1533HasLiveEpisodeTray : hnr1533HasLiveAudioTray;
  const name = kind === 'episodes' ? 'episode list' : 'Audio & Subtitles menu';
  if (!isOpen()) { status(`${name} closed`); return; }
  const firstRows = kind === 'episodes' ? hnr1533PlayerEpisodeItems() : hnr1533AudioOptionRows();
  const startTarget = firstRows.find(row => row === selected || row.contains(selected)) || firstRows[0] || menuRoot || oldTrigger;
  hnr1533DispatchNativeMenuEscape(startTarget);
  status(`Closing ${name}…`);

  setTimeout(() => {
    if (!isOpen()) { status(`${name} closed`); return; }
    // Netflix did not dismiss from Escape. Wake tab stops and toggle its native
    // trigger only after confirming the tray is still present.
    hnr1533FocusNativeTabStop(kind === 'episodes' ? /episodes?/i : /audio|subtitle|caption/i);
    const trigger = hnr1533FindNativeMenuTrigger(kind) || oldTrigger;
    if (trigger?.isConnected) {
      try { trigger.focus({preventScroll:true}); } catch {}
      hnr1533SimulatePointerClick(trigger, trigger, true);
    }
    setTimeout(() => {
      if (!isOpen()) { status(`${name} closed`); return; }
      // Last resort: click an inert point outside the mounted native menu.
      const latestRoot = kind === 'episodes'
        ? document.querySelector('[data-uia="episode-selector"],[data-uia*="episode-selector"]') || hnr1533PlayerEpisodeItems()[0]?.parentElement
        : hnr1533NativeAudioMenuRoot();
      const sent = hnr1533ClickOutsideNativeMenu(kind, latestRoot || menuRoot);
      setTimeout(() => {
        if (!isOpen()) status(`${name} closed`);
        else status(`${name} is still open · press Back again to retry`);
      }, sent ? 280 : 180);
    }, 220);
  }, 200);
}

function hnr1533ExitNativeEpisodes(closeTray = true) {
  hnr1533EpisodeSelectionArmedKey = "";
  const wasOpen = hnr1533NativeEpisodeMode;
  const rowsWereMounted = hnr1533PlayerEpisodeItems().length > 0;
  const trayRoot = document.querySelector('[data-uia="episode-selector"], [data-uia*="episode-selector"]') || hnr1533PlayerEpisodeItems()[0]?.parentElement || null;
  const trayPresent = rowsWereMounted || !!(trayRoot && rendered(trayRoot));
  const root = hnr1533PlayerRoot();
  const trigger = hnr1533FindNativeMenuTrigger('episodes') || hnr1533NativeEpisodesButton(root);
  hnr1533NativeEpisodeMode = false;
  hnr1533NativeEpisodeClickPending = false;
  clearTimeout(hnr1533NativeEpisodePollTimer);
  hnr1533StopNativeEpisodeWatch();
  const focusRing = document.getElementById("hnr1533-native-episode-focus-ring");
  if (focusRing) focusRing.hidden = true;
  // Also run on a repeated Escape when the extension mode was previously exited but
  // Netflix kept the actual tray mounted.
  if (closeTray && trayPresent) hnr1533ScheduleNativeMenuDismiss('episodes', trayRoot, trigger);
  hnr1533ShowOverlayMain();
  hnr1533EnsurePlayerOverlay().hidden = false;
  if (trigger?.isConnected) focus(trigger);
  else {
    const controls = hnr1533PlayerControls(root);
    const initial = hnr1533DefaultPlayerControl(controls);
    if (initial) focus(initial);
  }
  if (!closeTray || !trayPresent) status('Episode focus closed · back to player controls');
}
function hnr1533SimulatePointerClick(target, row = null, forceTarget = false) {
  if (!(target instanceof HTMLElement) || !target.isConnected) return false;
  try { target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }); } catch {}
  if (!target.isConnected) return false;
  const rect = target.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  const x = Math.round(rect.left + rect.width / 2);
  const y = Math.round(rect.top + rect.height / 2);
  const hit = document.elementFromPoint(x, y);
  const allowedHit = hit instanceof HTMLElement && (
    hit === target || target.contains(hit) || hit.contains(target) ||
    (row && (row.contains(hit) || hit.contains(row)))
  );
  const dispatchTarget = !forceTarget && allowedHit ? hit : target;
  const common = {
    bubbles: true, cancelable: true, composed: true, view: window,
    clientX: x, clientY: y, screenX: x, screenY: y,
    button: 0, buttons: 0, detail: 1
  };
  try {
    dispatchTarget.dispatchEvent(new PointerEvent("pointerover", { ...common, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    dispatchTarget.dispatchEvent(new MouseEvent("mouseover", common));
    dispatchTarget.dispatchEvent(new PointerEvent("pointermove", { ...common, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    dispatchTarget.dispatchEvent(new MouseEvent("mousemove", common));
    dispatchTarget.dispatchEvent(new PointerEvent("pointerdown", { ...common, pointerId: 1, pointerType: "mouse", isPrimary: true, buttons: 1 }));
    dispatchTarget.dispatchEvent(new MouseEvent("mousedown", { ...common, buttons: 1 }));
    dispatchTarget.dispatchEvent(new PointerEvent("pointerup", { ...common, pointerId: 1, pointerType: "mouse", isPrimary: true, buttons: 0 }));
    dispatchTarget.dispatchEvent(new MouseEvent("mouseup", common));
    dispatchTarget.dispatchEvent(new MouseEvent("click", { ...common, buttons: 0 }));
    return true;
  } catch (error) {
    status("Synthetic episode click could not be dispatched");
    return false;
  }
}

function hnr1533EnsureNativeEpisodeFocusRing() {
  let ring = document.getElementById("hnr1533-native-episode-focus-ring");
  if (ring?.isConnected) return ring;
  ring = document.createElement("div");
  ring.id = "hnr1533-native-episode-focus-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.hidden = true;
  (document.documentElement || document.body).append(ring);
  return ring;
}
function hnr1533UpdateNativeEpisodeFocusRing(item = selected) {
  const ring = hnr1533EnsureNativeEpisodeFocusRing();
  if (!hnr1533NativeEpisodeMode) { ring.hidden = true; return; }
  const rows = hnr1533PlayerEpisodeItems();
  const row = rows.find(candidate => candidate === item || candidate.contains(item) || item?.contains?.(candidate));
  if (!(row instanceof HTMLElement) || !row.isConnected || !rendered(row)) {
    ring.hidden = true;
    return;
  }
  const r = row.getBoundingClientRect();
  if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) {
    ring.hidden = true;
    return;
  }
  ring.hidden = false;
  ring.style.left = `${Math.round(r.left - 4)}px`;
  ring.style.top = `${Math.round(r.top - 4)}px`;
  ring.style.width = `${Math.round(r.width + 8)}px`;
  ring.style.height = `${Math.round(r.height + 8)}px`;
}

function hnr1533OpenNativeEpisodeTray(root = hnr1533PlayerRoot(), attempt = 0) {
  if (!hnr1533NativeEpisodeMode || hnr1533EpisodeAutoReopenPaused) return false;
  const liveRows = hnr1533PlayerEpisodeItems();
  if (liveRows.length) {
    hnr1533KeepPlayerVisible(root || hnr1533PlayerRoot());
    const current = liveRows.find(row => row === selected || row.contains(selected) || selected?.contains?.(row)) ||
      liveRows[Math.min(hnr1533NativeEpisodeIndex, liveRows.length - 1)] || liveRows[0];
    hnr1533FocusNativeEpisode(current);
    return true;
  }

  const activeRoot = root || hnr1533PlayerRoot();
  if (activeRoot) {
    hnr1533KeepPlayerVisible(activeRoot);
    hnr1533FocusPlayerSurface(activeRoot);
    hnr1533PulsePlayerPointer(hnr1533PlayerWakeTarget(activeRoot));
    hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(activeRoot));
  } else {
    hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(null));
  }

  // Use Netflix's native focus behavior (equivalent to moving onto a Tab stop)
  // to wake the player chrome before looking for/clicking Episodes.
  hnr1533FocusNativeTabStop(/episodes?/i);
  const trigger = hnr1533NativeEpisodesButton(activeRoot);
  if (!trigger) {
    if (attempt < 14) {
      setTimeout(() => hnr1533OpenNativeEpisodeTray(hnr1533PlayerRoot(), attempt + 1), [120,160,200,240,300,360,420][Math.min(attempt,6)]);
    } else {
      status('Wake pulse sent, but Netflix has not mounted the Episodes button yet');
    }
    return false;
  }

  // Avoid toggling the native tray repeatedly while React is rendering it.
  if (Date.now() - hnr1533NativeEpisodeOpenAt < 950) return false;
  hnr1533NativeEpisodeOpenAt = Date.now();
  hnr1533PulsePlayerPointer(trigger);
  hnr1533RequestPagePlayerWake(trigger);
  // Allow the browser-level wake pulse to complete before activating the button.
  setTimeout(() => {
    if (!hnr1533NativeEpisodeMode || hnr1533PlayerEpisodeItems().length) return;
    const liveTrigger = hnr1533NativeEpisodesButton(hnr1533PlayerRoot()) || trigger;
    if (!liveTrigger.isConnected) return;
    const tray = document.querySelector('[data-uia="episode-selector"], [data-uia*="episode-selector"]');
    if (tray && rendered(tray)) return;
    hnr1533SimulatePointerClick(liveTrigger, liveTrigger);
    setTimeout(() => hnr1533WaitForNativeEpisodeRows(), 160);
  }, 300);
  return true;
}
function hnr1533ActivateNativeEpisode(item) {
  const rows = hnr1533PlayerEpisodeItems();
  const row = rows.find(candidate => candidate === item || (item?.id && candidate.id === item.id)) ||
    (item?.id ? document.getElementById(item.id) : null);
  if (!(row instanceof HTMLElement) || !row.isConnected || !rendered(row)) {
    status('Episode row disappeared; reopening Netflix list');
    hnr1533RetryNativeEpisodeTray();
    return false;
  }

  const episodeName = norm(row.getAttribute('aria-label') || row.innerText || row.textContent).slice(0, 70) || 'episode';
  const episodeKey = hnr1533NativeEpisodeRowKey(row);
  const selectedIndex = rows.indexOf(row);
  if (selectedIndex >= 0) hnr1533NativeEpisodeIndex = selectedIndex;
  hnr1533PulsePlayerPointer(row);
  hnr1533RevealNativeEpisode(row);

  // First Enter selects/expands the native row so its description and details
  // can be read. Do not click the nested Play control yet.
  if (hnr1533EpisodeSelectionArmedKey !== episodeKey) {
    hnr1533NativeEpisodeClickPending = false;
    const selectedOk = hnr1533SimulatePointerClick(row, row, true);
    if (!selectedOk) {
      status(`Could not select ${episodeName}`);
      return false;
    }
    hnr1533EpisodeSelectionArmedKey = episodeKey;
    // Netflix may update the row's expanded description after the first click.
    setTimeout(() => {
      if (!hnr1533NativeEpisodeMode || hnr1533EpisodeSelectionArmedKey !== episodeKey) return;
      const currentRows = hnr1533PlayerEpisodeItems();
      const liveRow = currentRows.find(candidate => candidate.id && row.id && candidate.id === row.id) ||
        currentRows.find(candidate => norm(candidate.getAttribute('aria-label') || candidate.innerText || candidate.textContent).slice(0, 70) === episodeName);
      if (liveRow) {
        const idx = currentRows.indexOf(liveRow);
        if (idx >= 0) hnr1533NativeEpisodeIndex = idx;
        hnr1533FocusNativeEpisode(liveRow);
      }
    }, 90);
    status(`Selected ${episodeName} · press OK again to play`);
    return true;
  }

  // Second Enter activates the actual Play/action target exactly once.
  const startURL = location.href;
  const startTitle = document.title;
  const startVideo = hnr1533Video();
  const startSrc = startVideo?.currentSrc || startVideo?.src || '';
  const actionTarget = hnr1533FindEpisodeActionTarget(row) || row;
  hnr1533NativeEpisodeClickPending = true;
  if (!hnr1533SimulatePointerClick(actionTarget, row)) {
    hnr1533NativeEpisodeClickPending = false;
    status(`Could not activate ${episodeName}; press OK to retry`);
    return false;
  }
  status(`Playing ${episodeName}…`);

  // Verify asynchronously. Never auto-send a second click; the user controls the
  // two-step interaction explicitly so Netflix's story/summary remains readable.
  const verify = attempt => {
    if (!hnr1533NativeEpisodeClickPending) return;
    const nowVideo = hnr1533Video();
    const changed = location.href !== startURL || document.title !== startTitle ||
      (!!(nowVideo?.currentSrc || nowVideo?.src) && (nowVideo.currentSrc || nowVideo.src) !== startSrc);
    if (changed) {
      hnr1533FinishEpisodeActivation(episodeName, true, startURL, startSrc);
    } else if (attempt < 3) {
      setTimeout(() => verify(attempt + 1), [500, 800, 1100][attempt]);
    } else {
      hnr1533NativeEpisodeClickPending = false;
      status(`Selection sent for ${episodeName}; playback change not detected`);
      // Keep the native list and the armed row available for a deliberate retry.
      hnr1533NativeEpisodeMode = true;
      hnr1533StartNativeEpisodeWatch();
    }
  };
  setTimeout(() => verify(0), 450);
  return true;
}
let hnr1533EpisodeRefreshScheduled = false;
function hnr1533ScheduleSeamlessEpisodeRefresh(episodeName, previousHref, previousVideoSrc) {
  if (hnr1533EpisodeRefreshScheduled) return;
  hnr1533EpisodeRefreshScheduled = true;

  let previousPath = "";
  try { previousPath = new URL(previousHref || location.href, location.href).pathname; } catch {}
  const previousWatchId = previousPath.match(/\/watch\/(\d+)/)?.[1] || "";
  const startedAt = Date.now();
  let currentPath = "";
  let stableSince = 0;
  let refreshTimer = 0;
  const timeoutMs = 9000;
  const stabilityMs = 1050;

  // Netflix replaces its SPA player first and updates navigation state around the
  // same time. Wait for the new /watch/<id> route to settle before reloading, so
  // refresh loads the selected episode rather than the previous one.
  const poll = () => {
    const now = Date.now();
    const path = location.pathname;
    const match = path.match(/^\/watch\/(\d+)/);
    const watchId = match?.[1] || "";
    if (path !== currentPath) {
      currentPath = path;
      stableSince = now;
    }

    if (watchId && previousWatchId && watchId !== previousWatchId) {
      if (!stableSince) stableSince = now;
      const video = hnr1533Video();
      const source = video?.currentSrc || video?.src || "";
      const sourceChanged = !!source && (!previousVideoSrc || source !== previousVideoSrc);
      const routeStable = now - stableSince >= stabilityMs;
      // If the route has settled, reload once to let Netflix rebuild its player UI.
      // Never seek the video directly: that previously caused Netflix playback errors.
      if (routeStable && (sourceChanged || now - startedAt >= 2500)) {
        status(`Episode ready · refreshing player UI`);
        refreshTimer = setTimeout(() => {
          try { window.location.reload(); } catch { hnr1533EpisodeRefreshScheduled = false; }
        }, 350);
        return;
      }
    }

    if (now - startedAt >= timeoutMs) {
      hnr1533EpisodeRefreshScheduled = false;
      status(`Episode selected: ${episodeName}; URL did not settle, skipped automatic refresh`);
      return;
    }
    setTimeout(poll, 200);
  };
  setTimeout(poll, 350);
}

function hnr1533FinishEpisodeActivation(episodeName, switched, previousHref = location.href, previousVideoSrc = "") {
  hnr1533NativeEpisodeClickPending = false;
  if (switched) {
    hnr1533LastActivatedEpisodeIndex = hnr1533NativeEpisodeIndex;
    hnr1533LastActivatedEpisodeRoute = location.pathname;

    // Stop episode-tray retries, remove extension focus UI, and let Netflix settle.
    // This build deliberately refreshes only after the watch route changes and
    // becomes stable; it never reopens/toggles the Episodes tray automatically.
    hnr1533EpisodeAutoReopenPaused = true;
    hnr1533NativeEpisodeMode = false;
    hnr1533EpisodeSelectionArmedKey = "";
    hnr1533NativeEpisodeOpenAt = 0;
    hnr1533PendingEpisodeStep = null;
    clearTimeout(hnr1533NativeEpisodePollTimer);
    hnr1533NativeEpisodePollTimer = 0;
    hnr1533StopNativeEpisodeWatch();

    const staleRing = document.getElementById("hnr1533-native-episode-focus-ring");
    if (staleRing) staleRing.hidden = true;
    clearSelection();
    hnr1533PlayerMode = true;
    const overlay = hnr1533EnsurePlayerOverlay();
    overlay.hidden = true;
    const root = hnr1533PlayerRoot();
    if (root) hnr1533KeepPlayerVisible(root);
    if (!hnr1533PlayerKeepAliveTimer) hnr1533EnablePlayerFocusMode(root);

    status(`Switched to ${episodeName} · refreshing controls…`);
    hnr1533ScheduleSeamlessEpisodeRefresh(episodeName, previousHref, previousVideoSrc);
  } else {
    hnr1533NativeEpisodeMode = true;
    hnr1533StartNativeEpisodeWatch();
    status(`Netflix did not confirm ${episodeName}; try the highlighted row again`);
  }
}
function hnr1533ShowPlayerOverlay() {
  const overlay = hnr1533EnsurePlayerOverlay();
  if (hnr1533NativeEpisodeMode) { overlay.hidden = true; return; }
  overlay.hidden = false;
  if (!overlay.querySelector("[data-action]")) hnr1533ShowOverlayMain();
  else hnr1533UpdatePlayerOverlay();
}
function hnr1533HidePlayerOverlay() {
  if (hnr1533PlayerOverlay) hnr1533PlayerOverlay.hidden = true;
  hnr1533OverlayPendingNative = null;
  hnr1533OverlayMode = "main";
}
function hnr1533OverlayVisible() {
  return !!hnr1533PlayerOverlay?.isConnected && !hnr1533PlayerOverlay.hidden;
}
function hnr1533Video() {
  return [...document.querySelectorAll("video")].find(video => video.isConnected) || null;
}
function hnr1533FindNativePlayerControl(pattern) {
  const root = hnr1533PlayerRoot();
  const candidateSelectors = [
    '.watch-video--skip-content > button',
    '.watch-video--skip-content button',
    '[data-uia="player-skip-intro"]',
    '[data-uia="player-skip-recap"]',
    '[data-uia="control-next"]',
    '[data-uia="next-episode-seamless-button"]',
    '[data-uia="next-episode-button"]',
    '[data-uia="control-previous-episode"]',
    'button[aria-label*="skip" i]',
    '[aria-label*="Next Episode" i]',
    '[aria-label*="Previous Episode" i]'
  ];
  const globalCandidates = candidateSelectors.flatMap(selector => {
    try { return [...document.querySelectorAll(selector)]; } catch { return []; }
  });
  const scopedCandidates = hnr1533PlayerControls(root);
  const all = [...new Set([...globalCandidates, ...scopedCandidates])].filter(el =>
    el instanceof HTMLElement && el.isConnected && rendered(el) && visible(el) && !el.closest('#hnr1533-player-overlay')
  );
  return all.find(el => {
    const text = `${el.getAttribute('data-uia') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.innerText || ''}`.toLowerCase();
    const parentText = `${el.parentElement?.getAttribute('data-uia') || ''} ${el.parentElement?.className || ''}`.toLowerCase();
    return pattern.test(text) || pattern.test(parentText);
  }) || null;
}
function hnr1533ClickNativePlayerControl(pattern) {
  const root = hnr1533PlayerRoot();
  if (root) hnr1533KeepPlayerVisible(root);

  // Tab through Netflix's real control stops first. This is the wake mechanism
  // suggested by the user's successful manual Tab test.
  hnr1533FocusNativeTabStop(pattern);
  const target = hnr1533FindNativePlayerControl(pattern);
  if (!target) {
    hnr1533FocusNativeTabStop(pattern);
    hnr1533PulsePlayerPointer(hnr1533PlayerWakeTarget(root));
    hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(root));
    return false;
  }
  try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
  if (root) hnr1533KeepPlayerVisible(root);
  hnr1533RevealNativeEpisode(target);
  hnr1533PulsePlayerPointer(target);
  hnr1533RequestPagePlayerWake(target);
  return hnr1533SimulatePointerClick(target, target.closest('.watch-video--skip-content') || target);
}
function hnr1533RetryPendingNativeControl() {
  const pending = hnr1533OverlayPendingNative;
  if (!pending) return;
  const retry = attempt => {
    if (hnr1533OverlayPendingNative !== pending) return;
    hnr1533FocusNativeTabStop(pending.pattern);
    if (hnr1533ClickNativePlayerControl(pending.pattern)) {
      hnr1533OverlayPendingNative = null;
      status(`${pending.label} activated`);
    } else if (attempt < 5) {
      const root = hnr1533PlayerRoot();
      hnr1533KeepPlayerVisible(root);
      hnr1533PulsePlayerPointer(hnr1533PlayerWakeTarget(root));
      if (attempt === 0 || attempt === 2) hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(root));
      setTimeout(() => retry(attempt + 1), [140, 260, 420, 700, 1000][attempt]);
    } else {
      hnr1533OverlayPendingNative = null;
      status(`${pending.label} is not mounted in Netflix`);
    }
  };
  hnr1533PulsePlayerPointer(hnr1533PlayerRoot());
  setTimeout(() => retry(0), 100);
}
function hnr1533AdjustVolume(delta) {
  const video = hnr1533Video();
  if (!video) { status("Netflix video is not ready for volume control"); return; }
  const next = Math.min(1, Math.max(0, Number(video.volume || 0) + delta));
  try {
    video.volume = next;
    if (next > 0 && video.muted) video.muted = false;
    status(`Volume ${Math.round(next * 100)}%`);
  } catch {
    status("Netflix does not allow direct volume adjustment in this player");
  }
}
function hnr1533RunEpisodeStep(direction) {
  const root = hnr1533PlayerRoot();
  if (root) hnr1533KeepPlayerVisible(root);

  const before = {
    href: location.href,
    title: document.title,
    src: hnr1533Video()?.currentSrc || hnr1533Video()?.src || ""
  };
  const shortcutKey = direction === "next" ? "ArrowRight" : "ArrowLeft";

  // Try the reported Netflix web-player shortcut first. Netflix's official
  // shortcut list does not document episode-step shortcuts, so verify behavior
  // and fall back to a mounted native control / native Episodes list.
  hnr1533DispatchNativeShortcut(shortcutKey, { shiftKey: true });
  status(`Sent ${direction === "next" ? "Shift + Right" : "Shift + Left"} to Netflix`);

  const changed = () => {
    const video = hnr1533Video();
    return location.href !== before.href ||
      document.title !== before.title ||
      (!!before.src && !!(video?.currentSrc || video?.src) && (video.currentSrc || video.src) !== before.src);
  };

  setTimeout(() => {
    if (changed()) {
      status(`${direction === "next" ? "Next" : "Previous"} episode changed`);
      return;
    }

    // Shortcut not observed to switch playback; preserve reliable native-control
    // fallback where one exists.
    const selectors = direction === "next" ? [
      '[data-uia="control-next"]', '[data-uia="next-episode-seamless-button"]',
      '[data-uia="next-episode-button"]', '[aria-label="Next Episode" i]', '[title="Next Episode" i]'
    ] : [
      '[data-uia="control-previous-episode"]', '[data-uia="control-previous"]',
      '[data-uia*="previous-episode" i]', '[data-uia*="prev-episode" i]',
      '[aria-label="Previous Episode" i]', '[title="Previous Episode" i]'
    ];
    const target = selectors.flatMap(selector => {
      try { return [...document.querySelectorAll(selector)]; } catch { return []; }
    }).find(el => el instanceof HTMLElement && el.isConnected &&
      el.getClientRects().length && !el.closest("#hnr1533-player-overlay"));
    if (target && hnr1533SimulatePointerClick(target, target)) {
      status(`${direction === "next" ? "Next" : "Previous"} episode native fallback sent`);
      return;
    }

    hnr1533PendingEpisodeStep = direction;
    hnr1533EnterNativeEpisodes();
    status(`Shortcut did not switch episodes; opened native Episodes as fallback`);
  }, 1100);
}
function hnr1533RunOverlayAction(id) {
  const video = hnr1533Video();
  if (id === "back") { hnr1533PlayerBack(); return; }
  if (id === "episodes") { hnr1533EnterNativeEpisodes(); return; }
  if (id === "audio") { hnr1533EnterNativeAudioMenu(); return; }
  if (id === "previousEpisode") { hnr1533RunEpisodeStep("previous"); return; }
  if (id === "nextEpisode") { hnr1533RunEpisodeStep("next"); return; }
  if (id === "skip") {
    const sent = hnr1533DispatchNativeShortcut("s", {
      preferredPattern: /skip.*(?:intro|recap)|(?:intro|recap).*skip/i
    });
    if (sent) {
      status("Sent Netflix Skip Intro shortcut (S)");
      // If Netflix ignores the shortcut and the prompt remains, fall back to its
      // live button. Do not send this fallback if the button has disappeared.
      setTimeout(() => {
        const stillThere = hnr1533FindNativePlayerControl(/skip.*(?:intro|recap)|(?:intro|recap).*skip/i);
        if (stillThere) hnr1533ClickNativePlayerControl(/skip.*(?:intro|recap)|(?:intro|recap).*skip/i);
      }, 650);
    } else {
      hnr1533ClickNativePlayerControl(/skip.*(?:intro|recap)|(?:intro|recap).*skip/i);
    }
    return;
  }
  if (id === "volumeDown") { hnr1533AdjustVolume(-0.1); return; }
  if (id === "volumeUp") { hnr1533AdjustVolume(0.1); return; }
  if (id === "toggle" && video) {
    if (video.paused) video.play().catch(() => status("Play blocked by Netflix")); else video.pause();
    status(video.paused ? "Play" : "Pause"); return;
  }
  const patterns = {
    rewind: /rewind|back.*(?:10|ten)|(?:10|ten).*back/,
    forward: /forward|skip.*(?:10|ten)|(?:10|ten).*forward/,
    episodes: /episode/,
    audio: /audio|subtitle|caption/
  };
  const actionLabel = HNR1533_OVERLAY_ACTIONS.find(action => action.id === id)?.label || "Netflix control";
  const result = patterns[id] && hnr1533ClickNativePlayerControl(patterns[id]);
  if (result === true) {
    status(HNR1533_OVERLAY_ACTIONS.find(action => action.id === id)?.label || "Activated");
  } else {
    hnr1533OverlayPendingNative = { pattern: patterns[id], label: actionLabel };
    hnr1533FocusNativeTabStop(patterns[id]);
    hnr1533PulsePlayerPointer(hnr1533PlayerRoot());
    status(`Focusing Netflix controls for ${actionLabel}`);
    hnr1533RetryPendingNativeControl();
  }
}
function hnr1533HandlePlayerOverlay(e) {
  if (!hnr1533OverlayVisible()) return false;
  hnr1533UpdatePlayerOverlay();
  const items = hnr1533VisibleOverlayItems();
  if (!items.length) return false;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    const col = 3, row = Math.floor(hnr1533PlayerOverlayIndex / col), column = hnr1533PlayerOverlayIndex % col;
    if (e.key === "ArrowLeft") hnr1533PlayerOverlayIndex = row * col + Math.max(0, column - 1);
    if (e.key === "ArrowRight") hnr1533PlayerOverlayIndex = row * col + Math.min(col - 1, column + 1);
    if (e.key === "ArrowUp") hnr1533PlayerOverlayIndex = Math.max(0, (row - 1) * col + column);
    if (e.key === "ArrowDown") hnr1533PlayerOverlayIndex = Math.min(items.length - 1, (row + 1) * col + column);
    hnr1533UpdatePlayerOverlay();
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  if (e.key === "Enter" || e.key === " ") {
    const chosen = items[Math.max(0, Math.min(items.length - 1, hnr1533PlayerOverlayIndex))];
    if (chosen?.dataset.action) hnr1533RunOverlayAction(chosen.dataset.action);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  return false;
}
function hnr1533FocusPlayerSurface(root = hnr1533PlayerRoot()) {
  // The supplied player DOM has no control nodes after Netflix fades them, but
  // it retains this focusable player surface: [data-uia="player"][tabindex].
  // Focusing it lets the next real remote key be handled by Netflix itself.
  const surface = root?.querySelector?.('[data-uia="player"][tabindex]') ||
    document.querySelector('[data-uia="player"][tabindex]');
  if (!surface || !surface.isConnected) return false;
  try { surface.focus({ preventScroll: true }); }
  catch { try { surface.focus(); } catch { return false; } }
  return document.activeElement === surface;
}
function hnr1533RefreshPlayerFocus(root, preferred) {
  // Keep Netflix aware that its player has focus without letting an Arrow key
  // reach its global seek/skip shortcuts. A real focus transition is sufficient
  // for player UI implementations that reset their idle state on focusin.
  const surface = root?.querySelector?.('[data-uia="player"][tabindex]') ||
    document.querySelector('[data-uia="player"][tabindex]');
  const restore = preferred && preferred.isConnected ? preferred : null;
  if (!surface || !surface.isConnected || !restore || surface === restore) return;
  try { surface.focus({ preventScroll: true }); } catch { return; }
  requestAnimationFrame(() => {
    if (!hnr1533IsPlayerActive() || !restore.isConnected) return;
    try { restore.focus({ preventScroll: true }); } catch {}
  });
}
function hnr1533ExtendPlayerControls(root, preferred = selected) {
  // Keep the player chrome available for a short period after each remote
  // action. This is renewed only by user interaction; it is not a permanent
  // overlay and sends no synthetic keyboard or pointer events.
  hnr1533PlayerHoldUntil = Date.now() + 5000;
  hnr1533PlayerLastFocusPulse = Date.now();
  hnr1533RefreshPlayerFocus(root, preferred);
}
function hnr1533EnsurePlayerStyle() {
  // player.css is declared in manifest.json, so it survives Netflix replacing
  // document-head children during player route changes. This hook remains the
  // single entry point used by the player code.
  return true;
}
function hnr1533KeepPlayerVisible(root = hnr1533PlayerRoot()) {
  hnr1533EnsurePlayerStyle();
  document.documentElement.classList.add(HNR1533_PLAYER_CLASS);

  const keepAncestors = (seed, maxDepth = 22) => {
    let node = seed;
    let depth = 0;
    while (node && node !== document.body && node !== document.documentElement && depth < maxDepth) {
      node.classList?.add(HNR1533_KEEP_CLASS);
      // The route fallback can make `root` equal to the controls host. Continue
      // past it: Netflix commonly puts the fading opacity on its parent shell.
      if (node.matches?.('.watch-video--player-view, .watch-video')) break;
      node = node.parentElement;
      depth++;
    }
  };

  // Keep the concrete controls and their fade-owning ancestors visible. Netflix
  // often puts opacity on .watch-video--bottom-controls-container, not on the
  // buttons themselves, so styling descendants alone is insufficient.
  const host = document.querySelector('[data-uia="controls-standard"]');
  if (host) keepAncestors(host);
  for (const selector of [
    '.watch-video--top-controls-container',
    '.watch-video--bottom-controls-container',
    '.watch-video--controls-container',
    '[data-uia="episode-selector"]',
    '[id^="selector-episode-option-"]',
    '[aria-label^="Episode "]',
    '.track-list-container', '.track-list-audio', '.track-list-subtitle',
    '[data-uia*="audio-subtitle"]', '[data-uia^="audio-item-"]',
    '[data-uia^="subtitle-item-"]', '[role="dialog"] [role="radio"]',
    '[role="dialog"] [role="option"]'
  ]) {
    for (const layer of document.querySelectorAll(selector)) {
      if (layer.isConnected) keepAncestors(layer);
    }
  }
}
function hnr1533StopPlayerFocusMode() {
  hnr1533PlayerMode = false;
  hnr1533NativeEpisodeMode = false;
  hnr1533NativeAudioMode = false;
  clearTimeout(hnr1533NativeAudioPollTimer);
  const audioRing = document.getElementById('hnr1533-native-audio-focus-ring');
  if (audioRing) audioRing.hidden = true;
  hnr1533EpisodeAutoReopenPaused = false;
  hnr1533StopNativeEpisodeWatch();
  clearTimeout(hnr1533NativeEpisodePollTimer);
  clearInterval(hnr1533PlayerKeepAliveTimer);
  hnr1533PlayerKeepAliveTimer = 0;
  hnr1533PlayerHoldUntil = 0;
  hnr1533PlayerLastFocusPulse = 0;
  hnr1533HidePlayerOverlay();
  document.documentElement.classList.remove(HNR1533_PLAYER_CLASS);
  for (const node of document.querySelectorAll("." + HNR1533_KEEP_CLASS)) node.classList.remove(HNR1533_KEEP_CLASS);
}
function hnr1533WakePlayer(root) {
  if (!root) return;
  hnr1533KeepPlayerVisible(root);
  hnr1533FocusPlayerSurface(root);
  hnr1533PulsePlayerPointer(root);
}
function hnr1533PlayerEpisodeOverlay() {
  const explicit = [...document.querySelectorAll('[data-uia="episode-selector"], [data-uia*="episode-selector"]')]
    .filter(el => rendered(el) && !el.closest('#hnr1533-player-overlay'));
  if (explicit.length) return explicit.sort((a,b) => {
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
    return rb.width*rb.height-ra.width*ra.height;
  })[0];
  const rows = hnr1533PlayerEpisodeItems();
  if (!rows.length) return null;
  let parent = rows[0].parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    if (rows.every(row => parent.contains(row))) return parent;
    parent = parent.parentElement;
  }
  return rows[0].parentElement || rows[0];
}
function hnr1533PlayerEpisodeItems() {
  const idRows = [...document.querySelectorAll('[id^="selector-episode-option-"]')]
    .filter(el => el instanceof HTMLElement && el.isConnected && rendered(el) && !el.closest('#hnr1533-player-overlay'));
  if (idRows.length) return [...new Set(idRows)].sort((a,b) => {
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
    return ra.top-rb.top || ra.left-rb.left;
  });
  const ariaRows = [...document.querySelectorAll('[aria-label^="Episode "]')]
    .filter(el => el instanceof HTMLElement && el.isConnected && rendered(el) && !el.closest('#hnr1533-player-overlay'));
  if (ariaRows.length) {
    const filtered = ariaRows.filter(el => !ariaRows.some(other => other !== el && el.contains(other) &&
      norm(other.getAttribute('aria-label')) === norm(el.getAttribute('aria-label'))));
    return [...new Set(filtered)].sort((a,b) => {
      const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
      return ra.top-rb.top || ra.left-rb.left;
    });
  }
  const selector = document.querySelector('[data-uia="episode-selector"], [data-uia*="episode-selector"]');
  if (!selector) return [];
  const cards = [...selector.querySelectorAll('[data-uia="titleCard--container"]')]
    .filter(el => el instanceof HTMLElement && rendered(el));
  if (cards.length) return [...new Set(cards)];
  return [...selector.querySelectorAll('button,a[href],[role="button"],[role="option"]')]
    .filter(el => el instanceof HTMLElement && rendered(el));
}
function hnr1533PlayerControls(root = hnr1533PlayerRoot()) {
  if (!root) return [];
  hnr1533KeepPlayerVisible(root);
  const host = document.querySelector('[data-uia="controls-standard"]');
  const scopes = [];
  if (host) scopes.push(host);
  if (root) scopes.push(root);
  for (const selector of ['.watch-video--top-controls-container', '.watch-video--bottom-controls-container', '.watch-video--controls-container']) {
    for (const layer of document.querySelectorAll(selector)) {
      if (layer.isConnected) scopes.push(layer);
    }
  }
  const selector = [
    'button','a[href]','[role="button"]','[role="slider"]','[role="menuitem"]',
    '[role="option"]','input[type="range"]','[tabindex="0"]','[data-uia^="control-"]',
    '[data-uia="player-skip-intro"]','[data-uia="player-skip-recap"]',
    '.watch-video--skip-content > button','.watch-video--skip-content button',
    '[aria-label*="Skip Intro" i]','[aria-label*="Skip Recap" i]',
    '[data-uia="next-episode-seamless-button"]','[data-uia="next-episode-button"]',
    '[data-uia="episode-selector"] [data-uia="titleCard--container"]'
  ].join(",");
  const episodeOverlay = hnr1533PlayerEpisodeOverlay();
  const episodeItems = hnr1533PlayerEpisodeItems(episodeOverlay);
  const raw = [...new Set([
    ...scopes.flatMap(scope => [...scope.querySelectorAll(selector)]),
    ...episodeItems
  ])];
  const controls = raw.map(el => {
    if (el.matches('[data-uia^="control-"]') && !el.matches('button,[role="button"],[role="slider"]')) {
      return el.closest('button,[role="button"]') || el;
    }
    return el;
  }).filter(el => {
    if (!rendered(el) || el.closest("#hnr1533-keyboard")) return false;
    if (el.closest(S.modal) && !el.closest('[data-uia="episode-selector"]') && !el.matches('[id^="selector-episode-option-"],[aria-label^="Episode "]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    if (r.width > innerWidth * .75 || r.height > innerHeight * .4) return false;
    const text = `${el.getAttribute("aria-label")||""} ${el.getAttribute("data-uia")||""} ${el.getAttribute("title")||""}`.toLowerCase();
    if (/player|controls-standard|video-canvas/.test(text) && !/episode/.test(text)) return false;
    return true;
  });
  return [...new Set(controls)].filter(el =>
    !controls.some(other => other !== el && other.contains(el) && other.matches('button,a[href],[role="button"]'))
  );
}
function hnr1533PlayerDirectionalTarget(current, targets, key) {
  const direct = nearest(current, targets, key);
  if (direct) return direct;
  const rect = el => el.getBoundingClientRect();
  const a = rect(current);
  const acx = a.left + a.width / 2;
  const acy = a.top + a.height / 2;
  const candidates = targets.filter(el => el !== current && rendered(el)).map(el => {
    const r = rect(el);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - acx, dy = cy - acy;
    let primary, cross;
    if (key === "ArrowRight") { if (dx <= 2) return null; primary = dx; cross = Math.abs(dy); }
    else if (key === "ArrowLeft") { if (dx >= -2) return null; primary = -dx; cross = Math.abs(dy); }
    else if (key === "ArrowDown") { if (dy <= 2) return null; primary = dy; cross = Math.abs(dx); }
    else { if (dy >= -2) return null; primary = -dy; cross = Math.abs(dx); }
    return { el, primary, cross, score: primary + cross * 1.6 };
  }).filter(Boolean);
  candidates.sort((x, y) => x.score - y.score);
  if (candidates.length) return candidates[0].el;

  // Netflix can virtualize episode lists and report momentarily identical bounds.
  // In that case, horizontal movement follows visible document order instead of
  // leaving the yellow focus square trapped on the first card.
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const sameRow = targets.filter(el => {
      if (el === current || !rendered(el)) return false;
      const r = rect(el), cy = r.top + r.height / 2;
      return Math.abs(cy - acy) <= Math.max(a.height, r.height) * 0.85;
    }).sort((x, y) => rect(x).left - rect(y).left);
    const ordered = [current, ...sameRow].sort((x, y) => rect(x).left - rect(y).left);
    const index = ordered.indexOf(current);
    const next = index + (key === "ArrowRight" ? 1 : -1);
    if (next >= 0 && next < ordered.length && ordered[next] !== current) return ordered[next];
    const dom = targets.filter(el => rendered(el));
    const di = dom.indexOf(current), dn = di + (key === "ArrowRight" ? 1 : -1);
    if (di >= 0 && dn >= 0 && dn < dom.length) return dom[dn];
  }
  return null;
}

function hnr1533DefaultPlayerControl(controls) {
  return controls.find(el => /play.?pause|pause|play|control-play-pause/i.test(
    `${el.getAttribute("data-uia")||""} ${el.getAttribute("aria-label")||""} ${el.getAttribute("title")||""}`
  )) || controls.find(el => /episode|next-episode|skip-intro|skip-recap/i.test(
    `${el.getAttribute("data-uia")||""} ${el.getAttribute("aria-label")||""}`
  )) || controls[0] || null;
}
function hnr1533EnablePlayerFocusMode(root) {
  hnr1533PlayerMode = true;
  hnr1533WakePlayer(root);
  hnr1533FocusPlayerSurface(root);
  hnr1533ShowPlayerOverlay();
  if (!hnr1533PlayerKeepAliveTimer) {
    hnr1533PlayerKeepAliveTimer = setInterval(() => {
      if (!hnr1533IsPlayerActive()) {
        // Netflix can briefly unmount the video and every control during an
        // episode switch. Do not tear down episode recovery just because one
        // interval tick lands inside that render gap.
        if (hnr1533NativeEpisodeMode && location.pathname.startsWith("/watch/")) {
          const recoveringRoot = hnr1533PlayerRoot();
          if (recoveringRoot) hnr1533KeepPlayerVisible(recoveringRoot);
          if (!hnr1533EpisodeAutoReopenPaused && Date.now() - hnr1533NativeEpisodeOpenAt > 700) {
            hnr1533OpenNativeEpisodeTray(recoveringRoot, 0);
          }
          return;
        }
        hnr1533StopPlayerFocusMode(); return;
      }
      // The player overlay may appear before Netflix finishes mounting its
      // native controls. Re-evaluate whether Episodes exists while playing so
      // series gain the action when available and movies never keep a dead tile.
      if (hnr1533OverlayVisible()) hnr1533UpdatePlayerOverlay();
      if (hnr1533NativeAudioMode) hnr1533UpdateNativeAudioFocusRing();
      const currentRoot = hnr1533PlayerRoot();
      if (currentRoot) {
        if (hnr1533NativeEpisodeMode) {
          // Maintain styles and the visual focus ring, but don't refocus the
          // player surface while the remote is navigating Netflix episode rows.
          hnr1533KeepPlayerVisible(currentRoot);
          hnr1533UpdateNativeEpisodeFocusRing();
          if (!hnr1533EpisodeAutoReopenPaused && !hnr1533PlayerEpisodeItems().length && Date.now() - hnr1533NativeEpisodeOpenAt > 2200) {
            hnr1533OpenNativeEpisodeTray(currentRoot);
          }
        } else {
          hnr1533WakePlayer(currentRoot);
          if (Date.now() < hnr1533PlayerHoldUntil && Date.now() - hnr1533PlayerLastFocusPulse >= 900) {
            hnr1533PlayerLastFocusPulse = Date.now();
            hnr1533RefreshPlayerFocus(currentRoot, selected);
          }
        }
      }
    }, 700);
  }
}
function hnr1533NativeAudioMenuRoot() {
  const selectors = [
    '.track-list-container', '.track-list-audio', '.track-list-subtitle',
    '[data-uia*="audio-subtitle-selector" i]', '[data-uia*="audio-subtitle" i]',
    '[role="dialog"]', '[role="listbox"]', '[role="menu"]',
    '[class*="audio-subtitle" i]', '[class*="track-list" i]'
  ];
  const candidates = [...new Set(selectors.flatMap(sel => {
    try { return [...document.querySelectorAll(sel)]; } catch { return []; }
  }))].filter(el => el instanceof HTMLElement && el.isConnected &&
    !el.closest('#hnr1533-player-overlay') && rendered(el));
  const plausible = candidates.filter(el => {
    const text = norm(el.innerText || el.textContent || '').toLowerCase();
    const hasOption = el.querySelector('li,button,[role="radio"],[role="option"],[role="menuitemradio"],[data-uia^="audio-item-"],[data-uia^="subtitle-item-"]');
    return hasOption && (/(audio|subtitle|caption|track)/i.test(text) || /audio|subtitle|track/i.test(`${el.className || ''} ${el.getAttribute('data-uia') || ''}`));
  });
  return plausible.sort((a,b) => {
    const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
    return ar.width*ar.height - br.width*br.height;
  })[0] || null;
}
function hnr1533AudioOptionRows() {
  const exclude = el => !(el instanceof HTMLElement) || !el.isConnected ||
    !rendered(el) || el.closest('#hnr1533-player-overlay') || el.closest('#hnr1533-keyboard') ||
    el.closest('[data-uia="controls-standard"]');
  const explicitSelectors = [
    '[data-uia^="audio-item-"]', '[data-uia^="subtitle-item-"]',
    '[data-uia*="audio-item-"]', '[data-uia*="subtitle-item-"]',
    '.track-list-audio > ul > li', '.track-list-subtitle > ul > li',
    '.track-list-audio li', '.track-list-subtitle li'
  ];
  let explicit = [...new Set(explicitSelectors.flatMap(sel => {
    try { return [...document.querySelectorAll(sel)]; } catch { return []; }
  }))].filter(el => !exclude(el) && norm(el.getAttribute('aria-label') || el.innerText || el.textContent).length > 0);
  if (explicit.length) {
    // Keep one row per actual native option rather than nested text wrappers.
    explicit = explicit.filter(el => !explicit.some(other => other !== el && el.contains(other) &&
      /^(audio-item-|subtitle-item-)/i.test(other.getAttribute('data-uia') || '') &&
      /^(audio-item-|subtitle-item-)/i.test(el.getAttribute('data-uia') || '')));
    return explicit.sort((a,b) => {
      const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
      return ar.top-br.top || ar.left-br.left;
    });
  }
  const root = hnr1533NativeAudioMenuRoot();
  if (!root) return [];
  const selectors = 'li,button,a[href],[role="radio"],[role="option"],[role="menuitemradio"],[tabindex="0"],[data-uia*="audio-item" i],[data-uia*="subtitle-item" i]';
  let items = [...root.querySelectorAll(selectors)].filter(el => {
    if (exclude(el)) return false;
    const txt = norm(el.getAttribute('aria-label') || el.innerText || el.textContent || el.getAttribute('data-uia'));
    if (!txt || txt.length > 140 || /^(audio|subtitles?|captions?|close|done|cancel)$/i.test(txt)) return false;
    const role = el.getAttribute('role') || '';
    const uia = el.getAttribute('data-uia') || '';
    const cls = String(el.className || '');
    return /radio|option|menuitem/i.test(role) || /audio-item|subtitle-item/i.test(uia) ||
      el.matches('li,button,a[href]') || /track|option|selected/i.test(cls);
  });
  // Prefer the actionable deepest row when both a parent list item and its
  // child button expose the same label.
  items = items.filter(el => !items.some(other => other !== el && el.contains(other) &&
    norm(el.getAttribute('aria-label') || el.innerText || el.textContent) ===
    norm(other.getAttribute('aria-label') || other.innerText || other.textContent)));
  // Keep option rows only. Empty headings and panel controls are not options.
  return [...new Set(items)].sort((a,b) => {
    const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
    return ar.top-br.top || ar.left-br.left;
  });
}
function hnr1533NativeAudioTrigger(root = hnr1533PlayerRoot()) {
  const selectors = [
    '[data-uia="control-audio-subtitle"]', '[data-uia*="audio-subtitle"]',
    'button[aria-label*="Audio & Subtitles" i]', 'button[aria-label*="Audio and Subtitles" i]',
    'button[aria-label*="Audio" i][aria-label*="Subtitle" i]'
  ];
  const found = [...new Set(selectors.flatMap(sel => {
    try { return [...document.querySelectorAll(sel)]; } catch { return []; }
  }))].filter(el => el instanceof HTMLElement && el.isConnected &&
    !el.closest('#hnr1533-player-overlay') && !el.closest('[role="dialog"]') &&
    (root?.contains(el) || el.matches('[data-uia="control-audio-subtitle"]')));
  return found[0] || null;
}
function hnr1533EnsureNativeAudioFocusRing() {
  let ring = document.getElementById('hnr1533-native-audio-focus-ring');
  if (ring?.isConnected) return ring;
  ring = document.createElement('div');
  ring.id = 'hnr1533-native-audio-focus-ring';
  ring.setAttribute('aria-hidden', 'true');
  ring.hidden = true;
  (document.documentElement || document.body).append(ring);
  return ring;
}
function hnr1533UpdateNativeAudioFocusRing(item = selected) {
  const ring = hnr1533EnsureNativeAudioFocusRing();
  if (!hnr1533NativeAudioMode) { ring.hidden = true; return; }
  const rows = hnr1533AudioOptionRows();
  const row = rows.find(candidate => candidate === item || candidate.contains(item) || item?.contains?.(candidate));
  if (!(row instanceof HTMLElement) || !row.isConnected || !rendered(row)) { ring.hidden = true; return; }
  const r = row.getBoundingClientRect();
  if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) {
    ring.hidden = true; return;
  }
  ring.hidden = false;
  ring.style.left = `${Math.round(r.left - 4)}px`;
  ring.style.top = `${Math.round(r.top - 4)}px`;
  ring.style.width = `${Math.round(r.width + 8)}px`;
  ring.style.height = `${Math.round(r.height + 8)}px`;
}
function hnr1533AudioOptionName(row) {
  return norm(row?.getAttribute('aria-label') || row?.innerText || row?.textContent || row?.getAttribute('data-uia') || 'audio option').slice(0,100);
}
function hnr1533FocusNativeAudioOption(row) {
  if (!(row instanceof HTMLElement) || !row.isConnected || !rendered(row)) return false;
  const rows = hnr1533AudioOptionRows();
  const idx = rows.indexOf(row);
  if (idx >= 0) hnr1533NativeAudioIndex = idx;
  if (!row.matches('button,a[href],[role="radio"],[role="option"],[tabindex]')) row.setAttribute('tabindex','-1');
  hnr1533RevealNativeEpisode(row);
  const result = focus(row);
  requestAnimationFrame(() => hnr1533UpdateNativeAudioFocusRing(row));
  setTimeout(() => hnr1533UpdateNativeAudioFocusRing(row), 60);
  return result;
}
function hnr1533AudioLooksSelected(row) {
  const marker = `${row.getAttribute('aria-checked') || ''} ${row.getAttribute('aria-selected') || ''} ${row.getAttribute('data-selected') || ''} ${row.getAttribute('class') || ''}`.toLowerCase();
  return /true|selected|checked|active/.test(marker) || !!row.querySelector('[aria-checked="true"],[aria-selected="true"],svg[data-icon*="check" i]');
}
function hnr1533FindAudioTriggerOrWake() {
  const root = hnr1533PlayerRoot();
  if (root) hnr1533KeepPlayerVisible(root);
  hnr1533FocusNativeTabStop(/audio|subtitle|caption/i);
  let trigger = hnr1533NativeAudioTrigger(root);
  if (!trigger) {
    hnr1533PulsePlayerPointer(hnr1533PlayerWakeTarget(root));
    hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(root));
    trigger = hnr1533NativeAudioTrigger(hnr1533PlayerRoot());
  }
  return trigger;
}
function hnr1533EnterNativeAudioMenu() {
  hnr1533NativeEpisodeMode = false;
  hnr1533StopNativeEpisodeWatch();
  clearTimeout(hnr1533NativeEpisodePollTimer);
  const episodeRing = document.getElementById('hnr1533-native-episode-focus-ring');
  if (episodeRing) episodeRing.hidden = true;
  hnr1533NativeAudioMode = true;
  hnr1533NativeAudioIndex = 0;
  hnr1533NativeAudioOpenAt = Date.now();
  hnr1533NativeAudioTriggerClicked = false;
  clearTimeout(hnr1533NativeAudioPollTimer);
  clearSelection();
  hnr1533EnsurePlayerOverlay().hidden = true;
  const rows = hnr1533AudioOptionRows();
  if (rows.length) {
    const current = rows.find(hnr1533AudioLooksSelected) || rows[0];
    hnr1533FocusNativeAudioOption(current);
    status(`Audio & Subtitles · ${rows.length} options · arrows move · OK applies`);
    return;
  }
  const trigger = hnr1533FindAudioTriggerOrWake();
  if (trigger) {
    hnr1533NativeAudioTriggerClicked = true;
    hnr1533SimulatePointerClick(trigger, trigger);
  }
  hnr1533WaitForNativeAudioOptions(0);
  status('Opening Netflix Audio & Subtitles');
}
function hnr1533WaitForNativeAudioOptions(attempt = 0) {
  if (!hnr1533NativeAudioMode) return;
  const rows = hnr1533AudioOptionRows();
  if (rows.length) {
    const current = rows.find(hnr1533AudioLooksSelected) || rows[Math.min(hnr1533NativeAudioIndex, rows.length - 1)] || rows[0];
    hnr1533FocusNativeAudioOption(current);
    status(`Audio & Subtitles · ${rows.length} options · arrows move · OK applies`);
    return;
  }
  const root = hnr1533NativeAudioMenuRoot();
  if (!root && !hnr1533NativeAudioTriggerClicked && attempt >= 3) {
    const trigger = hnr1533FindAudioTriggerOrWake();
    if (trigger) {
      hnr1533NativeAudioTriggerClicked = true;
      hnr1533SimulatePointerClick(trigger, trigger);
    }
  }
  if (attempt < 25) {
    hnr1533NativeAudioPollTimer = setTimeout(() => hnr1533WaitForNativeAudioOptions(attempt + 1), 140);
  } else {
    hnr1533NativeAudioMode = false;
    hnr1533EnsurePlayerOverlay().hidden = false;
    hnr1533UpdatePlayerOverlay();
    const ring = document.getElementById('hnr1533-native-audio-focus-ring');
    if (ring) ring.hidden = true;
    status('Netflix audio options were not found; returning to player controls');
  }
}
function hnr1533ExitNativeAudio(closeMenu = true) {
  const rows = hnr1533AudioOptionRows();
  const menuRoot = hnr1533NativeAudioMenuRoot() || rows[0]?.parentElement || null;
  const trigger = hnr1533FindNativeMenuTrigger('audio') || hnr1533NativeAudioTrigger(hnr1533PlayerRoot());
  hnr1533NativeAudioMode = false;
  clearTimeout(hnr1533NativeAudioPollTimer);
  const ring = document.getElementById('hnr1533-native-audio-focus-ring');
  if (ring) ring.hidden = true;
  // Repeated Escape retries dismissal even if the extension's audio mode already exited.
  if (closeMenu && rows.length) hnr1533ScheduleNativeMenuDismiss('audio', menuRoot, trigger);
  hnr1533ShowOverlayMain();
  hnr1533EnsurePlayerOverlay().hidden = false;
  const audioButton = hnr1533PlayerControls(hnr1533PlayerRoot()).find(el => /audio|subtitle/i.test(`${el.getAttribute('aria-label') || ''} ${el.getAttribute('data-uia') || ''}`));
  if (audioButton) focus(audioButton);
  if (!closeMenu || !rows.length) status('Audio focus closed · back to player controls');
}
function hnr1533HandleNativeAudioKey(e) {
  if (!hnr1533NativeAudioMode) return false;
  hnr1533KeepPlayerVisible(hnr1533PlayerRoot());
  let rows = hnr1533AudioOptionRows();
  if (!rows.length) {
    hnr1533WaitForNativeAudioOptions(0);
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' '].includes(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation(); return true;
    }
    return false;
  }
  let current = rows.find(row => row === selected || row.contains(selected) || selected?.contains?.(row));
  if (!current) {
    current = rows[Math.max(0, Math.min(rows.length - 1, hnr1533NativeAudioIndex))] || rows[0];
    hnr1533FocusNativeAudioOption(current);
  }
  if (e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'ArrowLeft') {
    hnr1533ExitNativeAudio(true);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  if (['ArrowUp','ArrowDown','ArrowRight'].includes(e.key)) {
    let target = hnr1533PlayerDirectionalTarget(current, rows, e.key);
    if (!target && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const idx = rows.indexOf(current), delta = e.key === 'ArrowDown' ? 1 : -1;
      target = rows[idx + delta] || current;
    }
    if (target && target !== current) hnr1533FocusNativeAudioOption(target);
    else hnr1533UpdateNativeAudioFocusRing(current);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    const row = current;
    const name = hnr1533AudioOptionName(row);
    const action = row.matches('button,a[href],[role="radio"],[role="option"],[role="menuitemradio"]')
      ? row
      : row.querySelector('button,a[href],[role="radio"],[role="option"],[role="menuitemradio"]') || row;
    hnr1533SimulatePointerClick(action, row, true);
    status(`Applying ${name}…`);
    setTimeout(() => {
      if (!hnr1533NativeAudioMode) return;
      const updated = hnr1533AudioOptionRows();
      if (!updated.length) { hnr1533ExitNativeAudio(false); return; }
      const same = updated.find(el => hnr1533AudioOptionName(el) === name) || updated.find(hnr1533AudioLooksSelected) || updated[Math.min(hnr1533NativeAudioIndex, updated.length - 1)];
      if (same) hnr1533FocusNativeAudioOption(same);
      status(`Selected ${name}`);
    }, 350);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  return true;
}

function hnr1533PlayerNavigate(e) {
  const root = hnr1533PlayerRoot();
  if (hnr1533NativeAudioMode && hnr1533HandleNativeAudioKey(e)) return true;
  let episodeItems = hnr1533PlayerEpisodeItems();
  if (!root) {
    if (location.pathname.startsWith("/watch/")) {
      hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(null));
      status("Trying page-level player wake; waiting for Netflix controls");
    } else status("Player found; waiting for controls");
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  if (hnr1533NativeEpisodeMode) {
    // Do not call hnr1533EnablePlayerFocusMode here: it focuses the player
    // surface on every keypress, stealing focus from the yellow-highlighted row.
    hnr1533KeepPlayerVisible(root);
    hnr1533UpdateNativeEpisodeFocusRing();
    episodeItems = hnr1533PlayerEpisodeItems();
    if (!episodeItems.length) {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"," "].includes(e.key)) {
        hnr1533RetryNativeEpisodeTray();
        e.preventDefault(); e.stopImmediatePropagation(); return true;
      }
      return false;
    }
    let current = episodeItems.find(row => row === selected || row.contains(selected) || selected?.contains?.(row));
    if (!current) {
      current = episodeItems[Math.min(hnr1533NativeEpisodeIndex, episodeItems.length - 1)] || episodeItems[0];
      hnr1533FocusNativeEpisode(current);
    }
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
      if (e.key === "ArrowLeft") {
        hnr1533ExitNativeEpisodes(true);
      } else {
        let target = hnr1533PlayerDirectionalTarget(current, episodeItems, e.key);
        // Netflix rows form a vertical list; arrow up/down should follow list
        // order even when transient layout bounds confuse geometric navigation.
        if (!target && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          const at = episodeItems.indexOf(current);
          const delta = e.key === "ArrowDown" ? 1 : -1;
          target = episodeItems[at + delta] || null;
        }
        if (target) hnr1533FocusNativeEpisode(target);
        else if (e.key === "ArrowRight") hnr1533UpdateNativeEpisodeFocusRing(current);
      }
      e.preventDefault(); e.stopImmediatePropagation(); return true;
    }
    if (e.key === "Escape" || e.key === "BrowserBack") {
      hnr1533ExitNativeEpisodes(true);
      e.preventDefault(); e.stopImmediatePropagation(); return true;
    }
    if (e.key === "Enter" || e.key === " ") {
      hnr1533ActivateNativeEpisode(current);
      e.preventDefault(); e.stopImmediatePropagation(); return true;
    }
    return true;
  }

  hnr1533EnablePlayerFocusMode(root);
  if (hnr1533HandlePlayerOverlay(e)) return true;

  const controls = hnr1533PlayerControls(root);
  const active = document.activeElement;
  const episodeOverlay = hnr1533PlayerEpisodeOverlay();
  episodeItems = hnr1533PlayerEpisodeItems();
  const inPlayerArea = el => !!el && (root.contains(el) || !!episodeOverlay?.contains(el) ||
    episodeItems.some(row => row === el || row.contains(el) || el.contains?.(row)));
  const selectedInPlayer = inPlayerArea(selected);
  const asControl = el => controls.find(c => c === el || c.contains(el)) || null;
  const current = selectedInPlayer ? asControl(selected) : null;
  const activeControl = inPlayerArea(active) ? asControl(active) : null;
  const effectiveCurrent = current || activeControl;

  if (!controls.length) {
    const wakeKey = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key);
    const canWake = wakeKey && !hnr1533PlayerWakePending && hnr1533FocusPlayerSurface(root);
    if (canWake) {
      hnr1533PlayerWakePending = true;
      setTimeout(() => { hnr1533PlayerWakePending = false; }, 800);
      hnr1533KeepPlayerVisible(root);
      hnr1533RequestPagePlayerWake(hnr1533PlayerWakeTarget(root));
      status("Trying a short page-level player wake");
      hnr1533ExtendPlayerControls(root, selected);
      return false;
    }
    status("Waiting for Netflix controls");
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  hnr1533PlayerWakePending = false;
  hnr1533ExtendPlayerControls(root, selected);
  if (!effectiveCurrent) {
    const initial = hnr1533DefaultPlayerControl(controls);
    if (initial) focus(initial);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
    const current = effectiveCurrent;
    const isEpisodesButton = /episodes/i.test(`${current.getAttribute("aria-label") || ""} ${current.getAttribute("data-uia") || ""} ${current.getAttribute("title") || ""}`);
    if (episodeItems.length && isEpisodesButton) {
      hnr1533NativeEpisodeMode = true;
      hnr1533StartNativeEpisodeWatch();
      hnr1533EnsurePlayerOverlay().hidden = true;
      const target = hnr1533PlayerDirectionalTarget(current, episodeItems, e.key) || episodeItems[0];
      if (target) hnr1533FocusNativeEpisode(target);
      e.preventDefault(); e.stopImmediatePropagation(); return true;
    }
    const target = hnr1533PlayerDirectionalTarget(current, controls, e.key);
    if (target) focus(target);
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && current.matches('[role="slider"],input[type="range"]')) {
      hnr1533WakePlayer(root); hnr1533RefreshPlayerFocus(root, current);
      e.preventDefault(); e.stopImmediatePropagation(); return true;
    }
    hnr1533WakePlayer(root);
    hnr1533ExtendPlayerControls(root, target || current);
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  if ((e.key === "Enter" || e.key === " ") && selectedInPlayer) {
    const control = asControl(selected) || effectiveCurrent;
    const isEpisodesButton = /episodes/i.test(`${control?.getAttribute("aria-label") || ""} ${control?.getAttribute("data-uia") || ""} ${control?.getAttribute("title") || ""}`);
    if (isEpisodesButton) hnr1533EnterNativeEpisodes();
    else if (control) { control.click(); hnr1533WakePlayer(root); }
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  }
  return true;
}
// Correct close logic for Search and dropdowns.
function searchInput() {
  return document.querySelector(S.search) || [...document.querySelectorAll("nav input")].find(el =>
    /search/i.test(`${el.getAttribute("aria-label")||""} ${el.getAttribute("placeholder")||""} ${el.getAttribute("data-uia")||""}`)
  ) || null;
}
function isSearch(el) { return !!el && (el.matches?.(S.search) || (el.tagName === "INPUT" && !!el.closest(S.nav) && /search/i.test(label(el) + " " + (el.getAttribute("placeholder")||"")))); }
function hnr1533ClickOutsideSearch(input) {
  // Send a complete click sequence at a neutral page surface outside Netflix's
  // search field. Netflix closes the expanded search UI from its outside-click
  // handler; blurring the input alone does not reliably collapse it.
  const searchArea = input?.closest(
    '[data-uia*="navigation+actions+search"],[data-uia*="search-input"],.searchBox'
  ) || input;
  const candidates = [
    document.querySelector('[data-uia="main-view"]'),
    document.querySelector("main"),
    document.querySelector(".lolomo"),
    document.body,
    document.documentElement
  ].filter(Boolean);
  let target = candidates.find(el =>
    el !== input && !el.contains(input) && !searchArea.contains(el) &&
    el.isConnected
  );

  // If a container wraps the whole document/search UI, body remains a valid
  // outside target for the delegated click listener.
  if (!target) target = document.body;
  const r = target.getBoundingClientRect?.() || {left:0,top:0,width:innerWidth,height:innerHeight};
  const x = Math.max(1, Math.min(innerWidth - 2, r.left + Math.min(Math.max(12, r.width * .12), Math.max(12,r.width-2))));
  const y = Math.max(1, Math.min(innerHeight - 2, r.top + Math.min(Math.max(12, r.height * .2), Math.max(12,r.height-2))));
  const init = {bubbles:true, cancelable:true, view:window, clientX:x, clientY:y, button:0};
  // React/Netflix versions have used pointer, mouse, and click listeners.
  try { target.dispatchEvent(new PointerEvent("pointerdown", {...init, pointerType:"mouse", isPrimary:true})); } catch {}
  try { target.dispatchEvent(new MouseEvent("mousedown", init)); } catch {}
  try { target.dispatchEvent(new PointerEvent("pointerup", {...init, pointerType:"mouse", isPrimary:true})); } catch {}
  try { target.dispatchEvent(new MouseEvent("mouseup", init)); } catch {}
  try { target.dispatchEvent(new MouseEvent("click", init)); } catch {}
  try { target.click(); } catch {}
}
function closeSearch() {
  const input = searchInput();
  hnr1533HideKeyboard(false);

  if (input && input.isConnected) {
    try {
      // Clear Netflix's React-controlled input before the outside click.
      input.focus();
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (set) set.call(input, ""); else input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
    } catch {}

    // The outside click is the close action. Do NOT click Netflix's Search icon
    // afterward: the input can remain mounted while collapsed, and toggling it
    // again would reopen Search (the v1.5.1 regression).
    setTimeout(() => {
      hnr1533ClickOutsideSearch(input);
      setTimeout(() => {
        const n = navTarget();
        if (n) focus(n); else clearSelection();
        status("Search closed · browsing restored");
      }, 180);
    }, 80);
  } else {
    const n = navTarget();
    if (n) focus(n); else clearSelection();
    status("Search keyboard closed");
  }
  return true;
}
function profileRoot() {
  const els = [...document.querySelectorAll("div,section,ul,[role='menu'],[data-uia]")].filter(rendered);
  const roots = els.filter(el => {
    if (el === document.body || nav()?.contains(el)) return false;
    const t = norm(el.innerText);
    return PROFILE_LABELS.every(w => t.includes(w));
  });
  roots.sort((a,b) => a.getBoundingClientRect().width*a.getBoundingClientRect().height - b.getBoundingClientRect().width*b.getBoundingClientRect().height);
  return roots[0] || null;
}
function profileItems(root = profileRoot()) {
  if (!root) return [];
  const wanted = ["Home","3rd room","Kids","Manage Profiles","Transfer Profile","Account","Help Centre"], out=[];
  for (const name of wanted) {
    const matches = [...root.querySelectorAll('a[href],button,[role="button"],[role="menuitem"],[tabindex]')].filter(el => rendered(el) && norm(el.innerText) === name);
    if (matches.length) {
      matches.sort((a,b) => a.getBoundingClientRect().width*a.getBoundingClientRect().height - b.getBoundingClientRect().width*b.getBoundingClientRect().height);
      if (!out.includes(matches[0])) out.push(matches[0]);
    }
  }
  return out;
}
function menuOptions(trigger) {
  const optSel = 'button,a[href],[role="menuitem"],[role="menuitemradio"],[role="option"],[tabindex="0"]';
  const controls = trigger.getAttribute("aria-controls") || trigger.getAttribute("aria-owns");
  let menu = controls ? document.getElementById(controls.replace(/^#/,"")) : null;
  if (!menu && trigger.parentElement) menu = [...trigger.parentElement.children].find(el => el !== trigger && el.matches('[role="menu"],[role="listbox"],[data-uia="dropdown-menu"]')) || null;
  if (menu) return [...menu.querySelectorAll(optSel)].filter(rendered);
  const nf = trigger.closest(".nfDropDown");
  if (nf) return [...nf.querySelectorAll(optSel)].filter(el => el !== trigger && rendered(el));
  const root = profileRoot();
  return root ? profileItems(root) : [];
}
function expandedTriggers() { return [...document.querySelectorAll('[aria-haspopup][aria-expanded="true"],[aria-expanded="true"][role="button"]')].filter(rendered); }
function expandedTrigger() {
  const ts = expandedTriggers(), active = document.activeElement;
  if (!ts.length) return null;
  if (ts.includes(active)) return active;
  for (const t of ts) if (menuOptions(t).includes(active)) return t;
  if (active?.matches?.("[aria-haspopup]") || sub()?.contains(active)) return null;
  return ts.sort((a,b) => center(b).x-center(a).x)[0];
}
function profileTrigger(root) {
  const t = expandedTriggers().filter(el => nav()?.contains(el)).sort((a,b)=>center(b).x-center(a).x)[0];
  if (t) return t;
  const n = nav();
  if (n) {
    const items=[...n.querySelectorAll('button,a[href],[role="button"]')].filter(rendered);
    if (items.length) return items.sort((a,b)=>center(b).x-center(a).x)[0];
  }
  return null;
}
function closeMenu(trigger, root) {
  if (trigger) { trigger.click(); status("Closing menu"); return true; }
  if (root) {
    const t = profileTrigger(root);
    if (t) { t.click(); status("Closing profile menu"); return true; }
  }
  return false;
}
function handleMenu(e) {
  const root = profileRoot(), trigger = expandedTrigger();
  if (!root && !trigger) return false;
  if (e.key === "Escape" || e.key === "BrowserBack" || e.key === "Backspace") {
    const closed = closeMenu(trigger, root);
    if (closed) { e.preventDefault(); e.stopImmediatePropagation(); }
    return true;
  }
  const options = trigger ? menuOptions(trigger) : profileItems(root);
  if (!options.length) return true;
  const active=document.activeElement, idx=options.indexOf(active);
  if (e.key === "Enter" || e.key === " ") {
    const item = idx>=0 ? options[idx] : (options.includes(selected) ? selected : null);
    if (item) { item.click(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (active === trigger && trigger) { trigger.click(); e.preventDefault(); e.stopImmediatePropagation(); }
    return true;
  }
  if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) return true;
  if (idx < 0) {
    if (e.key !== "ArrowUp" && options[0]) focus(options[0]);
  } else {
    const target = nearest(active, options, e.key) ||
      ((e.key==="ArrowUp"||e.key==="ArrowDown") ? options[Math.max(0,Math.min(options.length-1,idx+(e.key==="ArrowDown"?1:-1)))] : null);
    if (target) focus(target);
  }
  e.preventDefault(); e.stopImmediatePropagation(); return true;
}

// Netflix carousel paging: one page per key press, wait for the row to settle,
// and refocus the first arriving card. Also page when the selected card is still
// in the DOM but outside the carousel's viewport.
function rowPager(row, dir) {
  const pager = row.querySelector(dir > 0 ? '[data-uia$="-right-button"],.handleNext' : '[data-uia$="-left-button"],.handlePrev');
  return pager && pager.getClientRects().length ? pager : null;
}
function scroller(row) { return row.querySelector('[data-uia="carousel-scroller"]') || row; }
function hiddenSide(row, card) {
  const view = scroller(row).getBoundingClientRect(), r = card.getBoundingClientRect();
  if (r.right > view.right + 1) return 1;
  if (r.left < view.left - 1) return -1;
  return 0;
}
function turning(row) { return Date.now() < (rowTurns.get(row) || 0); }
function turnRow(row, pager, settled) {
  rowTurns.set(row, Date.now() + 3000);
  const keysAtStart = keyPressCount;
  pager.click();
  const start = Date.now(); let last = "", stable = 0;
  const tick = () => {
    const layout = cardsIn(row).map(c => `${Math.round(c.getBoundingClientRect().left)}:${c.getAttribute("aria-label")||label(c)}`).join("|");
    stable = layout === last ? stable + 1 : 0; last = layout;
    const elapsed = Date.now() - start;
    if ((stable >= 2 && elapsed > 300) || elapsed > 2800) {
      rowTurns.delete(row);
      settled(keysAtStart === keyPressCount);
      return;
    }
    setTimeout(tick, 80);
  };
  setTimeout(tick, 80);
}
function pageRow(row, dir) {
  if (turning(row)) return true;
  const pager = rowPager(row, dir);
  if (!pager) return false;
  turnRow(row, pager, stillSame => {
    if (!stillSame) return;
    const arrived = cardsIn(row).filter(c => hiddenSide(row,c) === 0);
    if (arrived.length) focus(dir > 0 ? arrived[0] : arrived[arrived.length-1]);
  });
  return true;
}
function revealCard(row, card, dir) {
  const side = hiddenSide(row, card);
  if (side === 0 || turning(row)) return;
  const pager = rowPager(row, dir || side);
  if (!pager) return;
  turnRow(row, pager, stillSame => {
    if (!stillSame) return;
    if (card.isConnected && hiddenSide(row,card) === 0) focus(card);
    else {
      const arrived = cardsIn(row).filter(c => hiddenSide(row,c) === 0);
      if (arrived.length) focus(dir > 0 ? arrived[0] : arrived[arrived.length-1]);
    }
  });
  focus(card);
}

function focusFirstCard() { const c=firstCard();if(!c)return false;focus(c);const r=rowOf(c);if(r)revealCard(r,c,0);return true; }
function enterContent() { if(subItems().length)return focus(subItems()[0]);if(heroActions().length)return focus(heroActions()[0]);return focusFirstCard(); }
function moveNav(e) {
 const a=navItems(),i=a.indexOf(document.activeElement);
 if(e.key==="ArrowDown"){enterContent();return true}
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"){if(!a.length)return false;const d=e.key==="ArrowRight"?1:-1;focus(a[(Math.max(0,i)+d+a.length)%a.length]);return true}
 return e.key==="ArrowUp";
}
function moveSub(e) {
 const a=subItems(),i=a.indexOf(document.activeElement);
 if(e.key==="ArrowUp"){if(navTarget())focus(navTarget());return true}
 if(e.key==="ArrowDown"){if(heroActions().length)focus(heroActions()[0]);else focusFirstCard();return true}
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"){if(a.length){const d=e.key==="ArrowRight"?1:-1;focus(a[Math.max(0,Math.min(a.length-1,Math.max(0,i)+d))]);}return true}
 return false;
}
function moveHero(e) {
 const a=heroActions(),i=a.indexOf(document.activeElement);
 if(e.key==="ArrowUp"){if(subItems().length)focus(subItems()[0]);else if(navTarget())focus(navTarget());return true}
 if(e.key==="ArrowDown"){focusFirstCard();return true}
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"){const d=e.key==="ArrowRight"?1:-1;focus(a[Math.max(0,Math.min(a.length-1,Math.max(0,i)+d))]);return true}
 return false;
}
function moveGrid(e) {
 // Browse carousel navigation owns arrow keys only. Enter must never fall
 // through the vertical branch below (which treats every non-Down key as Up).
 if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return false;
 const rs=rows(),active=document.activeElement;
 if(!rs.length)return false;
 const card=cardOf(active)||cardOf(selected),row=rowOf(active)||rowOf(selected);
 if(!card||!row){focusFirstCard();return true;}
 const ri=rs.indexOf(row),cards=cardsIn(row),ci=cards.indexOf(card);
 if(ri<0||ci<0){focusFirstCard();return true;}
 if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
  const d=e.key==="ArrowRight"?1:-1,next=ci+d;
  if((next<0||next>=cards.length)&&pageRow(row,d)){e.preventDefault();return true;}
  const target=cards[(next+cards.length)%cards.length];
  if(target){focus(target);revealCard(row,target,d);}
  e.preventDefault();return true;
 }
 if(e.key==="ArrowUp"&&ri===0){
  if(heroActions().length)focus(heroActions()[0]);else if(subItems().length)focus(subItems()[0]);else if(navTarget())focus(navTarget());
  e.preventDefault();return true;
 }
 const d=e.key==="ArrowDown"?1:-1;
 const nextRow=rs[ri+d];
 if(nextRow){const choices=cardsIn(nextRow);if(choices.length){const x=center(card).x;choices.sort((a,b)=>Math.abs(center(a).x-x)-Math.abs(center(b).x-x));focus(choices[0]);revealCard(nextRow,choices[0],0);e.preventDefault();return true;}}
 if(e.key==="ArrowDown") return false;
 // At top of current page section, Up from row first moves to hero; otherwise preserve page scroll when no row.
 e.preventDefault();return true;
}

function hnr1537IsSearchResultsPage() {
  return location.pathname === "/search" || location.pathname.startsWith("/search/");
}
function hnr1537SearchResultCards() {
  const raw = [...document.querySelectorAll(`${S.card}, a[href*="/title/"], a[href*="/watch/"]`)];
  const normalized = raw.map(el => el.closest(".slider-refocus") || el);
  return [...new Set(normalized)].filter(el =>
    rendered(el) &&
    !el.closest(`${S.nav}, ${S.modal}, #hnr1533-keyboard, #hnr1533-player-overlay, #hnr1533-status`) &&
    (el.matches(S.card) || el.matches('a[href*="/title/"],a[href*="/watch/"]'))
  );
}
function hnr1537MoveSearchGrid(event) {
  const cards = hnr1537SearchResultCards();
  if (!cards.length) return false;
  let current = cardOf(document.activeElement) || cardOf(selected);
  if (current && !cards.includes(current)) {
    current = cards.find(card => card.contains(current) || current.contains?.(card)) || null;
  }
  if (!current) {
    const target = cards[0];
    if (target) focus(target);
    return true;
  }

  const key = event.key;
  let target = null;
  if (key === "ArrowLeft" || key === "ArrowRight") {
    // On a search grid, left/right should stay on the same poster row; at row
    // edges do not fall through to the browser's page-scroll/default behavior.
    const a = center(current);
    const currentRect = current.getBoundingClientRect();
    const sameRowTolerance = Math.max(24, currentRect.height * 0.42);
    const candidates = cards.filter(card => {
      if (card === current) return false;
      const b = center(card);
      return Math.abs(b.y - a.y) <= sameRowTolerance &&
        (key === "ArrowRight" ? b.x > a.x + 5 : b.x < a.x - 5);
    });
    candidates.sort((x, y) => {
      const a1 = center(x), b1 = center(y);
      return Math.abs(a1.x - a.x) - Math.abs(b1.x - a.x) || Math.abs(a1.y - a.y) - Math.abs(b1.y - a.y);
    });
    target = candidates[0] || null;
  } else {
    target = nearest(current, cards, key);
  }

  if (target) {
    focus(target);
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const row = rowOf(target);
      if (row) revealCard(row, target, key === "ArrowRight" ? 1 : -1);
    }
    return true;
  }

  if (key === "ArrowUp") {
    // No result above this one means the focus is on the first visual row.
    // Return to Netflix navigation rather than letting the document scroll.
    const navItem = navTarget();
    if (navItem) focus(navItem);
  } else if (key === "ArrowDown") {
    // Search grids may lazy-mount more results. Scroll deliberately only when
    // no lower card currently exists, then reacquire the newly mounted cards.
    window.scrollBy({ top: Math.max(180, innerHeight * 0.58), behavior: "auto" });
    setTimeout(() => {
      if (!hnr1537IsSearchResultsPage() || !current.isConnected) return;
      const updated = hnr1537SearchResultCards();
      const next = nearest(current, updated, "ArrowDown");
      if (next) focus(next);
      else focus(current);
    }, 180);
  }
  return true;
}

// Browse-page Back confirmation. The Samsung remote's Back button is mapped to Backspace.
let hnr1533CloseConfirm = null;
let hnr1533CloseConfirmSelection = 1; // Start on No for safety.
const hnr1533IsBrowseHomeRoute = () => location.pathname === "/" || location.pathname === "/browse" || location.pathname.startsWith("/browse/");
// Pulse-Eight/libCEC reports the Samsung remote's Back key as `Clear` (keyCode 12)
// on this setup, even though it was configured as Escape in CEC Tray.
// Treat both standard Backspace and this Clear mapping as the browse-page Back action.
const hnr1533IsBackspaceKey = e => e.key === "Backspace" || e.code === "Backspace" || e.keyCode === 8 || e.which === 8 || e.key === "Clear" || e.code === "Clear" || e.keyCode === 12 || e.which === 12;

function hnr1533BuildCloseConfirm() {
  if (hnr1533CloseConfirm?.isConnected) return hnr1533CloseConfirm;
  const style = document.createElement("style");
  style.id = "hnr1533-close-confirm-css";
  style.textContent = `
    #hnr1533-close-confirm{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);font:600 16px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    #hnr1533-close-confirm[hidden]{display:none!important}
    #hnr1533-close-confirm .hnr1533-close-card{width:min(460px,94vw);padding:25px 26px 23px;border:1px solid rgba(255,255,255,.18);border-top:4px solid #e50914;border-radius:18px;background:linear-gradient(150deg,#222,#090909);box-shadow:0 24px 80px rgba(0,0,0,.76);text-align:center}
    #hnr1533-close-confirm .hnr1533-close-eyebrow{color:#aaa;font-size:10px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin-bottom:9px}
    #hnr1533-close-confirm .hnr1533-close-title{font-size:27px;font-weight:850;line-height:1.1;margin:0 0 10px}
    #hnr1533-close-confirm .hnr1533-close-copy{font-size:14px;font-weight:500;color:#c9c9c9;margin:0 0 23px}
    #hnr1533-close-confirm .hnr1533-close-actions{display:flex;justify-content:center;gap:14px}
    #hnr1533-close-confirm .hnr1533-close-choice{min-width:128px;height:52px;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:linear-gradient(160deg,#393939,#222);color:#f8f8f8;font:800 16px system-ui,sans-serif;cursor:pointer;outline:none}
    #hnr1533-close-confirm .hnr1533-close-choice.selected{background:#f6f6f6;border-color:#fff;color:#111;outline:3px solid #fff;outline-offset:3px;box-shadow:0 0 0 2px rgba(0,0,0,.9),0 0 22px rgba(255,255,255,.16)}
    #hnr1533-close-confirm .hnr1533-close-hint{margin-top:17px;color:#aaa;font-size:11px;font-weight:600;letter-spacing:.01em}
    #hnr1533-close-confirm .hnr1533-close-hint strong{color:#fff}
    @media(max-height:600px){#hnr1533-close-confirm .hnr1533-close-card{padding:18px 20px}#hnr1533-close-confirm .hnr1533-close-title{font-size:23px;margin-bottom:7px}#hnr1533-close-confirm .hnr1533-close-copy{margin-bottom:15px}#hnr1533-close-confirm .hnr1533-close-choice{height:44px}#hnr1533-close-confirm .hnr1533-close-hint{margin-top:10px}}
  `;
  document.documentElement.append(style);
  const root = document.createElement("div");
  root.id = "hnr1533-close-confirm";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Close browser confirmation");
  root.innerHTML = '<div class="hnr1533-close-card"><div class="hnr1533-close-eyebrow">TV Remote</div><h2 class="hnr1533-close-title">Close browser?</h2><p class="hnr1533-close-copy">Close this Chrome window and return to Playnite?</p><div class="hnr1533-close-actions"><button type="button" class="hnr1533-close-choice" data-choice="yes">Yes, close</button><button type="button" class="hnr1533-close-choice" data-choice="no">No, stay</button></div><div class="hnr1533-close-hint"><strong>← / →</strong> choose · <strong>OK</strong> confirm · <strong>Back</strong> cancel</div></div>';
  root.addEventListener("click", event => {
    const button = event.target.closest("[data-choice]");
    if (!button) return;
    if (button.dataset.choice === "yes") hnr1533ConfirmCloseWindow();
    else hnr1533HideCloseConfirm();
  });
  document.documentElement.append(root);
  hnr1533CloseConfirm = root;
  return root;
}

function hnr1533UpdateCloseConfirm() {
  if (!hnr1533CloseConfirm) return;
  const buttons = [...hnr1533CloseConfirm.querySelectorAll("[data-choice]")];
  buttons.forEach((button, index) => {
    const selected = index === hnr1533CloseConfirmSelection;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function hnr1533ShowCloseConfirm(triggerKey = "Backspace") {
  const root = hnr1533BuildCloseConfirm();
  hnr1533CloseConfirmSelection = 1; // Default to No.
  root.hidden = false;
  hnr1533UpdateCloseConfirm();
  console.info("[TV Remote] Close confirmation shown", { triggerKey, route: location.pathname, selection: "No" });
}

function hnr1533HideCloseConfirm() {
  if (hnr1533CloseConfirm) hnr1533CloseConfirm.hidden = true;
  console.info("[TV Remote] Close confirmation dismissed");
}

function hnr1533ConfirmCloseWindow() {
  console.info("[TV Remote] Close confirmed; requesting Chrome window close.");
  try {
    chrome.runtime.sendMessage({ type: "HNR_CLOSE_NETFLIX_BROWSE_TAB" }, response => {
      if (chrome.runtime.lastError) {
        console.error("[TV Remote] Chrome window close request failed:", chrome.runtime.lastError.message);
        status("Could not close browser window");
      } else if (!response?.ok) {
        console.error("[TV Remote] Chrome window close rejected:", response);
        status("Could not close browser window");
      } else {
        console.info("[TV Remote] Chrome window close accepted.", response);
      }
    });
  } catch (error) {
    console.error("[TV Remote] Could not send browser-close request:", error);
    status("Could not close browser window");
  }
}

function hnr1533HandleCloseConfirmKey(e) {
  if (!hnr1533CloseConfirm || hnr1533CloseConfirm.hidden) return false;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"].includes(e.key)) {
    hnr1533CloseConfirmSelection = 1 - hnr1533CloseConfirmSelection;
    hnr1533UpdateCloseConfirm();
  } else if (e.key === "Enter" || e.key === " ") {
    if (hnr1533CloseConfirmSelection === 0) hnr1533ConfirmCloseWindow();
    else hnr1533HideCloseConfirm();
  } else if (e.key === "Escape" || e.key === "BrowserBack" || hnr1533IsBackspaceKey(e)) {
    // A held remote button may generate repeated keydown events after opening
    // the dialog. Do not let the same held press immediately dismiss the prompt.
    if (!e.repeat) hnr1533HideCloseConfirm();
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  return true;
}

function onKey(e) {
 if (hnr1533DispatchingNativeShortcut || hnr1533BypassKeyRouter) return;
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.isTrusted) keyPressCount++;
 const active=document.activeElement;
 if (hnr1533IsBackspaceKey(e)) {
   console.info("[TV Remote] Back/Clear key received:", { key: e.key, code: e.code, keyCode: e.keyCode, which: e.which, repeat: e.repeat, route: location.pathname, activeElement: active?.tagName || null, inModal: !!activeModal(), playerActive: hnr1533IsPlayerActive(), keyboardVisible: !!hnr1533KeyboardVisible });
 }
 if (hnr1533HandleCloseConfirmKey(e)) return;
 // If Netflix left a native tray open after the extension exited its mode, let Escape
 // retry native dismissal rather than merely hiding the extension overlay.
 if (location.pathname.startsWith('/watch/') && (e.key === 'Escape' || e.key === 'BrowserBack')) {
   if (hnr1533NativeAudioMode || hnr1533HasLiveAudioTray()) {
     hnr1533ExitNativeAudio(true); e.preventDefault(); e.stopImmediatePropagation(); return;
   }
   if (hnr1533NativeEpisodeMode || hnr1533HasLiveEpisodeTray()) {
     hnr1533ExitNativeEpisodes(true); e.preventDefault(); e.stopImmediatePropagation(); return;
   }
 }
 // The injected keyboard is intentionally handled before Search or page navigation.
 if(hnr1533KeyboardVisible && hnr1533Keyboard && !hnr1533Keyboard.hidden) {
   if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
     hnr1533KeyboardMove(e.key);e.preventDefault();e.stopImmediatePropagation();return;
   }
   if(e.key==="Enter"||e.key===" ") {
     const key=hnr1533KeyboardKeys()[hnr1533KeyboardSelection];
     if(key)hnr1533ActivateKey(key.dataset.key);
     e.preventDefault();e.stopImmediatePropagation();return;
   }
   if(e.key==="Escape"||e.key==="BrowserBack") {
     closeSearch();e.preventDefault();e.stopImmediatePropagation();return;
   }
   if(e.key==="Backspace") {
     hnr1533ActivateKey("⌫");e.preventDefault();e.stopImmediatePropagation();return;
   }
 }

 // Search is its own region, except an overlay takes priority below.
 if(isSearch(active) && !activeModal()) {
  if(!hnr1533KeyboardVisible) hnr1533ShowKeyboard(active);
  if(e.key==="Escape"||e.key==="BrowserBack"||e.key==="Backspace") {
    closeSearch();e.preventDefault();e.stopImmediatePropagation();return;
  }
  if(e.key==="ArrowDown"){const c=firstCard()||document.querySelector('[data-uia="search-suggestion-item-link"]');if(c)focus(c);e.preventDefault();e.stopImmediatePropagation();}
  return;
 }

 // Actual playback has priority over generic page menus; once active, the
 // yellow-ring controller owns arrows/OK until Back exits the player.
 if(hnr1533IsPlayerActive()) {
   if(e.key==="Escape"||e.key==="BrowserBack") {
     if (hnr1533NativeAudioMode) {
       hnr1533ExitNativeAudio(true);
       e.preventDefault();e.stopImmediatePropagation();return;
     }
     if (hnr1533NativeEpisodeMode) {
       hnr1533ExitNativeEpisodes(true);
       e.preventDefault();e.stopImmediatePropagation();return;
     }
     if (hnr1533OverlayVisible()) {
       hnr1533HidePlayerOverlay();
       status("Player remote closed");
       e.preventDefault();e.stopImmediatePropagation();return;
     }
     e.preventDefault();e.stopImmediatePropagation();hnr1533PlayerBack();return;
   }
   if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"," "].includes(e.key)) {
     hnr1533PlayerNavigate(e);return;
   }
 }

 // The modal is checked BEFORE any base-page dropdown/profile handlers.
 // A dropdown inside the modal may own its own keys, but a background menu must
 // never steal navigation from More Info.
 const modal=activeModal();
 if(modal) {
   const expanded = [...document.querySelectorAll('[aria-haspopup][aria-expanded="true"]')]
     .find(t => modal.contains(t));
   if(expanded && handleMenu(e)) return;
   handleModal(e,modal);
   return;
 }

 // Netflix search results use a grid rather than the carousel-row structure
 // expected by moveGrid(). Handle that route explicitly so arrow input moves
 // poster focus instead of scrolling the browser page.
 if (hnr1537IsSearchResultsPage() && !hnr1533KeyboardVisible &&
     !isText(active) && !nav()?.contains(active) && !sub()?.contains(active) &&
     ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
   hnr1537MoveSearchGrid(e);
   e.preventDefault();
   e.stopImmediatePropagation();
   return;
 }

 if(handleMenu(e)) return;
 if(isText(active))return;
 // Browse carousel focus used to interpret Enter as the Up branch of moveGrid.
 // Reuse the Search page's direct-click activation path before generic movement.
 if (e.key === 'Enter' && !hnr1537IsSearchResultsPage()) {
   const activeCard = cardOf(document.activeElement) || cardOf(selected);
   const candidate = selected && activeCard && (selected === activeCard || activeCard.contains(selected))
     ? selected
     : (activeCard && (activeCard.contains(document.activeElement) || activeCard === document.activeElement) ? document.activeElement : activeCard);
   if (activeCard && rendered(activeCard) && !activeCard.closest(S.modal) &&
       !activeCard.closest('#hnr1533-player-overlay,#hnr1533-keyboard')) {
     e.preventDefault(); e.stopImmediatePropagation();
     if (candidate instanceof HTMLElement && candidate.isConnected) candidate.click();
     else activeCard.click();
     return;
   }
 }
 if(e.key==="Escape"||e.key==="BrowserBack"||hnr1533IsBackspaceKey(e)) {
   const i=searchInput();
   if(i && (i.value.trim() || visible(i))) {
     closeSearch(); e.preventDefault(); e.stopImmediatePropagation(); return;
   }
   // On Netflix's browse/home tabs, Back asks for confirmation rather than
   // closing the Chrome window immediately. Search, More Info, and playback
   // have already taken priority in the handlers above.
   if (hnr1533IsBrowseHomeRoute() && !hnr1533IsPlayerActive() && !activeModal() && !hnr1533KeyboardVisible) {
     e.preventDefault(); e.stopImmediatePropagation();
     hnr1533ShowCloseConfirm(e.key || (hnr1533IsBackspaceKey(e) ? "Backspace" : "Back"));
     return;
   }
   if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); }
   return;
 }
 let handled=false;
 if(nav()?.contains(active))handled=moveNav(e);
 else if(sub()?.contains(active))handled=moveSub(e);
 else if(heroActions().includes(active))handled=moveHero(e);
 else if(cardOf(active)||cardOf(selected)||rowOf(active))handled=moveGrid(e);
 else if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
   clearSelection();
   if(e.key==="ArrowDown"){handled=enterContent();if(!handled){window.scrollBy({top:Math.max(150,innerHeight*.65),behavior:"auto"});return}}
   else if(e.key==="ArrowUp"){if(window.scrollY>0){window.scrollBy({top:-Math.max(150,innerHeight*.65),behavior:"auto"});return}if(navTarget())handled=focus(navTarget());}
   else if(navTarget())handled=focus(navTarget());
 }
 if(handled){e.preventDefault();e.stopImmediatePropagation();}
 if(e.key==="Enter"&&selected&&rendered(selected)&&!isText(selected)){e.preventDefault();e.stopImmediatePropagation();selected.click();}
}
console.info("[TV Remote] v1.5.50 loaded (no hold detector):", location.href);

document.addEventListener("keydown", onKey, true);
document.addEventListener("input", e => {
  if (hnr1533KeyboardVisible && isSearch(e.target)) hnr1533ResetSearchWatchdog();
}, true);
document.addEventListener("click", e => {
  if (!hnr1533KeyboardVisible) return;
  if (hnr1533Keyboard?.contains(e.target) || isSearch(e.target)) hnr1533ResetSearchWatchdog();
}, true);
document.addEventListener("focusin", e => {
  if (isSearch(e.target) && !activeModal()) {
    // Wait briefly for Netflix to finish expanding the search control.
    setTimeout(() => { if (document.activeElement === e.target && !hnr1533KeyboardVisible) hnr1533ShowKeyboard(e.target); }, 80);
  }
}, true);

let hnr1533ModalRef = null;
const hnr1533ModalObserver = new MutationObserver(() => {
  const modal = activeModal();
  if (modal && modal !== hnr1533ModalRef) {
    hnr1533ModalRef = modal;
    // Give Netflix a short beat to finish building its action row.
    setTimeout(() => {
      if (activeModal() !== modal) return;
      const active = document.activeElement;
      if (!modal.contains(active)) {
        const actions = modalActions(modal), stops = modalStops(modal), close = modalClose(modal);
        const first = actions[0] || close || stops[0];
        if (first) focus(first, modal);
        else status("More Info detected; no controls matched");
      }
    }, 100);
  } else if (!modal && hnr1533ModalRef) {
    hnr1533ModalRef = null;
    clearSelection();
    status("More Info closed");
  }
});
hnr1533ModalObserver.observe(document.documentElement, {
  subtree: true, childList: true, attributes: true,
  attributeFilter: ["class", "style", "aria-hidden", "aria-expanded", "data-uia"]
});
let hnr1533PlayerDomRefreshTimer = 0;
const hnr1533PlayerDomObserver = new MutationObserver(() => {
  if (!hnr1533PlayerMode) return;
  clearTimeout(hnr1533PlayerDomRefreshTimer);
  hnr1533PlayerDomRefreshTimer = setTimeout(() => {
    if (!hnr1533PlayerMode || !hnr1533IsPlayerActive()) return;
    hnr1533KeepPlayerVisible(hnr1533PlayerRoot());
  }, 80);
});
hnr1533PlayerDomObserver.observe(document.documentElement, {
  subtree: true, childList: true, attributes: true,
  attributeFilter: ["class", "style", "aria-hidden", "aria-expanded", "data-uia"]
});
setTimeout(()=>{if(document.activeElement===document.body){if(heroActions().length)focus(heroActions()[0]);else enterContent();}},1200);
status("Ready · v1.5.41");
})();
