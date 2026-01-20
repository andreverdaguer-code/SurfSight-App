import express from 'express';
import session from 'express-session';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// --- ESM-friendly __dirname / __filename ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Core app setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// Path to your /public folder (sibling of /server)
const publicDir = path.resolve(__dirname, '..', 'public');
console.log('Serving static files from:', publicDir);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files like login.html, css, js, etc.
app.use(express.static(publicDir));


app.get('/', (req, res) => {
  res.sendFile('login.html', { root: publicDir });
});

app.use(session({
    secret: 'replace this later',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

app.use(express.static('public'));

const SURF_BASE = 'https://api-prod.surfsight.net/v2';

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required.' });
    }

    try {
        const response = await fetch(`${SURF_BASE}/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            return res.status(401).json({ error: 'Invalid SurfSight credentials.' });
        }

        const data = await response.json();
        const token = data?.data?.token;

        if (!token) {
            return res.status(500).json({ error: 'SurfSight returned no token.' });
        }

        req.session.surfsight = {
            email,
            token,
            organizationId: data.data.organizationId,
        };

        res.json({ ok: true, organizationId: data.data.organizationId});

    } catch (err) {
        console.error('SurfSight error:', err);
        res.status(500).json({ error: 'Error contacting SurfSight API.' });
    }
});

//Test if you're logged in

function requireSurfSight(req, res, next) {
  const s = req.session.surfsight;
  if (!s || !s.token) {
    return res.status(401).json({ error: 'Not authenticated with SurfSight.' });
  }
  next();
}

app.get('/api/auth/status', requireSurfSight, (req, res) => {
  const { email, organizationId } = req.session.surfsight;
  res.json({ ok: true, email, organizationId });
});

//For Validate JS

app.post('/api/devices/validate', requireSurfSight, async (req, res) => {
  const { imeis } = req.body || {};
  const { token } = req.session.surfsight || {};

  if (!Array.isArray(imeis) || imeis.length === 0) {
    return res.status(400).json({ error: 'imei list is required.' });
  }

  const results = [];

  for (const imei of imeis) {
    try {
      // 1) BILLING STATUS
      const billingResp = await fetch(
        `${SURF_BASE}/devices/${imei}/billing-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }
      );

      if (billingResp.status === 404) {
        results.push({
          imei,
          found: false,
          statusCode: 404,
          message: 'Device not found'
        });
        continue;
      }

      const billingJson = await billingResp.json().catch(() => null);
      const billingData = billingJson?.data || {};
      const billingStatusRaw = billingData.billingStatus || 'billingStatusNotSet';

      // optional: normalize labels for your UI
      function normalizeBillingStatus(raw) {
        switch ((raw || '').toLowerCase()) {
          case 'activated':
            return 'Activated';
          case 'pendingactivation':
            return 'Pending Activation';
          case 'suspended':
            return 'Suspended';
          case 'deactivated':
            return 'Deactivated';
          case 'billingstatusnotset':
            return 'Not Set';
          default:
            return raw || 'Unknown';
        }
      }

      const billingStatus = normalizeBillingStatus(billingStatusRaw);

      results.push({
        imei,
        found: true,
        statusCode: 200,
        billingStatus,        // normalized label for the UI
        billingStatusRaw     // raw API value if you ever need it
      });
    } catch (err) {
      console.error('Error validating', imei, err);
      results.push({
        imei,
        found: false,
        statusCode: 0,
        message: 'Server error during validation'
      });
    }
  }

  return res.json({ results });
});

//For managing Billing Status

app.post('/api/devices/billing', requireSurfSight, async (req, res) => {
  const { imeis, billingStatus } = req.body || {};
  const { token } = req.session.surfsight || {};

  if (!Array.isArray(imeis) || imeis.length === 0) {
    return res.status(400).json({ error: 'imeis array required.' });
  }
  if (!billingStatus) {
    return res.status(400).json({ error: 'billingStatus is required.' });
  }

  try {
    // Bulk endpoint: PUT /v2/devices/billing-status/{billingStatus}
    const surfRes = await fetch(
      `${SURF_BASE}/devices/billing-status/${billingStatus}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ imeis })
      }
    );

    const json = await surfRes.json().catch(() => null);
    console.log('SurfSight billing response:', surfRes.status, json);

    if (!surfRes.ok) {
      // Bubble SurfSight error back up so you can see it
      return res.status(surfRes.status).json({
        error: json?.message || `SurfSight error (${surfRes.status})`
      });
    }

    // At this point SurfSight accepted the bulk request.
    // We’ll assume it applied to all IMEIs.
    const results = imeis.map(imei => ({
      imei,
      ok: true,
      statusCode: surfRes.status,
      billingStatus,
      message: null
    }));

    return res.json({ results });
  } catch (err) {
    console.error('Billing update error:', err);
    return res.status(500).json({
      error: 'Server error contacting SurfSight.'
    });
  }
});

//For managing Quality Status
app.post('/api/devices/quality', requireSurfSight, async (req, res) => {
  const { imeis, qualityLevel } = req.body;

  if (!Array.isArray(imeis) || !imeis.length) {
    return res.status(400).json({ error: 'IMEIs array is required.' });
  }

  if (
    !Number.isInteger(qualityLevel) ||
    qualityLevel < 2 ||
    qualityLevel > 6
  ) {
    return res.status(400).json({ error: 'Quality level must be 1–5.' });
  }

  const { token } = req.session.surfsight;

  const results = [];

  for (const imei of imeis) {
    const dataProfileId = qualityLevel;

    try {
      const response = await fetch(
        `https://api-prod.surfsight.net/v2/devices/${imei}/data-profile/${dataProfileId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({})
        }
      );


      let bodyText = await response.text();
      let body = {};
      try {
        body = JSON.parse(bodyText);
      } catch (_) {}

      results.push({
        imei,
        ok: response.ok,
        statusCode: response.status,
        qualityLevel,
        message: body.message || body.error || null
      });
    } catch (err) {
      console.error('Quality update error for', imei, err);
      results.push({
        imei,
        ok: false,
        statusCode: 500,
        qualityLevel,
        message: 'Server error updating quality'
      });
    }
  }

  res.json({ results });
});

//Starting the server
export function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}