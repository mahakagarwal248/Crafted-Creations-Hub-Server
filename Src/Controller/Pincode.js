import https from 'https';

const LOOKUP_TIMEOUT_MS = 8000;

/**
 * Minimal HTTPS GET with a hard timeout. `allowInsecure` skips cert validation
 * for this single request only (some pincode providers have expired certs).
 * The response body is JSON.parsed if possible — we still validate shape below.
 */
function httpsGetJson(url, { allowInsecure = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: !allowInsecure,
        headers: { Accept: 'application/json', 'User-Agent': 'cch-web/1.0' },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            /* leave json null */
          }
          resolve({ statusCode: res.statusCode || 0, json });
        });
      }
    );
    req.setTimeout(LOOKUP_TIMEOUT_MS, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

const PROVIDERS = [
  {
    name: 'postpincode.in',
    url: (pin) => `https://www.postpincode.in/api/getCityName.php?pincode=${encodeURIComponent(pin)}`,
    parse: (data, pin) => {
      const first = Array.isArray(data) ? data[0] : null;
      if (!first?.City || !first?.State) return null;
      return {
        pincode: String(first.Pincode || pin),
        city: String(first.City).trim(),
        state: String(first.State).trim(),
        district: String(first.District || '').trim(),
      };
    },
  },
  {
    name: 'postalpincode.in',
    url: (pin) => `https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`,
    // This host's TLS cert is sometimes expired; allow the connection regardless.
    // Response is still validated by shape below.
    allowInsecure: true,
    parse: (data, pin) => {
      const entry = Array.isArray(data) ? data[0] : null;
      const offices = Array.isArray(entry?.PostOffice) ? entry.PostOffice : [];
      if (entry?.Status !== 'Success' || !offices.length) return null;
      const po = offices[0];
      if (!po?.State) return null;
      const city = po.District || po.Block || po.Name || '';
      if (!city) return null;
      return {
        pincode: String(po.Pincode || pin),
        city: String(city).trim(),
        state: String(po.State).trim(),
        district: String(po.District || '').trim(),
      };
    },
  },
];

async function tryProvider(provider, pin) {
  try {
    const { statusCode, json } = await httpsGetJson(provider.url(pin), {
      allowInsecure: provider.allowInsecure,
    });
    if (statusCode < 200 || statusCode >= 300) {
      return { ok: false, reason: `HTTP ${statusCode}` };
    }
    if (!json) {
      return { ok: false, reason: 'invalid JSON' };
    }
    const parsed = provider.parse(json, pin);
    if (!parsed) return { ok: false, reason: 'no match' };
    return { ok: true, result: parsed };
  } catch (err) {
    return { ok: false, reason: err?.message || 'error' };
  }
}

export async function lookupPincode(req, res) {
  const pin = String(req.query.pincode ?? req.params.pincode ?? '').trim();
  if (!/^\d{6}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN code must be 6 digits.' });
  }

  const failures = [];
  for (const provider of PROVIDERS) {
    const outcome = await tryProvider(provider, pin);
    if (outcome.ok) {
      return res.json(outcome.result);
    }
    failures.push(`${provider.name}: ${outcome.reason}`);
  }

  console.error(`Pincode lookup failed for ${pin} — ${failures.join('; ')}`);
  return res
    .status(502)
    .json({ message: 'Could not look up this PIN code. Please check the PIN and try again.' });
}
