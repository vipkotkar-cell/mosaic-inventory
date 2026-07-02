# Inventory Impact Logic — Working Reference

**Owner:** Vipul Kotkar | **Last updated:** 1 July 2026

## 1. What Files Are Being Compared

Every day, the system pulls the **Shelfwise CSV export** attached to the email
`Export Job Complete - Shelfwise Inventory`. This CSV is a full point-in-time
snapshot of every batch, at every facility, across all inventory states — it
is not a delta/diff file, just a full dump of "what does inventory look like
right now."

Two such snapshots are compared on every run:

- **Yesterday's snapshot** — the pre-8 AM export from the previous day
- **Today's snapshot** — the pre-8 AM export from today

Only exports received **before 8:00 AM IST** are accepted (target: 7:45 AM
snapshot). Anything received at/after 8 AM is ignored for that day — this
avoids picking up a partial or re-run export.

**Shelfwise CSV columns used:**
`SKU Code | Item Description | Batch Code | Facility | Inventory Type | Batch Status | Quantity | Quantity Blocked | Quantity Not Found | Quantity Damaged | Expiry | Manufacturing`

## 2. What Fields/Combinations Are Compared

Both snapshots are collapsed into a lookup map keyed on:

```
key = SKU + "||" + Batch Code + "||" + Facility
```

For every key, we track two other fields per snapshot:

- **Inventory Type** — one of `GOOD_INVENTORY`, `BAD_INVENTORY`, `QC_REJECTED`
- **Batch Status** — one of `Active`, `About_to_expire`, `Expired`, `Recalled`

The core comparison is: **for the same SKU+Batch+Facility, what was
Inventory Type / Batch Status yesterday (`stateFrom`, `invFrom`) vs. today
(`stateTo`, `invTo`)?** Every event type is defined as a specific
before→after combination of these two fields:

| Event Code | Condition Compared | Meaning |
|---|---|---|
| `g2b` | invFrom=GOOD + stateFrom=Active → invTo=BAD | Good stock turned Bad |
| `g2q` | invFrom=GOOD + stateFrom=Active → invTo=QC_REJECTED | Good stock QC-rejected |
| `g2rc` | invFrom=GOOD → stateTo=Recalled | Good stock recalled |
| `a2ne` | invFrom=GOOD + stateFrom=Active → stateTo=About_to_expire | Batch entering near-expiry window |
| `ne2e` | invFrom=GOOD + stateFrom=About_to_expire → stateTo=Expired | Already-flagged batch expires (not re-counted) |
| `a2e` | invFrom=GOOD + stateFrom=Active → stateTo=Expired | Batch expired directly, skipping near-expiry |
| `a2rc` | stateFrom≠Recalled → stateTo=Recalled | Direct recall (any inventory type) |
| `newBad` | Key exists today but not yesterday, invTo=BAD | New GRN received already bad |
| `newQC` | Key exists today but not yesterday, invTo=QC_REJECTED | New GRN received already QC-rejected |
| `b2g` / `q2g` (Recovery) | invFrom=BAD/QC → invTo=GOOD | Bad/QC stock brought back to Good |
| `rc2a` (Recovery) | stateFrom=Recalled → stateTo=Active + invTo=GOOD | Recalled stock reactivated |

Quantity for each event = `min(yesterday's qty, today's qty)` for existing
keys, or today's qty for a brand-new key (GRN events).

**Guard rule:** `g2b`/`g2q` only fire when yesterday's state was exactly
`GOOD_INVENTORY` + `Active`. This prevents double-counting a batch that was
already flagged `About_to_expire` (a2ne) on a prior day and then later turns
Bad — that batch's loss was already captured at the a2ne stage.

**Guard rule:** `ne2e` (Near-Expiry → Expired) is detected but deliberately
**not** logged as a new loss event — it was already counted when the batch
first entered `About_to_expire` at the `a2ne` stage.

## 3. Impact Classification — The Actual Decision Logic

Financial Loss / Expiry Risk / Recovery are not raw event types — they are a
**classification** applied after an event is detected, based purely on the
state the batch was in *yesterday* (`stateFrom`, `invFrom`) and whether the
movement was positive (`type`):

```
getImpactClass_(stateFrom, type, invFrom):
  1. if type == "POS"                              → Recovery
  2. if invFrom in [BAD_INVENTORY, QC_REJECTED]     → Expiry Risk
  3. if stateFrom == "Active" (or blank/new GRN)    → Financial Loss
  4. if stateFrom in [About_to_expire, Recalled]    → Expiry Risk
  5. else (fallback, shouldn't occur)               → Financial Loss
```

