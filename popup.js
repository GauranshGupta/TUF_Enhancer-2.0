const toggleBtn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const usernameInput = document.getElementById("usernameInput");
const roomInput = document.getElementById("roomInput");
const saveRoomBtn = document.getElementById("saveRoomBtn");
const roomStatusText = document.getElementById("roomStatusText");

function renderUI(isActive, roomConfig) {
  if (isActive) {
    toggleBtn.textContent = "Click to Stop";
    toggleBtn.className = "btn btn-stop";
    statusText.textContent = "Status: ACTIVE (Always ON)";
    statusText.style.color = "#4ade80";
  } else {
    toggleBtn.textContent = "Click to Start";
    toggleBtn.className = "btn btn-start";
    statusText.textContent = "Status: OFF";
    statusText.style.color = "#a1a1aa";
  }

  if (roomConfig && roomConfig.roomId && roomConfig.username) {
    if (usernameInput) usernameInput.value = roomConfig.username;
    if (roomInput) roomInput.value = roomConfig.roomId;
    if (roomStatusText) {
      roomStatusText.textContent = `Joined Room: ${roomConfig.roomId}`;
      roomStatusText.style.color = "#60a5fa";
    }
  }
}

// Load persisted state (default to false if first run)
chrome.storage.local.get({ isActive: false, roomConfig: null }, (data) => {
  renderUI(data.isActive, data.roomConfig);
});

// Toggle and save to local storage
toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get({ isActive: false, roomConfig: null }, (data) => {
    const nextState = !data.isActive;
    chrome.storage.local.set({ isActive: nextState }, () => {
      renderUI(nextState, data.roomConfig);
    });
  });
});

// Save Room credentials
if (saveRoomBtn) {
  saveRoomBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const roomId = roomInput.value.trim().toLowerCase();

    if (!username || !roomId) {
      roomStatusText.textContent = "Please fill in both fields!";
      roomStatusText.style.color = "#ef4444";
      return;
    }

    const roomConfig = { username, roomId };
    chrome.storage.local.get({ isActive: false }, (data) => {
      chrome.storage.local.set({ roomConfig }, () => {
        renderUI(data.isActive, roomConfig);
      });
    });
  });
}