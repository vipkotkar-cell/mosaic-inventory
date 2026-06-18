# System Remarks Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "System Remarks" sub-tab to the Remarks page showing Expiry/Recall auto-triggered rows from NI_DailyTop5, letting users add a one-time locked comment stored in a new `UserComment` column (col 19).

**Architecture:** GAS schema migration adds col 19 (`UserComment`) to NI_DailyTop5. A new `saveUserComment` POST action in `doPost` writes to it (with idempotency guard). The dashboard's `doGet` already returns all columns via `getDataRange()` so no doGet change is needed. Frontend adds a new sub-tab with `renderSysRemarks()` and `saveSysUserComment()`.

**Tech Stack:** Google Apps Script (GAS), vanilla JS, GitHub Pages static dashboard (index.html). Both `gas-inventory-impact/dashboard/index.html` (source) and root `index.html` (deployed) must be kept in sync.

---

## Files

| File | Change |
|---|---|
| `gas-inventory-impact/gas/Code.gs` | Add `addUserCommentColumn()`, `saveUserComment` action in `doPost`, update `getDailyTop5Sheet_` to HEADERS19, update `saveRemarkToDailyTop5_` to read 19 cols |
| `gas-inventory-impact/dashboard/index.html` | Add tab HTML, `goRmkTab` update, `renderSysRemarks()`, `saveSysUserComment()` |
| `index.html` (root) | Sync identical changes from source file |

---

## Task 1: GAS — Update HEADERS19 and schema migration guard

**Files:**
- Modify: `gas-inventory-impact/gas/Code.gs` (function `getDailyTop5Sheet_`, line ~1416)

The existing `getDailyTop5Sheet_` validates the sheet has exactly 18 columns and auto-migrates. We must update it to expect 19 columns so it doesn't wipe data after we add `UserComment`.

- [ ] **Step 1: Update HEADERS19 constant and schema guard in `getDailyTop5Sheet_`**

Find this block in Code.gs (around line 1419):
```javascript
const HEADERS18 = ['EH_ID','Date','Brand','SKU','Name','Batch','Facility','City','BizType', 'Event','Impact Class','Qty','COGSValue','Rank','Remark','Status','AssignedTo','RemarkDate'];
```
Replace it with:
```javascript
const HEADERS19 = ['EH_ID','Date','Brand','SKU','Name','Batch','Facility','City','BizType','Event','Impact Class','Qty','COGSValue','Rank','Remark','Status','AssignedTo','RemarkDate','UserComment'];
```

Then find:
```javascript
if (existingHeader.length !== 18 || existingHeader[10] !== 'Impact Class') {
Logger.log('NI_DailyTop5: schema is ' + existingHeader.length + '-col — clearing and rebuilding to 18-col.');
sh.clearContents();
sh.getRange(1,1,1,18).setValues([HEADERS18]);
sh.getRange(1,1,1,18).setFontWeight('bold');
```
Replace with:
```javascript
if (existingHeader.length !== 19 || existingHeader[10] !== 'Impact Class') {
  // Only rebuild if truly wrong schema — not just missing col 19
  if (existingHeader.length < 18 || existingHeader[10] !== 'Impact Class') {
    Logger.log('NI_DailyTop5: schema is ' + existingHeader.length + '-col — clearing and rebuilding to 19-col.');
    sh.clearContents();
    sh.getRange(1,1,1,19).setValues([HEADERS19]);
    sh.getRange(1,1,1,19).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  // If 18-col valid schema: migration will add col 19 via addUserCommentColumn()
```

- [ ] **Step 2: Update `saveRemarkToDailyTop5_` to read 19 cols**

Find (line ~1523):
```javascript
const data = sh.getRange(2, 1, sh.getLastRow()-1, 17).getValues();
```
Replace with:
```javascript
const data = sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).getValues();
```
This makes it read however many columns exist rather than a hardcoded count — safe for both 18 and 19 col schemas.

