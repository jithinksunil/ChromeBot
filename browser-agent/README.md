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
2. Copies extension static assets (`manifest.json`, `popup.html`,
   `styles.css`, and other non-TS files under `extension/`) into
   `dist/extension/`.

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


### "Could not load icon icon16.png"

This happens when `manifest.json` references icon files that are not
present in the loaded folder. Current manifest no longer requires icon
files, so rebuild and reload:

```bash
npm run build
```

Then remove the old extension from `chrome://extensions` and load
`dist/extension` again.

## API Key Behavior

- Primary source: `OPENAI_API_KEY` environment variable.
- Optional override: popup `OpenAI API Key` field.
- If key is missing or API request fails, fallback mock decision logic
  is used.

## Notes

- This repository focuses on architecture and typed modules.
- Real-world deployments should add secure key handling and backend
  token exchange.