Checks run in this exact order — Recovery is decided first, then "already
compromised" (Expiry Risk) overrides everything else, and only what's left
(healthy stock moving to any negative state) becomes Financial Loss. This
means classification depends only on **yesterday's** state — it does not
matter what the batch becomes today.

### 3a. Financial Loss — batch was healthy (`Active`) yesterday

| Inv. From | Status From | Inv. To | Status To | Event Code | Why |
|---|---|---|---|---|---|
| GOOD_INVENTORY | Active | BAD_INVENTORY | any | `g2b` | Healthy stock turned Bad |
| GOOD_INVENTORY | Active | QC_REJECTED | any | `g2q` | Healthy stock QC-rejected |
| GOOD_INVENTORY | Active | GOOD_INVENTORY | Recalled | `g2rc` | Healthy stock recalled |
| GOOD_INVENTORY | Active | GOOD_INVENTORY | About_to_expire | `a2ne` | First sign of expiry risk on healthy stock — counted **now**, not later |
| GOOD_INVENTORY | Active | GOOD_INVENTORY | Expired | `a2e` | Healthy stock expired directly, skipping the warning stage |
| *(new SKU/Batch/Facility)* | blank | BAD_INVENTORY | any | `newBad` | New GRN received already Bad |
| *(new SKU/Batch/Facility)* | blank | QC_REJECTED | any | `newQC` | New GRN received already QC-rejected |

**Rule:** `stateFrom = Active` (or blank, for a brand-new GRN) → Financial
Loss, **regardless of what it becomes.** This captures the loss exactly
once, at the moment healthy stock first shows *any* negative signal. This is
the only category that flows into `NI_DailyTop5` (COGSValue > ₹10,000
threshold), because it's the number that represents fresh, actionable loss.

### 3b. Expiry Risk — batch was already compromised yesterday

| Inv. From | Status From | Inv. To | Status To | Event Code | Why |
|---|---|---|---|---|---|
| BAD_INVENTORY | any | any | any | *(any further change)* | Already Bad — loss was counted when it first left Active |
| QC_REJECTED | any | any | any | *(any further change)* | Already QC-Rejected — loss already counted |
| GOOD_INVENTORY | About_to_expire | GOOD_INVENTORY | Expired | `ne2e` | *Not even logged* — already counted at the `a2ne` stage |
| GOOD_INVENTORY | About_to_expire | BAD/QC | any | *(implicit)* | Already flagged at-risk — no re-count |
| any (InvFrom ≠ GOOD) | Recalled | any (not reactivated) | any | `a2rc` | Already compromised, still moving |

**Rule:** `invFrom = BAD_INVENTORY / QC_REJECTED` **or** `stateFrom =
About_to_expire / Recalled` → Expiry Risk. This check runs *before* the
Active check, so "already-bad" always wins even if some other field looks
like a fresh loss. Excluded entirely from the Financial Loss total and from
`NI_DailyTop5` — to avoid double-counting the same underlying loss twice.

### 3c. Recovery — stock moving back to Good/Active

| Inv. From | Status From | Inv. To | Status To | Event Code | Why |
|---|---|---|---|---|---|
| BAD_INVENTORY | any | GOOD_INVENTORY | any | `b2g` | Bad stock remediated |
| QC_REJECTED | any | GOOD_INVENTORY | any | `q2g` | QC-rejected stock remediated |
| any | Recalled | GOOD_INVENTORY | Active | `rc2a` | Recalled stock reactivated |

**Rule:** `type = POS` → Recovery, checked **first**, before Financial Loss
/ Expiry Risk logic even runs. Detected two ways: (a) same
SKU+Batch+Facility key changing state day-over-day, or (b) at the facility
level, a net decrease in Bad/QC quantity paired with a net increase in Good
quantity (covers cases where individual batch identity can't be matched
cleanly).

## 4. Net Impact Formula

```
Net Impact = Total Financial Loss (COGS value) − Total Recovery (COGS value)
```

Applied at the row level (per event), and rolled up per facility, per
business type (Self Warehouse / 3PL B2C / 3PL B2B / Dark Store / FBA), and
per time window (WTD / MTD / YTD). Expiry Risk is tracked separately and is
**not** part of this formula.

## 5. Where the Numbers Land

Every detected event (Financial Loss, Expiry Risk, or Recovery) is written
as one row to `NI_Events` (daily working sheet) and `NI_Events_Year`
(permanent cross-month log). WTD/MTD/YTD windows and the daily email both
read from `NI_Events_Year` so the numbers are correct on any day, regardless
of which month's spreadsheet is currently active.
