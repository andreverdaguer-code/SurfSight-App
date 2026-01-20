const textarea = document.getElementById('message');
const validateButton = document.getElementById('validateButton');
const resultsBody = document.getElementById('validate-results-body');

validateButton.addEventListener('click', async () => {
  const raw = textarea.value || '';

  // Split IMEIs by commas, spaces, or newlines
  const imeis = raw
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!imeis.length) {
    alert('Please enter at least one IMEI.');
    return;
  }

  // optional: clear previous results
  resultsBody.innerHTML = '';

  try {
    startLoading(imeis.length);
    validateButton.disabled = true;

    const res = await fetch('/api/devices/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imeis })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Validation failed.');
      return;
    }

    // data.results is expected from the backend route we discussed
    data.results.forEach(result => {
      const tr = document.createElement('tr');

      const imeiCell = document.createElement('td');
      imeiCell.textContent = result.imei;

      const existsCell = document.createElement('td');
      existsCell.textContent = result.found ? 'Yes' : 'No';

      const statusCell = document.createElement('td');
      statusCell.textContent =
        result.billingStatus || result.deviceStatus || result.message || `HTTP ${result.statusCode || ''}`;

      tr.appendChild(imeiCell);
      tr.appendChild(existsCell);
      tr.appendChild(statusCell);

      resultsBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    alert('Network error while validating devices.');
  } finally {
    stopLoading();
    validateButton.disabled = false;
  }
});

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
  const table = document.getElementById("validate-results"); // or your manage-results table

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