---

## Task 2: GAS — Add `addUserCommentColumn()` migration function

**Files:**
- Modify: `gas-inventory-impact/gas/Code.gs` (append after `getDailyTop5Sheet_`)

- [ ] **Step 1: Add the one-time migration function**

Paste immediately after the closing `}` of `getDailyTop5Sheet_`:

```javascript
// One-time migration: adds UserComment header to col 19 of NI_DailyTop5.
// Safe to run multiple times — skips if col 19 already exists.
function addUserCommentColumn() {
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var sh = ss.getSheetByName('NI_DailyTop5');
  if (!sh) { Logger.log('addUserCommentColumn: NI_DailyTop5 not found'); return; }
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, lastCol).getValue();
  if (String(header).trim() === 'UserComment') {
    Logger.log('addUserCommentColumn: already exists at col ' + lastCol);
    return;
  }
  var newCol = lastCol + 1;
  sh.getRange(1, newCol).setValue('UserComment').setFontWeight('bold');
  Logger.log('addUserCommentColumn: added UserComment at col ' + newCol);
}
```

- [ ] **Step 2: Verify it looks correct — do NOT run it yet (that comes after all GAS changes are deployed)**

---

## Task 3: GAS — Add `saveUserComment` action to `doPost`

**Files:**
- Modify: `gas-inventory-impact/gas/Code.gs` (function `doPost`, line ~1390)

- [ ] **Step 1: Add the `saveUserComment` case inside `doPost`**

Find this block in `doPost`:
```javascript
if (data.action==='archiveMonth') {
```

Insert the new case BEFORE it:
```javascript
if (data.action==='saveUserComment') {
  const result = saveUserComment_(data.ehId, data.comment || '');
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: Add the `saveUserComment_` helper function**

Paste immediately after the closing `}` of `saveRemarkToDailyTop5_`:

```javascript
// Writes user comment to col 19 (UserComment) for a given EH_ID.
// Idempotency guard: returns {error:'already_saved'} if UserComment is already non-blank.
function saveUserComment_(ehId, comment) {
  if (!ehId || !comment || !comment.trim()) return {error:'missing_fields'};
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var sh = ss.getSheetByName('NI_DailyTop5');
  if (!sh) return {error:'sheet_not_found'};
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return {error:'no_data'};
  var lastCol = sh.getLastColumn();
  var data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  // Find UserComment column index (0-based)
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h).trim(); });
  var ucIdx = headers.indexOf('UserComment');
  if (ucIdx < 0) return {error:'UserComment_column_missing'};
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === ehId) {
      var existing = String(data[i][ucIdx] || '').trim();
      if (existing) return {error:'already_saved'};
      sh.getRange(i + 2, ucIdx + 1).setValue(comment.trim());
      SpreadsheetApp.flush();
      Logger.log('saveUserComment_: saved for ' + ehId);
      return {ok:true};
    }
  }
  return {error:'ehid_not_found'};
}
```

---

## Task 4: Commit GAS changes and deploy

**Files:**
- `gas-inventory-impact/gas/Code.gs`

- [ ] **Step 1: Commit the GAS file**

```bash
git add gas-inventory-impact/gas/Code.gs
git commit -m "GAS: add UserComment col 19, saveUserComment endpoint, migration function"
```

- [ ] **Step 2: Copy Code.gs into Apps Script editor**

Open the Apps Script project for the June 2026 sheet (`186DE9ujZs7wuBwN1lseqCjI3kiIEM1DLEFLQbwjKzpM`). Paste the full updated Code.gs. Save.

- [ ] **Step 3: Run `addUserCommentColumn()` once**

In the Apps Script editor, select function `addUserCommentColumn` from the dropdown and click Run. Check Execution Log — expect: `addUserCommentColumn: added UserComment at col 19`.

- [ ] **Step 4: Re-deploy as Web App**

In Apps Script → Deploy → Manage Deployments → edit the existing deployment → bump version → Deploy. Copy the new Web App URL if it changed (check `PROXY` constant in index.html).

---

## Task 5: Frontend — Add System Remarks tab HTML

**Files:**
- Modify: `gas-inventory-impact/dashboard/index.html` (line ~459)

- [ ] **Step 1: Add the third tab button and view div**

Find:
```html
      <div class="sub-tab"    onclick="goRmkTab('monthly')" id="rmk-tab-monthly">&#128197; Monthly Summary</div>
    </div>

    <div id="rmk-view-top5"><div id="rmk-top5-wrap"></div></div>
    <div id="rmk-view-monthly" style="display:none"><div id="rmk-monthly-wrap"></div></div>
