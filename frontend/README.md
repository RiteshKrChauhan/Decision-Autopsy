# Decision Autopsy Frontend

React + Vite frontend for the Decision Autopsy flow.

## Folder Structure

frontend/
- index.html
- package.json
- vite.config.js
- styles/
  - main.css
- src/
  - main.jsx
  - App.jsx
  - config.js
  - state/
    - context.js
  - services/
    - apiClient.js
    - mockData.js
  - components/
    - Composer.jsx
    - FuturesGrid.jsx
    - MessageList.jsx
    - QuestionCard.jsx

## Run

From the frontend directory:

```bash
npm install
npm run dev
```

## Check and Build

```bash
npm run check
npm run build
npm run preview
```

## Demo Mode

Demo mode is enabled by default in src/config.js with useMockApi true.

Set useMockApi to false to call backend endpoints at http://localhost:3000.

## Implemented Flow

- Input decision and call parse
- Ask sequential questions with options, free text, and skip
- Confidence updates after each question
- Bias flash before futures
- Four futures tiles with single-tile expand behavior
- Fork point and suggestion chips
- Ongoing chat and rerun banner
- Loading indicator across API calls
- Input disabled while AI is responding
- New Autopsy reset
