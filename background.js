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

  // Unrestricted close behavior for this Netflix browse-page command:
  // close the entire Chrome window regardless of tab count.
  chrome.windows.remove(windowId).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false, reason: "close-failed" })
  );
  return true;
});
