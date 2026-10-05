console.log("🟢 [TUF-GFG] Extension content script active!");

function cleanKey(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const gfgDatabase = new Map();
let isDataLoaded = false;
let isExtensionActive = false;
let observer = null;

// Room & WebSocket States
let ws = null;
let currentRoomConfig = null;

function connectRoomSocket() {
  if (ws || !currentRoomConfig?.roomId || !currentRoomConfig?.username) return;

  try {
    // 1. THIS LINE MUST BE PRESENT AND UNCOMMENTED
    ws = new WebSocket("wss://server-tuf-enhancer-final.onrender.com/");

    // 2. Now ws is no longer null, and this will execute successfully
    ws.onopen = () => {
      console.log("🟢 [TUF-GFG] Connected to live study room");
      ws.send(JSON.stringify({
        type: "JOIN_ROOM",
        roomId: currentRoomConfig.roomId,
        username: currentRoomConfig.username
      }));
    };
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "ROOM_PRESENCE") {
          renderRoomWidget(data.members);
        } else if (data.type === "ROOM_ERROR") {
          console.warn("Room error:", data.message);
        }
      } catch (e) {
        console.error("Malformed socket message:", e);
      }
    };

    ws.onclose = () => {
      console.log("🔴 [TUF-GFG] Disconnected from study room");
      ws = null;
      removeRoomWidget();
    };
  } catch (err) {
    console.warn("WebSocket connection failure:", err);
  }
}
function disconnectRoomSocket() {
  if (ws) {
    if (ws.readyState === WebSocket.OPEN && currentRoomConfig) {
      ws.send(JSON.stringify({ type: "LEAVE_ROOM" }));
    }
    ws.close();
    ws = null;
  }
  removeRoomWidget();
}

function removeRoomWidget() {
  const el = document.getElementById("tuf-room-widget");
  if (el) el.remove();
}

