"use strict";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "HNR_CLOSE_NETFLIX_BROWSE_TAB") return;
  const tabId = sender?.tab?.id;
  const senderUrl = sender?.url || sender?.tab?.url || "";
  let url;
  try { url = new URL(senderUrl); } catch { sendResponse({ ok: false }); return; }
  const isNetflix = url.origin === "https://www.netflix.com";
  const isBrowsePage = url.pathname === "/" || url.pathname === "/browse" || url.pathname.startsWith("/browse/");
  if (!Number.isInteger(tabId) || !isNetflix || !isBrowsePage) {
    sendResponse({ ok: false });
    return;
  }
  chrome.tabs.remove(tabId).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false })
  );
  return true;
});