```

Replace with:
```html
      <div class="sub-tab"    onclick="goRmkTab('monthly')" id="rmk-tab-monthly">&#128197; Monthly Summary</div>
      <div class="sub-tab"    onclick="goRmkTab('sysrmk')"  id="rmk-tab-sysrmk">&#129302; System Remarks</div>
    </div>

    <div id="rmk-view-top5"><div id="rmk-top5-wrap"></div></div>
    <div id="rmk-view-monthly" style="display:none"><div id="rmk-monthly-wrap"></div></div>
    <div id="rmk-view-sysrmk"  style="display:none"><div id="rmk-sysrmk-wrap"></div></div>
```

---

## Task 6: Frontend — Update `goRmkTab` to include `sysrmk`

**Files:**
- Modify: `gas-inventory-impact/dashboard/index.html` (function `goRmkTab`, line ~3426)

- [ ] **Step 1: Add `sysrmk` to the tab list and dispatch**

Find:
```javascript
function goRmkTab(tab){
  ['top5','monthly'].forEach(function(t){
    var v=document.getElementById('rmk-view-'+t); if(v) v.style.display=t===tab?'block':'none';
    var b=document.getElementById('rmk-tab-'+t); if(b) b.classList.toggle('on',t===tab);
  });
  if(tab==='top5') renderRmkTop5();
  else renderRmkMonthly();
}
```

Replace with:
```javascript
function goRmkTab(tab){
  ['top5','monthly','sysrmk'].forEach(function(t){
    var v=document.getElementById('rmk-view-'+t); if(v) v.style.display=t===tab?'block':'none';
    var b=document.getElementById('rmk-tab-'+t); if(b) b.classList.toggle('on',t===tab);
  });
  if(tab==='top5') renderRmkTop5();
  else if(tab==='sysrmk') renderSysRemarks();
  else renderRmkMonthly();
}
```

---

## Task 7: Frontend — Add `renderSysRemarks()` and `saveSysUserComment()`

**Files:**
- Modify: `gas-inventory-impact/dashboard/index.html` (paste after `goRmkTab` function)

The two system remark values to filter on:
- `"System Triggered - Expiry workflow"`
- `"QC Triggered - Batch Recalled"`

`dailyTop5Data` is the in-memory array (already loaded at boot). Each element is a plain object with keys matching NI_DailyTop5 headers: `EH_ID`, `Date`, `Brand`, `SKU`, `Name`, `Batch`, `Facility`, `BizType`, `Event`, `Impact Class`, `COGSValue`, `Remark`, `UserComment`, etc.

- [ ] **Step 1: Paste both functions immediately after `goRmkTab`**

```javascript
var SYS_REMARKS = ['System Triggered - Expiry workflow','QC Triggered - Batch Recalled'];

