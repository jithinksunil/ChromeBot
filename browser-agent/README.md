# ChromeBot Browser Agent

Agent-first Chrome extension foundation for autonomous job applications.

## 1) Prerequisites

- Node.js 18+
- npm 9+
- Google Chrome (latest stable)

## 2) Setup Project Locally

```bash
cd browser-agent
npm install
```

## 3) Add Your OpenAI API Key

You have two ways to provide the key:

### Option A (recommended): environment variable

Set `OPENAI_API_KEY` in your shell before running scripts.

- macOS/Linux:

  ```bash
  export OPENAI_API_KEY="sk-..."
  ```

- Windows PowerShell:

  ```powershell
  $env:OPENAI_API_KEY = "sk-..."
  ```

### Option B: popup override key

When the extension popup opens, paste your key in
**OpenAI API Key (optional override)**. This value is passed for the
current run.

## 4) Run Quality Checks

```bash
npm run check
```

This runs:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run build`

## 5) Build for Chrome

```bash
npm run build
```

This now does two things:

1. Compiles TypeScript to `dist/`.
2. Creates a self-contained Chrome extension bundle in `dist/extension/`
   by copying the static assets plus the compiled runtime modules the
   service worker and popup import.

## 6) Load Extension in Chrome (important)

After `npm run build`, load **`browser-agent/dist/extension`** in Chrome.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `browser-agent/dist/extension`.

## 7) Use the Agent

1. Open a Naukri listings page in a tab.
2. Click the extension icon to open popup.
3. Fill role, locations, experience range (`2-5` style), skills, and max
   applications.
4. (Optional) Paste OpenAI key in the popup override field.
5. Click **Start**.
6. Click **Stop** any time to trigger kill switch.

## Troubleshooting

### "Manifest file is missing or unreadable"

If Chrome shows this while loading `dist/extension`, run:

```bash
npm run build
```

and confirm these files exist:

- `dist/extension/manifest.json`
- `dist/extension/popup.html`
- `dist/extension/styles.css`
- `dist/extension/background.js`
- `dist/extension/agent/agent.js`
- `dist/extension/utils/parser.js`

### "Could not load icon icon16.png"

This happens when `manifest.json` references icon files that are not
present in the loaded folder. Current manifest no longer requires icon
files, so rebuild and reload:

```bash
npm run build
```

Then remove the old extension from `chrome://extensions` and load
`dist/extension` again.

### Service worker shows as "inactive" / extension has runtime errors

If the extension card shows **Errors** and service worker stays inactive,
rebuild and reload unpacked extension:

```bash
npm run build
```

Then in `chrome://extensions` click **Reload** for ChromeBot.

This project now emits browser-compatible ES module imports (with `.js`
extensions) and bundles the imported runtime modules inside
`dist/extension`, so the service worker does not try to load files from
outside the unpacked extension root.

## API Key Behavior

- Primary source: `OPENAI_API_KEY` environment variable.
- Optional override: popup `OpenAI API Key` field.
- If key is missing or API request fails, fallback mock decision logic
  is used.

## Notes

- This repository focuses on architecture and typed modules.
- Real-world deployments should add secure key handling and backend
  token exchange.

## Agent Behavior

The agent now performs a broader observe → think → act loop:

- Reads the current Naukri page to understand whether it is on a job
  listings page, a job detail page, or a search/home page.
- If it is not yet on listings, it will try to use visible jobs/search
  navigation or fill the visible search form with the popup role and
  location values.
- On listings pages it inspects all visible job cards, opens unseen job
  details, looks for apply/easy-apply controls, and returns to the
  listings page after each attempt.
- The default mock planner now biases toward role/location/skill matches
  that also show quick-apply signals so the extension actually takes
  actions even without an OpenAI key.
