document.addEventListener('DOMContentLoaded', () => {
  console.log('manage.js loaded');

  const imeiTextarea = document.getElementById('message');              // textarea
  const statusSelect = document.querySelector('select[name="status"]'); // status dropdown
  const qualitySelect = document.querySelector('select[name="quality"]'); // quality dropdown
  const manageBtn = document.getElementById('manageButton');            // Apply button
  const resultsBody = document.getElementById('manage-results-body');   // results table body (optional)

  if (!manageBtn) {
    console.warn('Manage: #manageButton not found');
    return;
  }

  manageBtn.addEventListener('click', async () => {
    console.log('Apply Changes clicked');

    if (!imeiTextarea) {
      alert('IMEI textarea not found.');
      return;
    }

    // 1) Collect IMEIs from textarea
    const raw = imeiTextarea.value || '';
    const imeis = raw
      .split(/[\s,]+/)      // split on commas, spaces, newlines
      .map(s => s.trim())
      .filter(Boolean);

    if (!imeis.length) {
      alert('Please enter at least one IMEI.');
      return;
    }

    const statusValue = statusSelect ? statusSelect.value : '';
    const qualityValue = qualitySelect ? qualitySelect.value : '';

    if (!statusValue && !qualityValue) {
      alert('Please select a Status or Quality option.');
      return;
    }

    // clear previous results if table exists
    if (resultsBody) resultsBody.innerHTML = '';

    try {
      startLoading(imeis.length);
      manageBtn.disabled = true;
      // 2) Apply billing status if selected
      if (statusValue) {
        await applyBillingChanges(imeis, statusValue, resultsBody);
      }

      // 3) Apply quality level if selected
      if (qualityValue) {
        await applyQualityChanges(imeis, qualityValue, resultsBody);
      }
    } catch (err) {
      console.error('Error applying changes:', err);
      alert('Something went wrong while applying changes. Check console for details.');
    } finally {
      stopLoading();
      manageBtn.disabled = false;
    }
  });
});

/**
 * Billing status changes via /api/devices/billing
 * statusValue is one of: "pendingActivation", "deactivated", "suspended"
 */
async function applyBillingChanges(imeis, statusValue, resultsBody) {
  console.log('Applying billing status', statusValue, 'to', imeis);

  const res = await fetch('/api/devices/billing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imeis,
      billingStatus: statusValue
    })
  });

  const data = await res.json().catch(() => ({}));
  console.log('Billing response:', data);

  if (!res.ok) {
    alert(data.error || 'Failed to update billing status.');
    return;
  }

  if (!resultsBody) return;

  const results = Array.isArray(data.results) ? data.results : [];

  results.forEach(result => {
    const tr = document.createElement('tr');

    const imeiCell = document.createElement('td');
    imeiCell.textContent = result.imei || '';

    const actionCell = document.createElement('td');
    actionCell.textContent = 'Billing';

    const statusCell = document.createElement('td');
    statusCell.textContent = result.ok ? 'Success' : 'Failed';

    const detailCell = document.createElement('td');
    detailCell.textContent =
      result.billingStatus ||
      result.message ||
      result.error ||
      `HTTP ${result.statusCode || ''}`;

    tr.appendChild(imeiCell);
    tr.appendChild(actionCell);
    tr.appendChild(statusCell);
    tr.appendChild(detailCell);

    resultsBody.appendChild(tr);
  });
}

/**
 * Quality changes via /api/devices/quality
 * qualityValue is "level_1" .. "level_5"
 */
async function applyQualityChanges(imeis, qualityValue, resultsBody) {
  const qualityLevel = Number(qualityValue);

  if (!Number.isInteger(qualityLevel) || qualityLevel < 2 || qualityLevel > 6) {
    alert('Quality level must be between 1 and 5.');
    return;
  }

  console.log('Applying quality level', qualityLevel, 'to', imeis);

  const res = await fetch('/api/devices/quality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imeis,
      qualityLevel          // 👈 matches backend
    })
  });

  const data = await res.json().catch(() => ({}));
  console.log('Quality response:', data, 'status:', res.status);

  if (!res.ok) {
    alert(data.error || 'Failed to update quality level.');
    return;
  }

  if (!resultsBody) return;

  const results = Array.isArray(data.results) ? data.results : [];

  results.forEach(result => {
    const tr = document.createElement('tr');

    const imeiCell = document.createElement('td');
    imeiCell.textContent = result.imei || '';

    const actionCell = document.createElement('td');
    actionCell.textContent = 'Quality';

    const statusCell = document.createElement('td');
    statusCell.textContent = result.ok ? 'Success' : 'Failed';

    const detailCell = document.createElement('td');
    detailCell.textContent =
      (result.qualityLevel != null ? `Level ${result.qualityLevel - 1}` : '') ||
      result.message ||
      result.error ||
      `HTTP ${result.statusCode || ''}`;

    tr.appendChild(imeiCell);
    tr.appendChild(actionCell);
    tr.appendChild(statusCell);
    tr.appendChild(detailCell);

    resultsBody.appendChild(tr);
  });
}

let loadingTimerId = null;
let loadingStart = 0;
let loadingTotal = 0;

function startLoading(totalDevices) {
  const indicator = document.getElementById('loadingIndicator');
  const textEl = document.getElementById('loadingText');
  if (!indicator || !textEl) return;

  loadingStart = Date.now();
  loadingTotal = totalDevices;

  indicator.hidden = false;
  indicator.classList.remove('done'); // spinner ON
  textEl.textContent = `Processing ${loadingTotal} device(s)... 0s elapsed`;

  if (loadingTimerId) clearInterval(loadingTimerId);
  loadingTimerId = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - loadingStart) / 1000);
    textEl.textContent =
      `Processing ${loadingTotal} device(s)... ${elapsedSec}s elapsed`;
  }, 1000);
}

function stopLoading() {
  const indicator = document.getElementById('loadingIndicator');
  const textEl = document.getElementById('loadingText');

  if (loadingTimerId) {
    clearInterval(loadingTimerId);
    loadingTimerId = null;
  }

  if (indicator && textEl && loadingStart) {
    const elapsedSec = Math.floor((Date.now() - loadingStart) / 1000);
    textEl.textContent =
      `Processed ${loadingTotal} device(s) in ${elapsedSec}s`;
    indicator.hidden = false;          // stay visible
    indicator.classList.add('done');   // spinner OFF
  }

  loadingStart = 0;
  loadingTotal = 0;
}

document.addEventListener("DOMContentLoaded", () => {
  const exportBtn = document.getElementById("exportButton");
  const table = document.getElementById("manage-results"); // or your manage-results table

  if (!exportBtn || !table) return;

  exportBtn.addEventListener("click", () => {
    const csv = tableToCSV(table);
    downloadCSV(csv, "surfsight_results.csv");
  });
});

function tableToCSV(table) {
  let csvRows = [];
  const rows = table.querySelectorAll("tr");

  for (const row of rows) {
    const cells = row.querySelectorAll("th, td");
    let rowData = [];

    cells.forEach(cell => {
      // Escape commas & quotes
      let text = cell.textContent.replace(/"/g, '""');
      rowData.push(`"${text}"`);
    });

    csvRows.push(rowData.join(","));
  }

  return csvRows.join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  window.URL.revokeObjectURL(url);
}