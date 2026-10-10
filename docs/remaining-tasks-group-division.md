# LibraAI — Remaining Work Division (4 Members)

**Project:** LibraAI (Library Management + Agentic AI)  
**Framework:** Mastra  
**Status:** Library management complete; AI integration remaining  
**Date:** 2026-08-10

---

## Current status

| Layer | Status |
|--------|--------|
| Books / members / loans / staff / org multi-tenant | Done |
| Auth (JWT, bcrypt) | Done |
| Chat widget + ask bar UI | Done (placeholder / canned reply) |
| Real LLM / Mastra agents / IR / NLP | Not started |

---

## Target architecture (summary)

```
Librarian (web chat)
        │  JWT + HTTP
        ▼
Mastra Chat API  ──►  LibrarianAgent (orchestrator)
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        CatalogAgent   OpsAgent     Policy/Safety
        (search IR)    (loans/etc)  (guardrails)
              │             │
              ▼             ▼
         tools → existing Fastify routes + DB (org-scoped)
```

---

## Member 1 — Agent runtime & orchestration (Mastra lead)

**Owns:** Mastra setup, multi-agent design, chat API.

### Tasks

- [ ] Scaffold Mastra (inside API or `apps/agent`)
- [ ] Define agents: Librarian (orchestrator) + Catalog (+ Ops)
- [ ] Document agent communication flow (HTTP + Mastra tool/handoff)
- [ ] Implement `POST /ai/chat` (auth required)
- [ ] System prompts and routing between agents

### Deliverables

- Working agent runtime with ≥2 interacting agents
- Chat API endpoint
- Architecture + communication diagram for mid evaluation

### Viva focus

Agent roles, communication protocols, why the system is agentic.

### Report sections

System architecture, agent communication.

---

## Member 2 — Tools, IR & NLP (data / intelligence)

**Owns:** Grounding agents in real library data.

### Tasks

- [ ] Tools: `searchBooks`, `getBookAvailability`, `listOverdueLoans`, `getMember` (org-scoped)
- [ ] IR: catalog search + optional embeddings / `pgvector` for “books like…”
- [ ] NLP: entity extraction (title / ISBN / member), summarization for overdue / overview
- [ ] Evaluation set: sample queries + accuracy notes

### Deliverables

- Tool layer connected to existing LMS APIs/DB
- IR + NLP features demonstrated in chat
- Short evaluation results for the report

### Viva focus

Information retrieval pipeline, NLP techniques used.

### Report sections

Methodology, IR/NLP, evaluation results.

---

## Member 3 — Frontend + product UX

**Owns:** Replacing the placeholder chat with real AI.

### Tasks

- [ ] Connect `ChatProvider` / ChatWidget / Ask bar → `/ai/chat`
- [ ] Loading / streaming / error / empty-state UX
- [ ] Show sources or which tool was used (explainability in UI)
- [ ] Demo polish for mid evaluation and final video walkthroughs

### Deliverables

- End-to-end chat UX with real agent replies
- Screenshots / screen recordings for report and video

### Viva focus

User flow, how the UI talks to agents.

### Report sections

UI integration, screenshots, usability notes.

---

## Member 4 — Security, Responsible AI & commercialization

**Owns:** Safety layer + assignment business/ethics content.

### Tasks

- [ ] Security: JWT on AI routes, org isolation checks, input sanitization, rate limits
- [ ] Refuse dangerous actions (e.g. bulk delete) via policy / guardrails
- [ ] Responsible AI: transparency, PII handling, audit log of tool calls, refusal policy
- [ ] Commercialization: target users, pricing (Starter / Pro / Enterprise + AI), deployment ideas
- [ ] Lead Gen AI video script + Responsible AI slides for mid / final

### Deliverables

- Security + RAI checklist implemented and documented
- Pricing / market / deployment section for report
- Video script and RAI presentation content

### Viva focus

Security, ethics, commercialization and pricing.

### Report sections

Responsible AI, commercialization/pricing, security.

---

## Shared responsibilities (all members)

| Item | Ownership |
|------|-----------|
| Mid evaluation (Week 6) | M1 architecture, M2 data demo, M3 live UI, M4 RAI + pitch |
| Final report | Each owns their sections; one person merges |
| GitHub README | M1: Mastra/API key setup; M3: usage; all listed as contributors |
| Gen AI video | M4 script/edit; M3 screen capture; M1/M2 narrate agent/IR |
| Viva | Each defends their own lane in depth |

---

## Build order (to avoid blockers)

1. **M1** — Mastra + stub chat endpoint
2. **M2** — Tools on existing APIs (starts once endpoint/scaffold exists)
3. **M3** — UI bind as soon as stub replies work
4. **M4** — Security / RAI / commercialization in parallel from day 1; harden before final

---

## Demo scripts (group success criteria)

1. “Is *Atomic Habits* available?” → Catalog search → stock answer
2. “Who has overdue loans?” → Ops tools → summarized list
3. “Recommend something like Tolkien for a teen” → IR + LLM with catalog disclaimer
4. “Delete all members” → refused (Responsible AI / safety)

---

## Assignment requirement coverage

| Requirement | Covered by |
|-------------|------------|
| ≥2 interacting agents | M1 |
| LLM | M1 (+ M2 grounding) |
| NLP (NER, summarization) | M2 |
| Information Retrieval | M2 |
| Security | M4 (+ M1 auth on AI route) |
| Agent communication protocols | M1 |
| Responsible AI | M4 (+ M3 explainability UI) |
| Commercialization / pricing | M4 |
| Working UI demo | M3 |

---

## Name assignment

| Member | Name | Role |
|--------|------|------|
| M1 | _______________ | Mastra / agents |
| M2 | _______________ | Tools + IR + NLP |
| M3 | _______________ | Frontend AI UX |
| M4 | _______________ | Security + RAI + business |

---

## Notes

- Do not rebuild the LMS inside agents — reuse existing Fastify APIs and DB.
- Prefer read-only tools first; write actions only with confirmation.
- MCP is optional; HTTP + Mastra tool/agent handoff is enough for the protocol story.
