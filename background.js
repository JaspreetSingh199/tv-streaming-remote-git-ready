"use strict";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "HNR_CLOSE_NETFLIX_BROWSE_TAB") return;
  const tabId = sender?.tab?.id;
  const windowId = sender?.tab?.windowId;
  const senderUrl = sender?.url || sender?.tab?.url || "";
  let url;
  try { url = new URL(senderUrl); } catch { sendResponse({ ok: false, reason: "invalid-url" }); return; }
  const isNetflix = url.origin === "https://www.netflix.com";
  // The user has explicitly confirmed the close dialog. Allow closing from any Netflix route,
  // including More Info/player routes where the confirmation may have been opened.
  if (!Number.isInteger(tabId) || !Number.isInteger(windowId) || !isNetflix) {
    sendResponse({ ok: false, reason: "not-netflix-window" });
    return;
  }

  // Unrestricted close behavior for this Netflix browse-page command:
  // close the entire Chrome window regardless of tab count.
  chrome.windows.remove(windowId).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false, reason: "close-failed" })
  );
  return true;
});