function renderSysRemarks(){
  var wrap = document.getElementById('rmk-sysrmk-wrap');
  if(!wrap) return;

  // Filter: current month + Financial Loss + system remark
  var now = new Date();
  var cy = now.getFullYear(), cm = now.getMonth();
  var rows = (dailyTop5Data||[]).filter(function(r){
    if((r['Impact Class']||'').trim() !== 'Financial Loss') return false;
    if(SYS_REMARKS.indexOf((r['Remark']||'').trim()) < 0) return false;
    var d = parseDate(r['Date']); if(!d||isNaN(d)) return false;
    return d.getFullYear()===cy && d.getMonth()===cm;
  });

  if(!rows.length){
    wrap.innerHTML='<div style="padding:40px;text-align:center;color:var(--mu);font-size:12px">No system-triggered remarks for this month</div>';
    return;
  }

  // Group by date descending
  var byDate = {};
  rows.forEach(function(r){ var d=r['Date']||''; if(!byDate[d]) byDate[d]=[]; byDate[d].push(r); });
  var dates = Object.keys(byDate).sort(function(a,b){ return parseDate(b)-parseDate(a); });

  var html = '';
  dates.forEach(function(dt){
    html += '<div style="margin-bottom:18px">'
      +'<div style="font-size:11px;font-weight:700;color:var(--tl);padding:6px 0;border-bottom:1px solid var(--br);margin-bottom:8px">'+dt+'</div>';
    byDate[dt].forEach(function(r){
      var ehId = r['EH_ID']||'';
      var uc   = (r['UserComment']||'').trim();
      var rmkPill = '<span style="display:inline-block;background:var(--sf);border:1px solid var(--br);'
        +'border-radius:10px;padding:2px 8px;font-size:9px;color:var(--mu);margin-bottom:6px">'
        +(r['Remark']||'')+'</span>';

      var commentHtml;
      if(uc){
        commentHtml = '<div style="font-size:11px;color:var(--tx);background:var(--sf2,var(--sf));'
          +'border:1px solid var(--br);border-radius:6px;padding:7px 10px;margin-top:4px">'
          +'<span style="font-size:9px;color:var(--mu);display:block;margin-bottom:2px">User Comment (locked)</span>'
          +uc+'</div>';
      } else {
        commentHtml = '<div style="display:flex;gap:6px;margin-top:4px" id="uc-row-'+ehId+'">'
          +'<input id="uc-inp-'+ehId+'" type="text" placeholder="Add observation…" '
          +'style="flex:1;font-size:11px;padding:5px 8px;border:1px solid var(--br);border-radius:6px;'
          +'background:var(--wh);color:var(--tx);outline:none" />'
          +'<button onclick="saveSysUserComment(\''+ehId+'\')" '
          +'style="font-size:10px;font-weight:700;padding:5px 12px;border-radius:6px;border:none;'
          +'background:var(--tl);color:#fff;cursor:pointer">Save</button>'
          +'</div>';
      }

      html += '<div style="background:var(--wh);border:1px solid var(--br);border-radius:8px;'
        +'padding:10px 14px;margin-bottom:8px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;margin-bottom:4px">'
        +'<span style="font-size:10px;font-weight:700;color:var(--tx)">'+fv(parseFloat(r['COGSValue'])||0)+'</span>'
        +'<span style="font-size:10px;color:var(--tx2)">'+( r['Name']||r['SKU']||'' )+'</span>'
        +'<span style="font-size:9px;color:var(--mu)">'+( r['Facility']||'' )+'</span>'
        +'<span style="font-size:9px;color:var(--mu)">'+( r['Brand']||'' )+'</span>'
        +'<span style="font-size:9px;color:var(--mu)">Batch: '+( r['Batch']||'' )+'</span>'
        +'</div>'
        +rmkPill
        +commentHtml
        +'</div>';
    });
    html += '</div>';
  });

  wrap.innerHTML = html;
}

