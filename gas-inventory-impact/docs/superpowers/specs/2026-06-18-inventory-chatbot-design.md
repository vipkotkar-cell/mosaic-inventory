# Inventory Data Chatbot — Design Spec
**Date:** 2026-06-18  
**Feature:** Floating in-app chatbot that answers natural language questions about current month inventory data, powered by Claude via GAS proxy.

---

## Overview

A floating chat button (bottom-right, every page) opens a slide-up panel where ops/management users ask plain-English questions about the current month's inventory events. GAS routes the question, fetches a filtered data slice from NI_Events, calls the Claude API, and returns a concise answer.

---

## UI

### Floating Button
- Fixed position: bottom-right corner, `z-index` above all content
- Robot emoji icon (🤖) or similar, 48×48px pill button, `background: var(--tl)`
- Always visible on every page of the dashboard

### Chat Panel
- Slides up above the button when clicked; closes on X or clicking outside
- Dimensions: 380px wide, 480px tall, `border-radius: 16px`, card shadow
- **Header:** "Ask Inventory Data" title + close (×) button
- **Message area:** scrollable, user bubbles (right, teal), Claude bubbles (left, grey)
- **Starter chips:** shown only when conversation is empty — 3 suggestion pills:
  - "Top 5 products by COGS loss this month"
  - "Which facility had most recalls?"
  - "Brand-wise Financial Loss breakdown"
- **Input row:** text input + Send button at bottom
- **Loading state:** animated dots in a Claude bubble while GAS is processing
- **Error state:** "Couldn't reach the data service — try again" shown as a Claude bubble

---

## Data Flow

```
User types question
      ↓
Dashboard POSTs to GAS:
  { action: 'chatQuery', question: '...' }
      ↓
GAS routeQuery_(question)
  → keyword scan → filter spec
      ↓
GAS fetchQueryData_(filterSpec)
  → reads NI_Events current month
  → applies filters
  → returns compact row array (10 cols)
      ↓
GAS callClaude_(dataJson, question)
  → UrlFetchApp → Claude API
  → returns answer string
      ↓
Dashboard renders answer bubble
```

---

## Keyword Routing (`routeQuery_`)

Scans the question string (lowercased) for known tokens and builds a filter spec. Matching is substring/includes — no NLP required.

| Keyword pattern | Filter applied |
|---|---|
| Brand names: "be bodywise", "man matters", "little joys", "root labs", "own" | `brand = <name>` |
| BizType: "3pl b2c", "3pl b2b", "self warehouse", "dark store", "fba", "marketplace", "m2b" | `bizType = <type>` |
| Event: "recall", "recalled" | `direction in [g2rc, a2rc]` |
| Event: "good to bad", "g2b" | `direction = g2b` |
| Event: "qc", "qc rejected" | `direction = g2q` |
| Event: "grn", "direct bad", "new bad" | `direction in [newBad, newQC]` |
| Event: "expiry", "near expiry" | `direction in [a2ne, a2e]` |
| Event: "recovery", "recovered" | `type = POS` |
| Facility name substring match | `facility contains <keyword>` |
| No keywords matched | Send pre-aggregated summary (brand totals + event type totals, no raw rows) |

**Fallback:** if no keywords match, GAS computes a compact summary object (brand → {FL COGS, count}, eventType → {COGS, count}) instead of sending raw rows. This covers general questions like "how is June looking?" cheaply.

---

## Data Fetched (`fetchQueryData_`)

Source: `NI_Events` sheet, current month only (same `curMonthFilter` logic already in `doGet`).

Columns returned (10 of 21 — minimises token cost):
`Date | Brand | SKU | Name | Facility | BizType | Direction | Event | Impact Class | Qty | COGSValue`

Row cap: **500 rows max** sent to Claude. If filtered result exceeds 500, sort by COGSValue descending and take top 500. This prevents oversized payloads on unfiltered queries.

---

## Claude API Call (`callClaude_`)

**Model:** `claude-haiku-4-5-20251001` — fastest, cheapest, sufficient for tabular Q&A.

**API key:** read from `PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY')`. If missing, return `{error: 'api_key_not_configured'}`.

