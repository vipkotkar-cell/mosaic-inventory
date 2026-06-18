# System Remarks Tab — Design Spec
**Date:** 2026-06-18  
**Feature:** New "System Remarks" sub-tab in the Remarks page of the Mosaic Wellness Inventory Dashboard

---

## Overview

Add a third sub-tab to the Remarks page that surfaces only system-auto-triggered rows from NI_DailyTop5 and allows ops users to add a one-time manual observation against each. Once a user comment is saved it is locked — no further edits.

---

## Scope / Filter

Data source: `NI_DailyTop5`  
Filter criteria (all must match):
- Current month only
- `Impact Class = Financial Loss`
- `Remark` is exactly one of:
  - `"System Triggered - Expiry workflow"`
  - `"QC Triggered - Batch Recalled"`

These are the only two system-auto-filled remark values. All other rows are excluded.

---

## Tab Layout

**Tab strip** (Remarks page):
```
📊 Top 5 Today  |  📅 Monthly Summary  |  🤖 System Remarks
```

**Content:** Rows grouped by Date (descending), same column layout as Monthly Summary:

| Column | Source |
|---|---|
| Date | NI_DailyTop5.Date |
| Brand | NI_DailyTop5.Brand |
| SKU / Name | NI_DailyTop5.SKU + Name |
| Batch | NI_DailyTop5.Batch |
| Facility | NI_DailyTop5.Facility |
| Event | NI_DailyTop5.Event |
| COGS | NI_DailyTop5.COGSValue |
| System Remark | NI_DailyTop5.Remark (locked grey label) |
| User Comment | NI_DailyTop5.UserComment (see below) |

---

## User Interaction — One-Time Capture

**State A — No user comment yet (UserComment is blank):**
- System remark shown as a grey locked pill above
- Text input field + **Save** button shown below it
- User types observation, clicks Save
- Dashboard POSTs to GAS `?action=saveUserComment`
- On success: input replaced by read-only label; Save button disappears

**State B — User comment already saved (UserComment is non-blank):**
- System remark shown as grey locked pill
- User comment shown as locked read-only text below it
- No input, no button — permanently locked

---

## Data Schema Change

**NI_DailyTop5 — add column 19:**

| Col # | Heading | Type | Notes |
|---|---|---|---|
| 19 | `UserComment` | String | Blank by default. Written once by user via dashboard. Never overwritten by GAS automation. |

**Migration:** One-time GAS function `addUserCommentColumn()` appends the `UserComment` header to row 1 of NI_DailyTop5. Existing rows get a blank value. Safe to run once.

---

## GAS Changes

### New endpoint action: `saveUserComment`

**Method:** POST  
**Payload:**
```json
{ "action": "saveUserComment", "ehId": "2026-06-15|SKU|Batch|Facility|Event", "comment": "User's observation text" }
```

**Logic:**
1. Find row in NI_DailyTop5 where `EH_ID = ehId`
2. Check `UserComment` column — if already non-blank, return `{ error: "already_saved" }` (idempotency guard)
3. Write comment to `UserComment` column
4. Return `{ ok: true }`

**The existing `Remark` column is never touched by this endpoint.**

### New one-time function: `addUserCommentColumn()`

Appends `UserComment` header to NI_DailyTop5 row 1, column 19. Run once manually from Apps Script editor.

---

## Frontend Changes (index.html)

1. **Tab strip:** Add third tab `🤖 System Remarks` with `onclick="goRmkTab('sysrmk')"` and corresponding view div `rmk-view-sysrmk`.

2. **`goRmkTab` function:** Add `'sysrmk'` to the existing tab-switch logic.

3. **`renderSysRemarks()` function (new):** 
   - Filters `top5Data` (already loaded) by current month + Financial Loss + Remark in the two system values
   - Groups by date descending
   - Renders rows with locked system remark pill + either input+button or locked user comment
   - Called on tab switch and after data load

4. **`saveSysUserComment(ehId, inputEl)` function (new):**
   - Reads value from inputEl
   - POSTs to GAS `?action=saveUserComment`
   - On success: replaces input+button with locked label in the DOM
   - On `already_saved` error: shows "Already saved" message and locks

5. **Data source:** Uses `top5Data` already in memory (loaded at boot via `?action=top5`). The `UserComment` field needs to be included in the `?action=top5` GAS response — add it to the fields returned by `doGet`.

---

## GAS `doGet` change

The `?action=top5` response currently returns NI_DailyTop5 rows. Add `UserComment` (col 19) to the fields included in the JSON response so the dashboard can render locked vs. unlocked state correctly on load.

---

## Out of Scope

- No status tags (Accepted / Investigating / Resolved / Ignore) — removed per user decision
- No editing or appending after first save — one-time capture only
- No new sheet tab — UserComment lives in NI_DailyTop5 col 19
- Feature 2 (chatbot) is a separate spec

---

## Implementation Order

1. Run `addUserCommentColumn()` in GAS (schema migration)
2. Add `saveUserComment` action to GAS `doPost`
3. Update `doGet ?action=top5` to include `UserComment` field
4. Add System Remarks tab + `renderSysRemarks()` + `saveSysUserComment()` to dashboard
5. Sync root `index.html` with source `gas-inventory-impact/dashboard/index.html`