function saveSysUserComment(ehId){
  var inp = document.getElementById('uc-inp-'+ehId);
  if(!inp) return;
  var comment = inp.value.trim();
  if(!comment){ inp.style.borderColor='var(--re)'; return; }
  inp.disabled = true;
  var btn = inp.parentElement.querySelector('button');
  if(btn){ btn.disabled=true; btn.textContent='Saving…'; }
  fetch(PROXY, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'saveUserComment', ehId:ehId, comment:comment})
  })
  .then(function(res){ return res.json(); })
  .then(function(data){
    if(data.ok){
      // Replace input row with locked label
      var row = document.getElementById('uc-row-'+ehId);
      if(row){
        var locked = document.createElement('div');
        locked.style.cssText='font-size:11px;color:var(--tx);background:var(--sf);border:1px solid var(--br);border-radius:6px;padding:7px 10px;margin-top:4px';
        locked.innerHTML='<span style="font-size:9px;color:var(--mu);display:block;margin-bottom:2px">User Comment (locked)</span>'+comment;
        row.parentElement.replaceChild(locked, row);
      }
      // Update in-memory record so re-renders stay locked
      (dailyTop5Data||[]).forEach(function(r){ if((r['EH_ID']||'')=== ehId) r['UserComment']=comment; });
    } else if(data.error==='already_saved'){
      if(btn){ btn.textContent='Already saved'; }
      inp.disabled=true;
    } else {
      if(btn){ btn.textContent='Error — retry'; btn.disabled=false; }
      inp.disabled=false;
    }
  })
  .catch(function(){
    if(btn){ btn.textContent='Error — retry'; btn.disabled=false; }
    inp.disabled=false;
  });
}
```

---

## Task 8: Sync root `index.html` and commit

**Files:**
- Modify: `index.html` (root — GitHub Pages deployment file)

The root `index.html` is what GitHub Pages serves. Apply the identical changes from Tasks 5, 6, and 7.

- [ ] **Step 1: Apply Task 5 HTML change to root `index.html`**

Same edit as Task 5 — add `sysrmk` tab button and `rmk-view-sysrmk` div at line ~461.

- [ ] **Step 2: Apply Task 6 `goRmkTab` change to root `index.html`**

Same edit as Task 6 — add `'sysrmk'` to the array and dispatch.

- [ ] **Step 3: Apply Task 7 functions to root `index.html`**

Paste the same `SYS_REMARKS`, `renderSysRemarks()`, and `saveSysUserComment()` functions after `goRmkTab`.

- [ ] **Step 4: Commit both files**

```bash
git add gas-inventory-impact/dashboard/index.html index.html
git commit -m "Dashboard: add System Remarks tab with one-time user comment capture"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

Wait ~60 seconds for GitHub Pages to deploy, then open https://vipkotkar-cell.github.io/mosaic-inventory/ and verify:
- Remarks page shows three tabs including "🤖 System Remarks"
- Tab shows only rows with `Remark = "System Triggered - Expiry workflow"` or `"QC Triggered - Batch Recalled"`
- Rows without a UserComment show a text input + Save button
- Saving a comment replaces the input with locked text
- Reloading the page shows the saved comment as locked (fetched from sheet)

---

## Self-Review Checklist

- [x] **Spec coverage:** Schema migration (Task 1+2) ✓, doPost saveUserComment (Task 3) ✓, doGet auto-includes col 19 (no change needed — `getDataRange()` already covers all cols) ✓, tab HTML (Task 5) ✓, goRmkTab update (Task 6) ✓, renderSysRemarks + saveSysUserComment (Task 7) ✓, dual-file sync (Task 8) ✓
- [x] **Placeholder scan:** All code is complete. No TBD/TODO.
- [x] **Type consistency:** `dailyTop5Data` is the correct variable name per codebase. `PROXY` is the correct fetch endpoint variable. `fv()` and `parseDate()` are existing helpers used throughout.
- [x] **Edge case — col 19 missing:** `saveUserComment_` in GAS looks up the `UserComment` header dynamically, so it won't silently write to the wrong column if migration hasn't run.
- [x] **Edge case — 18-col rebuild guard:** Task 1 prevents `getDailyTop5Sheet_` from wiping a valid 18-col sheet; only truly broken schemas (wrong Impact Class position or < 18 cols) trigger a rebuild.