**System prompt:**
```
You are an inventory quality analyst for Mosaic Wellness, an Indian health & wellness brand.
You are given a JSON array of inventory events for the current month and must answer the user's question concisely.

Data schema (each row):
- Date: event date (dd MMM yyyy)
- Brand: Be Bodywise | Man Matters | Little Joys | Root Labs | OWN
- SKU: product code
- Name: product name
- Facility: warehouse/3PL name
- BizType: Self Warehouse | 3PL B2C | 3PL B2B | Dark Store | FBA / Marketplace
- Direction: g2b=Good→Bad, g2q=Good→QC, g2rc=Good→Recalled, a2ne=Active→NearExpiry, a2rc=Active→Recalled, newBad/newQC=Direct GRN, POS=Recovery
- Event: human-readable event label
- Impact Class: Financial Loss | Expiry Risk | Recovery
- Qty: units affected
- COGSValue: cost of goods affected in INR (₹)

Rules:
- Answer in 2–4 sentences. Be specific — include numbers, brand names, facility names.
- Use ₹ symbol and format large numbers with commas (e.g. ₹1,23,456).
- If the data provided is insufficient to answer, say so clearly.
- Do not make up data not present in the provided rows.
```

**Request payload:**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 300,
  "system": "<system prompt above>",
  "messages": [
    {
      "role": "user",
      "content": "Data:\n<JSON rows>\n\nQuestion: <user question>"
    }
  ]
}
```

**Timeout:** `UrlFetchApp` call with `muteHttpExceptions: true`, 30s timeout. On error return `{error: 'claude_api_error', detail: <message>}`.

---

## GAS Changes

### `doPost` — new `chatQuery` action

```javascript
if (data.action === 'chatQuery') {
  const result = handleChatQuery_(data.question || '');
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### New functions in Code.gs

| Function | Signature | Purpose |
|---|---|---|
| `handleChatQuery_(question)` | `string → {answer} or {error}` | Orchestrates route → fetch → call |
| `routeQuery_(question)` | `string → filterSpec object` | Keyword scan, returns filters |
| `fetchQueryData_(filterSpec)` | `filterSpec → rowArray` | Reads + filters NI_Events current month |
| `callClaude_(rowsJson, question)` | `(string, string) → string` | UrlFetchApp to Claude API |

### Script Property required
Key: `CLAUDE_API_KEY`  
Set via: Apps Script editor → Project Settings → Script Properties → Add property.

---

## Frontend Changes (index.html)

### New HTML (before closing `</body>`)
- Floating button `#chat-fab`
- Chat panel `#chat-panel` (hidden by default)
- Message list `#chat-messages`
- Starter chips container `#chat-starters`
- Input `#chat-input` + Send button `#chat-send`

### New JS functions

| Function | Purpose |
|---|---|
| `toggleChat()` | Show/hide `#chat-panel` |
| `sendChatMessage()` | Read input, append user bubble, POST to GAS, render response |
| `appendBubble(text, role)` | Add a message bubble to `#chat-messages` |
| `showChatLoading()` / `hideChatLoading()` | Animated dots bubble |
| `renderStarterChips()` | Show 3 suggestion chips if conversation empty |

### PROXY usage
Reuses existing `PROXY` constant (GAS Web App URL). No new endpoint URL needed — same `fetch(PROXY, {method:'POST', ...})` pattern as `saveSysUserComment`.

---

## Out of Scope

- Conversation memory / multi-turn context — each question is independent
- Historical data beyond current month — future enhancement
- Voice input
- Exporting chat history
- Per-user access control (all dashboard users can use it)

---

## Implementation Order

1. Add `CLAUDE_API_KEY` to GAS Script Properties (manual, one-time)
2. Add `routeQuery_`, `fetchQueryData_`, `callClaude_`, `handleChatQuery_` to Code.gs
3. Add `chatQuery` action to `doPost`
4. Commit + paste into Apps Script + redeploy Web App
5. Add floating button + chat panel HTML to dashboard
6. Add `toggleChat`, `sendChatMessage`, `appendBubble`, loading helpers to dashboard JS
7. Sync root `index.html`
8. Commit + push
