// Background Service Worker handles cross-origin fetch to GFG
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search_gfg") {
    const q = encodeURIComponent(request.query);
    const url = `https://practice.geeksforgeeks.org/api/v1/problems/?page=1&query=${q}`;

    fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const slug = data?.results?.[0]?.slug;
        const gfgUrl = slug ? `https://www.geeksforgeeks.org/problems/${slug}/1` : "";
        sendResponse({ success: true, url: gfgUrl });
      })
      .catch((err) => {
        console.warn("[Background] GFG fetch error:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }
});