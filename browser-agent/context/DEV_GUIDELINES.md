# Development Guidelines for Human and AI Contributors

## Mandatory Quality Gate

All changes must pass the command below before handoff:

```bash
npm run check
```

`check` is composed of:

1. `npm run typecheck` → runs `tsc --noEmit` to validate strict typing.
2. `npm run lint` → runs ESLint with TypeScript rules.
3. `npm run format` → runs Prettier in check mode.
4. `npm run build` → compiles TypeScript to `dist/`.

## Coding Rules

- Use TypeScript only; avoid JavaScript source files for app logic.
- Keep strict type safety (`strict`, `noImplicitAny`, no `any`).
- Do not bypass type checks with `// @ts-ignore` unless explicitly
  documented and justified.
- Keep modules small and single-purpose.
- Prefer explicit interfaces for runtime contracts.
- Separate concerns by layer:
  - `extension/`: browser entry points and messaging.
  - `agent/`: observe-think-act workflow and execution.
  - `utils/`: reusable parsing/validation/LLM adapters.
  - `config/`: constants and schema.

## Linting and Formatting

- ESLint enforces no-unused-vars and no-explicit-any.
- Prefix intentionally unused function arguments with `_`.
- Prettier formatting is mandatory and should not be hand-tuned against
  config.

## Agent-First Modification Guidance

For AI agents editing this codebase:

1. Read relevant context docs first (`ARCHITECTURE.md`, `AGENT_RULES.md`,
   `JOB_RULES.md`).
2. Preserve the Observe → Think → Act loop semantics.
3. Keep OpenAI integration replaceable and fallback-safe.
4. Add/update types before implementing runtime behavior.
5. Update context docs when behavior or assumptions change.
6. Keep new features behind clear module boundaries to support future
   website adapters.

## Review Checklist

Before commit:

- [ ] Runtime behavior follows safety constraints.
- [ ] Types/interfaces updated for all new data flow.
- [ ] Logs remain structured and machine-readable.
- [ ] `npm run check` passes locally.
- [ ] Documentation/context updated for architectural impact.
