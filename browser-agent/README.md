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

> Note: this repo emits TypeScript to `dist/`. For production extension
> packaging, copy/resolve built script outputs so `extension/manifest.json`
> points to actual generated JS files.

## 6) Load Extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the `browser-agent/extension` folder (or your bundled output
   folder if you wire a bundler).

## 7) Use the Agent

1. Open a Naukri listings page in a tab.
2. Click the extension icon to open popup.
3. Fill role, locations, experience range (`2-5` style), skills, max
   applications.
4. (Optional) Paste OpenAI key in the popup override field.
5. Click **Start**.
6. Click **Stop** any time to trigger kill switch.

## API Key Behavior

- Primary source: `OPENAI_API_KEY` environment variable.
- Optional override: popup `OpenAI API Key` field.
- If key is missing or API request fails, fallback mock decision logic
  is used.

## Notes

- This repository focuses on architecture and typed modules.
- Real-world deployments should add secure key handling and backend
  token exchange.
