# Project: ChromeBot Browser Agent

ChromeBot is a Manifest V3 Chrome extension designed for autonomous and
policy-constrained job applications. The target first integration is
Naukri.

## Goals

- Convert user intent into structured runtime instructions.
- Execute Observe → Think → Act loops in browser context.
- Keep actions auditable using deterministic logs.
- Support upgrade path from mock LLM logic to OpenAI API.

## Non-Goals

- Solving multi-page long application forms in v1.
- Circumventing anti-bot protections.
- Applying without explicit user-provided constraints.
