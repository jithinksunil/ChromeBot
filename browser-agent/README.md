# ChromeBot Browser Agent

Agent-first Chrome extension foundation for autonomous job applications.

## Setup
1. `cd browser-agent`
2. `npm install`
3. Set API key in shell:
   - macOS/Linux: `export OPENAI_API_KEY=...`
   - Windows PowerShell: `$env:OPENAI_API_KEY=...`

## Quality Scripts
- `npm run typecheck` → strict TypeScript checks.
- `npm run lint` → ESLint with TypeScript rules.
- `npm run format` → Prettier check.
- `npm run build` → compile TypeScript to `dist/`.
- `npm run check` → runs all checks above in sequence.

## API Key Behavior
- Primary source: `OPENAI_API_KEY` (environment variable).
- Optional override: popup field `OpenAI API Key`.
- If key is unavailable or API request fails, system falls back to mock decision logic.

## Load Extension
1. Compile TypeScript (`npm run build`) to generate JS artifacts.
2. Load `browser-agent/extension` as unpacked extension, or use your bundling/copy strategy.

## Notes
- This repository focuses on architecture and typed modules.
- Real-world deployments should add secure key handling and backend token exchange.