function renderRoomWidget(members = []) {
  if (!isExtensionActive || !currentRoomConfig) {
    removeRoomWidget();
    return;
  }

  let widget = document.getElementById("tuf-room-widget");
  if (!widget) {
    widget = document.createElement("div");
    widget.id = "tuf-room-widget";
    widget.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; width: 260px; background: #18181b;
      border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px;
      font-family: sans-serif; color: #fafafa; z-index: 999999; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(widget);
  }

  const memberItems = members.map((m) => `
    <div style="display: flex; flex-direction: column; background: #27272a; padding: 6px 8px; border-radius: 6px; font-size: 11px; margin-top: 6px;">
      <span style="font-weight: 600; color: ${m.username === currentRoomConfig.username ? '#4ade80' : '#ffffff'}">
        ${m.username === currentRoomConfig.username ? `${m.username} (You)` : m.username}
      </span>
      <span style="color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
        ${m.currentProblem || "Viewing sheet"}
      </span>
    </div>
  `).join("");

  widget.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; padding-bottom: 8px;">
      <div>
        <span style="font-size: 12px; font-weight: 700; color: #60a5fa;">${currentRoomConfig.roomId}</span>
        <button id="tuf-widget-copy-btn" style="background: #27272a; border: 1px solid #3f3f46; color: #d4d4d8; font-size: 10px; border-radius: 4px; padding: 2px 6px; margin-left: 6px; cursor: pointer;">Copy</button>
      </div>
      <span style="font-size: 11px; color: #22c55e; font-weight: 500;">● ${members.length} online</span>
    </div>
    <div style="display: flex; flex-direction: column; max-height: 180px; overflow-y: auto;">
      ${memberItems}
    </div>
  `;

  const copyBtn = document.getElementById("tuf-widget-copy-btn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(currentRoomConfig.roomId);
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
    };
  }
}

function broadcastProblem(title) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "SET_PROBLEM",
      problemName: title
    }));
  }
}

function createGfgButton(gfgUrl) {
  const wrap = document.createElement("div");
  wrap.className = "sheet-tree-module__lpXZ8G__actionButtonWrap tuf-gfg-wrapper";

  const a = document.createElement("a");
  a.href = gfgUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "group/button inline-flex shrink-0 items-center justify-center border border-transparent font-medium whitespace-nowrap outline-none h-8 !p-1 gap-1 rounded-full hover:bg-muted cursor-pointer";

  const img = document.createElement("img");
  img.alt = "GFG";
  img.className = "size-4 w-[14px] h-[14px]";

  try {
    img.src = chrome.runtime.getURL("assets/gfg.svg");
  } catch (err) {
    a.textContent = "GFG";
    a.style.fontSize = "10px";
  }

  a.appendChild(img);
  wrap.appendChild(a);
  return wrap;
}

function removeGfgButtons() {
  document.querySelectorAll(".tuf-gfg-wrapper").forEach((el) => el.remove());
}

function inject() {
  if (!isExtensionActive) return;

  const rows = document.querySelectorAll("tr[data-row-type='practice']");
  if (rows.length === 0) return;

  rows.forEach((tr) => {
    const labelSpan = tr.querySelector("[class*='problemLabel']");
    const title = labelSpan?.childNodes[0]?.textContent?.trim() || "";

    if (!tr.dataset.trackedForRoom) {
      tr.dataset.trackedForRoom = "true";
      tr.addEventListener("click", () => {
        if (title) broadcastProblem(title);
      });
    }

    if (tr.querySelector(".tuf-gfg-wrapper")) return;

    const tufAnchor = tr.querySelector("a[href*='/practice/dsa/']");
    const slug = tufAnchor?.getAttribute("href")?.split("/").filter(Boolean).pop() || "";

    const gfgUrl = gfgDatabase.get(cleanKey(title)) || gfgDatabase.get(cleanKey(slug));
    if (!gfgUrl) return;

    const actionsPack = tr.querySelector("[class*='practiceActionsPack']");
    if (!actionsPack) return;

    const wrap = createGfgButton(gfgUrl);
    const lcWrap = actionsPack.querySelector("a[href*='leetcode.com']")?.closest("[class*='actionButtonWrap']");
    const utilityWrap = actionsPack.querySelector(
      "button[aria-label='Notes'], [data-notes-trigger='true'], button[aria-label='Bookmark'], button[aria-label='More options']"
    )?.closest("[class*='actionButtonWrap']");

    if (lcWrap) {
      lcWrap.insertAdjacentElement("afterend", wrap);
    } else if (utilityWrap) {
      utilityWrap.insertAdjacentElement("beforebegin", wrap);
    } else {
      actionsPack.appendChild(wrap);
    }
  });
}

async function loadDatabase() {
  if (isDataLoaded) return true;

  try {
    const gistUrl = "https://gist.githubusercontent.com/GauranshGupta/8f8a4663c8b067634d9d35b1e1d2a847/raw/c4d268bdec540e745ae5785d96e2445caddaa937/final_sheet.json";
    const fetchUrl = `${gistUrl}?t=${Date.now()}`;

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sheetData = await response.json();

    sheetData.forEach((item) => {
      const gfg = item["question-gfg"]?.trim();
      if (!gfg) return;

      if (item["question-name"]) {
        gfgDatabase.set(cleanKey(item["question-name"]), gfg);
      }

      if (item["tuf-slug"]) {
        const slug = item["tuf-slug"].split("/").filter(Boolean).pop();
        if (slug) gfgDatabase.set(cleanKey(slug), gfg);
      }
    });

    isDataLoaded = true;
    console.log(`🟢 [TUF-GFG] Indexed ${gfgDatabase.size} lookup keys from live Gist.`);
    return true;
  } catch (err) {
    console.error("🔴 [TUF-GFG] Failed to load live JSON database:", err);
    return false;
  }
}

async function start() {
  isExtensionActive = true;
  const ready = await loadDatabase();
  if (!ready || !isExtensionActive) return;

  inject();
  connectRoomSocket();

  if (!observer) {
    observer = new MutationObserver(() => inject());
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function stop() {
  isExtensionActive = false;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  removeGfgButtons();
  disconnectRoomSocket();
}

// Check initial state
chrome.storage.local.get({ isActive: false, roomConfig: null }, (data) => {
  currentRoomConfig = data.roomConfig;
  if (data.isActive) {
    setTimeout(() => { start(); }, 1200);
  }
});

// React dynamically to storage modifications
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.roomConfig) {
      currentRoomConfig = changes.roomConfig.newValue;
      disconnectRoomSocket();
      if (isExtensionActive && currentRoomConfig) connectRoomSocket();
    }

    if (changes.isActive !== undefined) {
      if (changes.isActive.newValue) {
        start();
      } else {
        stop();
      }
    }
  }
});