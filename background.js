"use strict";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "HNR_CLOSE_NETFLIX_BROWSE_TAB") return;
  const tabId = sender?.tab?.id;
  const windowId = sender?.tab?.windowId;
  const senderUrl = sender?.url || sender?.tab?.url || "";
  let url;
  try { url = new URL(senderUrl); } catch { sendResponse({ ok: false, reason: "invalid-url" }); return; }
  const isNetflix = url.origin === "https://www.netflix.com";
  const isBrowsePage = url.pathname === "/" || url.pathname === "/browse" || url.pathname.startsWith("/browse/");
  if (!Number.isInteger(tabId) || !Number.isInteger(windowId) || !isNetflix || !isBrowsePage) {
    sendResponse({ ok: false, reason: "not-browse-page" });
    return;
  }

  // In the intended kiosk setup, Netflix is the only tab. Close the whole
  // Chrome window in that case so Escape returns to the launcher/Playnite.
  // If the window contains other tabs, only close the Netflix tab.
  chrome.tabs.query({ windowId }).then(tabs => {
    if (tabs.length <= 1) return chrome.windows.remove(windowId);
    return chrome.tabs.remove(tabId);
  }).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false, reason: "close-failed" })
  );
  return true;
});
