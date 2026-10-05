const SERVER_URL = "wss://server-tuf-enhancer-final.onrender.com/";
// const SERVER_URL = "ws://localhost:3000";
const extensionToggle = document.getElementById("extensionToggle");
const usernameInput = document.getElementById("usernameInput");
const roomIdInput = document.getElementById("roomIdInput");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const copyRoomBtn = document.getElementById("copyRoomBtn");
const inRoomSection = document.getElementById("inRoomSection");
const noRoomSection = document.getElementById("noRoomSection");
const currentRoomText = document.getElementById("currentRoomText");
const statusMsg = document.getElementById("statusMsg");

function showStatus(text, isError = false) {
  statusMsg.textContent = text;
  statusMsg.className = `status-msg ${isError ? 'status-error' : 'status-ok'}`;
  setTimeout(() => {
    statusMsg.textContent = "";
  }, 4000);
}

// Render active UI view
function updateUI(roomConfig) {
  if (roomConfig && roomConfig.roomId) {
    inRoomSection.style.display = "block";
    noRoomSection.style.display = "none";
    currentRoomText.textContent = roomConfig.roomId;
    if (roomConfig.username) usernameInput.value = roomConfig.username;
  } else {
    inRoomSection.style.display = "none";
    noRoomSection.style.display = "block";
  }
}

// 1. Load initial state
chrome.storage.local.get({ isActive: false, roomConfig: null, savedUsername: "" }, (data) => {
  extensionToggle.checked = data.isActive;
  if (data.savedUsername) usernameInput.value = data.savedUsername;
  updateUI(data.roomConfig);
});

// 2. Toggle extension on/off
extensionToggle.addEventListener("change", () => {
  chrome.storage.local.set({ isActive: extensionToggle.checked });
});

// 3. Save username whenever changed
usernameInput.addEventListener("input", () => {
  chrome.storage.local.set({ savedUsername: usernameInput.value.trim() });
});

// 4. Create Room Button: Connects to server to get a unique random ID
createRoomBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim() || "User_" + Math.floor(1000 + Math.random() * 9000);
  usernameInput.value = username;
  chrome.storage.local.set({ savedUsername: username });

  createRoomBtn.disabled = true;
  createRoomBtn.textContent = "Creating...";

  const tempWs = new WebSocket(SERVER_URL);

  tempWs.onopen = () => {
    tempWs.send(JSON.stringify({ type: "CREATE_ROOM" }));
  };

  tempWs.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.type === "ROOM_CREATED") {
        const newRoomConfig = { roomId: data.roomId, username };
        chrome.storage.local.set({ roomConfig: newRoomConfig, isActive: true }, () => {
          extensionToggle.checked = true;
          updateUI(newRoomConfig);
          showStatus(`Room ${data.roomId} created!`);
          navigator.clipboard.writeText(data.roomId);
        });
        tempWs.close();
      }
    } catch (e) {
      console.error(e);
    }
  };

  tempWs.onerror = () => {
    showStatus("Server unreachable. Try again.", true);
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = "Create New Room";
  };
});

// 5. Join Room Button
joinRoomBtn.addEventListener("click", () => {
  const roomId = roomIdInput.value.trim().toUpperCase();
  const username = usernameInput.value.trim() || "User_" + Math.floor(1000 + Math.random() * 9000);
  usernameInput.value = username;

  if (!roomId) {
    showStatus("Please enter a Room ID", true);
    return;
  }

  joinRoomBtn.disabled = true;
  joinRoomBtn.textContent = "Joining...";

  // Verify room exists on server first
  const tempWs = new WebSocket(SERVER_URL);

  tempWs.onopen = () => {
    tempWs.send(JSON.stringify({ type: "JOIN_ROOM", roomId, username }));
  };

  tempWs.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.type === "ROOM_ERROR") {
        showStatus(data.message, true);
        tempWs.close();
        joinRoomBtn.disabled = false;
        joinRoomBtn.textContent = "Join Room";
      } else if (data.type === "JOIN_SUCCESS" || data.type === "ROOM_PRESENCE") {
        const newRoomConfig = { roomId, username };
        chrome.storage.local.set({ roomConfig: newRoomConfig, isActive: true }, () => {
          extensionToggle.checked = true;
          updateUI(newRoomConfig);
          showStatus("Joined successfully!");
        });
        tempWs.close();
      }
    } catch (e) {
      console.error(e);
    }
  };

  tempWs.onerror = () => {
    showStatus("Server unreachable. Try again.", true);
    joinRoomBtn.disabled = false;
    joinRoomBtn.textContent = "Join Room";
  };
});

// 6. Copy Room ID Button
copyRoomBtn.addEventListener("click", () => {
  const text = currentRoomText.textContent;
  navigator.clipboard.writeText(text).then(() => {
    copyRoomBtn.textContent = "Copied!";
    setTimeout(() => { copyRoomBtn.textContent = "Copy ID"; }, 2000);
  });
});

// 7. Leave Room Button
leaveRoomBtn.addEventListener("click", () => {
  chrome.storage.local.set({ roomConfig: null }, () => {
    updateUI(null);
    showStatus("Left the room");
  });
});