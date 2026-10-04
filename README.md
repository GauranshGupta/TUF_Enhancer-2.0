# TUF Enhancer 2.0

A Chrome extension that helps learners practice the Striver A2Z DSA sheet more efficiently by adding direct GeeksforGeeks links and a live study-room feature.

This project combines a browser extension, a WebSocket backend, and a scraped problem dataset to make DSA preparation smoother and more collaborative.

---

## Overview

TUF Enhancer 2.0 is built for users who study on TakeUForward’s Striver A2Z sheet and want to quickly jump to the corresponding GFG practice problem without manually searching.

The browser extension checks each problem on the sheet, matches it with a stored dataset, and injects a GFG button into the row. It also supports a real-time study room where users can join the same room, share their current question, and see who else is online.

---

## Why this project exists

A typical DSA workflow looks like this:
- open a problem on TakeUForward
- search for the same problem on GeeksforGeeks
- copy the URL and solve it
- repeat for the rest of the sheet

This extension removes the repetitive searching step and helps keep momentum while studying.

---

## Features

### 1. Direct GFG navigation
The extension finds the current problem on the TakeUForward sheet and injects a button that opens the matching GeeksforGeeks problem page.

### 2. Smart lookup using mapped problem data
The extension uses a problem-to-GFG mapping dataset built from scraped sheet data.

This mapping is created from:
- the question title
- the TUF slug
- the generated GFG practice URL

### 3. Study room collaboration
Users can enter:
- a username
- a room ID

Once saved, the extension connects to a WebSocket backend and joins the room. Members in the same room can see each other’s active question and online status.

### 4. Toggleable extension state
The popup lets the user start or stop the extension. The state is stored locally in Chrome using `chrome.storage.local`.

### 5. Data pipeline for refreshing mappings
The project includes Python scripts to scrape the original sheet and generate or refresh the final problem mapping dataset.

---

## Tech Stack

### Frontend / Browser Extension
- JavaScript
- Chrome Manifest V3
- Chrome extension APIs (`chrome.storage`, `chrome.runtime`)
- DOM manipulation for injecting UI into TakeUForward pages

### Real-time backend
- Node.js
- `ws` WebSocket library
- Express-like lightweight server pattern (without Express in this repo)
- In-memory room tracking

### Data processing
- Python
- `requests`
- `BeautifulSoup`
- JSON dataset generation
- GFG matching/search logic

### Data source
- GitHub raw Gist for the final problem mapping file
- Local `final_sheet.json` and `raw_sheet.json` files

---

## Architecture Diagram

```mermaid
flowchart LR
    User[User on TakeUForward] --> Extension[Chrome Extension]
    Extension --> Content[content.js]
    Content --> DOM[Injected GFG Buttons]
    Content --> Storage[chrome.storage.local]
    Content --> Socket[WebSocket Client]
    Socket --> Backend[Node.js WebSocket Server]
    Content --> Gist[GitHub Raw Gist Dataset]
    Gist --> Map[Problem -> GFG mapping]
    Backend --> Room[Room Members / Current Problem]

    subgraph Browser
      Content
      DOM
      Storage
    end

    subgraph Backend
      Socket
      Backend
      Room
    end
```

---

## How it works

### 1. Page detection
When the user visits a TakeUForward page, the content script loads and checks whether the extension is enabled.

### 2. Database lookup
The extension loads a large map of problem titles and slugs to their matching GFG practice URLs.

### 3. Button injection
For each practice problem row, it checks whether a GFG entry exists and then injects a small button into the action area.

### 4. Current problem broadcasting
When the user clicks a row, the extension sends the selected problem name to the WebSocket server.

### 5. Live room updates
The backend stores that username and current problem in memory and broadcasts the updated state to all members in the same room.

---

## Project Structure

```text
extensions/
├── striver_a2z/
│   ├── assets/
│   │   ├── gfg.svg
│   │   ├── tuf.png
│   │   └── tuf.svg
│   ├── data/
│   │   ├── final_sheet.json
│   │   └── raw_sheet.json
│   ├── data_scrapping/
│   │   ├── gfg_matcher.py
│   │   └── scraper.py
│   ├── background.js
│   ├── content.css
│   ├── content.js
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── README.md
│
└── striver_databackend/
    ├── .gitignore
    ├── package.json
    └── server.js
```

---

## File responsibilities

### `manifest.json`
Defines the extension metadata, permissions, icon, popup page, background service worker, and content script match pattern.

### `background.js`
Handles GFG fetch calls from the content script and returns the best matching practice URL.

### `content.js`
Main behavior file:
- loads the dataset
- finds practice rows in the DOM
- injects GFG button links
- connects to WebSocket for live room sync
- broadcasts current questions to others in the room

### `popup.html` and `popup.js`
Used for the extension popup UI.

The popup allows the user to:
- start or stop the extension
- choose a username
- input a room ID
- save room settings

### `server.js`
This is the WebSocket backend that powers the live room feature. It stores rooms in memory and sends presence updates to all connected clients.

### `data_scrapping/`
Contains Python code to scrape TakeUForward content and map each question to a GFG problem URL.

---

## Setup Instructions

### 1. Install the backend dependencies
From the backend folder:

```bash
cd ../striver_databackend
npm install
```

### 2. Start the backend server
```bash
npm start
```

This starts the WebSocket server on the default port `3000` or on a cloud-provided port if deployed.

### 3. Load the Chrome extension
1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select the `striver_a2z` folder.

### 4. Use the extension
1. Open the TakeUForward sheet.
2. Launch the popup.
3. Enable the extension.
4. Add your username and room ID.
5. Open the sheet and use the injected GFG buttons.

---

## WebSocket Feature Explanation

The real-time room is managed by a standalone backend service in the sibling folder `striver_databackend`.

When a user joins a room:
- a `JOIN_ROOM` message is sent
- the backend creates or finds the room
- the user is added to the room with their current problem

When a user clicks a problem:
- the extension sends `SET_PROBLEM`
- the backend updates the user’s state
- all users in that room receive a `ROOM_PRESENCE` notification

This keeps everyone synchronized in real time and makes the study room feel live and interactive.

---

## Data Generation Pipeline

The project also contains a small scraping system to rebuild the dataset.

### `scraper.py`
Responsible for extracting problem metadata from TakeUForward pages.

### `gfg_matcher.py`
Searches and matches each problem to the closest GeeksforGeeks problem URL and writes the final JSON dataset.

The output is stored in `data/final_sheet.json`, which the browser extension reads when it loads the page.

---

## Limitations

- The extension is designed specifically for TakeUForward pages under the `takeuforward.org` domain.
- Matching depends on the quality of the dataset.
- The WebSocket room relies on the backend being running.
- The GFG link mapping may need periodic refreshes as the problem list changes.

---

## Future Improvements

Possible improvements include:
- fuzzy matching for problem names
- private room codes
- bookmark/progress tracking
- local dataset fallback if the remote gist is unavailable
- better room UI/UX with member avatars and problem status cards

---

## Summary

TUF Enhancer 2.0 is a productivity-focused browser extension for DSA learners. It reduces time spent searching for equivalent GeeksforGeeks questions and adds a live collaborative study-room experience.

It blends three core ideas together:
- faster problem navigation
- smarter data mapping
- real-time study collaboration

This makes the learning flow more focused, more efficient, and less repetitive.
