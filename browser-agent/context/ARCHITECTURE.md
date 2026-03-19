# Architecture

## Layers
1. **Instruction Layer**: Popup UI captures role/location/experience/skills/max count.
2. **Context Layer**: Markdown guides + runtime JSON parsed and validated.
3. **Decision Layer**: Planner calls LLM adapter. Fallback mock keeps reliability.
4. **Execution Layer**: Actions are translated into `chrome.scripting.executeScript` calls.
5. **Memory + Logging Layer**: Structured logs persist in `chrome.storage.local`.

## Agent Loop
1. Observe page and extract visible job cards.
2. Think via LLM/mock decision (`APPLY` or `SKIP`).
3. Act via click/type/scroll/tab primitives.
4. Repeat until stop, max applications, or failure threshold.

## Data Flow
Popup form → `parser.ts` → `validator.ts` → background start message → agent loop → planner/executor → logger.
