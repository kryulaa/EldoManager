import express from "express";
import axios from "axios";
import speakeasy from "speakeasy";

const GF_BASE = "https://production-gameflip.fingershock.com/api/v1";

function gfAuth(key: string, secret: string, offsetSteps = 0) {
  const now = Math.floor(Date.now() / 1000) + offsetSteps * 30;
  const totp = speakeasy.totp({ secret: secret.trim(), encoding: "base32", algorithm: "sha1", digits: 6, step: 30, time: now });
  return `GFAPI ${key.trim()}:${totp}`;
}

async function gfRequest(method: string, url: string, key: string, secret: string, config: any = {}) {
  for (const offset of [0, -1, 1]) {
    try {
      const auth = gfAuth(key, secret, offset);
      const headers = { "Content-Type": "application/json", ...config.headers, Authorization: auth };
      return await (axios as any)[method](url, ...(config.data !== undefined ? [config.data, { ...config, headers }] : [{ ...config, headers }]));
    } catch (e: any) {
      if (offset !== 1 && (e.response?.status === 401 || e.response?.status === 403)) continue;
      throw e;
    }
  }
}

function gfCreds(req: express.Request) {
  const key = (req.headers["x-gf-key"] as string)?.trim();
  const secret = (req.headers["x-gf-secret"] as string)?.trim();
  return key && secret ? { key, secret } : null;
}

const app = express();
app.use(express.json());

// In-memory caches (warm across requests within the same serverless instance)
const responseCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL_MS = 60_000;
function getCached(key: string) {
  const e = responseCache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL_MS ? e.data : null;
}
function setCached(key: string, data: any) {
  responseCache.set(key, { data, ts: Date.now() });
}

const xsrfCache = new Map<string, { value: string; ts: number }>();
const XSRF_TTL_MS = 8 * 60 * 1000;

async function fetchXsrfToken(authToken: string): Promise<string | null> {
  const cached = xsrfCache.get(authToken);
  if (cached && Date.now() - cached.ts < XSRF_TTL_MS) return cached.value;
  for (const url of ["https://www.eldorado.gg/seller/offers", "https://www.eldorado.gg/"]) {
    try {
      const r = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Cookie: `__Host-EldoradoIdToken=${authToken}`,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        maxRedirects: 5,
        timeout: 15000,
      });
      const cookies: string[] = (r.headers["set-cookie"] as string[]) || [];
      for (const c of cookies) {
        const m = c.match(/XSRF-TOKEN=([^;]+)/i);
        if (m) {
          const val = decodeURIComponent(m[1]);
          xsrfCache.set(authToken, { value: val, ts: Date.now() });
          return val;
        }
      }
    } catch {}
  }
  return null;
}

// ── Notifications ──────────────────────────────────────────────────────────
app.get("/api/eldorado/notifications", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.get("https://eldorado.gg/api/notifications/me", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" },
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── My offers ──────────────────────────────────────────────────────────────
app.get("/api/eldorado/offers", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.get("https://www.eldorado.gg/api/v1/item-management/me/offers/me/search", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" },
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── My offer images ────────────────────────────────────────────────────────
app.get("/api/eldorado/my-offers-images", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.get("https://www.eldorado.gg/api/v1/item-management/me/offers/me/search", {
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" },
    });
    res.json(r.data.results.map((o: any) => ({
      id: o.id,
      image: o.mainOfferImage?.smallImage || o.offerImages?.[0]?.smallImage || o.mainOfferImage?.largeImage || null,
    })));
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── My predefined offers ───────────────────────────────────────────────────
app.get("/api/eldorado/my-predefined-offers", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.get("https://eldorado.gg/api/predefinedOffers/me", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" },
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── Public predefined offers ───────────────────────────────────────────────
app.get("/api/eldorado/predefined-offers", async (req, res) => {
  const key = `predefined:${JSON.stringify(req.query)}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);
  try {
    const r = await axios.get("https://eldorado.gg/api/predefinedOffers/game", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Accept: "application/json" },
    });
    setCached(key, r.data);
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── My flexible offers ─────────────────────────────────────────────────────
app.get("/api/eldorado/flexible-offers", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.get("https://eldorado.gg/api/flexibleOffers/me/search", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" },
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── Public flexible offers ─────────────────────────────────────────────────
app.get("/api/eldorado/public-flexible-offers", async (req, res) => {
  const key = `pub-flex:${JSON.stringify(req.query)}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);
  try {
    const r = await axios.get("https://eldorado.gg/api/flexibleOffers", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Accept: "application/json" },
    });
    setCached(key, r.data);
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── Public item offers ─────────────────────────────────────────────────────
app.get("/api/eldorado/public-item-offers", async (req, res) => {
  const key = `pub-item:${JSON.stringify(req.query)}`;
  const cached = getCached(key);
  if (cached) return res.json(cached);
  try {
    const r = await axios.get("https://eldorado.gg/api/v1/item-management/offers", {
      params: req.query,
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Accept: "application/json" },
    });
    setCached(key, r.data);
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── Update stock/details ───────────────────────────────────────────────────
app.put("/api/eldorado/offers/:offerId/details", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  const id = req.params.offerId;
  const { quantity, offerTitle, description, gameId, category, currentPrice, currentCurrency, guaranteedDeliveryTime, mainOfferImage, offerImages } = req.body;

  if (!mainOfferImage) return res.status(400).json({ error: "mainOfferImage is required" });

  const body = {
    details: {
      offerTitle: offerTitle || "",
      description: description ?? "",
      guaranteedDeliveryTime: guaranteedDeliveryTime || "Instant",
      mainOfferImage,
      ...(offerImages?.length ? { offerImages } : {}),
      pricing: {
        quantity: Number(quantity),
        minQuantity: 1,
        pricePerUnit: { amount: Number(currentPrice), currency: currentCurrency || "USD" },
      },
    },
    augmentedGame: { gameId, category, offerAttributes: [] },
  };

  const xsrf = await fetchXsrfToken(token);
  const cookieStr = xsrf ? `__Host-EldoradoIdToken=${token}; XSRF-TOKEN=${encodeURIComponent(xsrf)}` : `__Host-EldoradoIdToken=${token}`;
  const xsrfHdr = xsrf ? { "X-XSRF-TOKEN": xsrf, RequestVerificationToken: xsrf } : {};
  const plain = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", Cookie: cookieStr, Accept: "application/json", ...xsrfHdr };

  const url = `https://www.eldorado.gg/api/v1/item-management/me/offers/item/${id}/details`;
  const attempts = [
    { headers: plain,                                          ct: "application/json" },
    { headers: { ...plain, Authorization: `Bearer ${token}` }, ct: "application/json" },
    { headers: plain,                                          ct: "application/json-patch+json" },
    { headers: { ...plain, Authorization: `Bearer ${token}` }, ct: "application/json-patch+json" },
  ];

  let lastError: any = null;
  for (const a of attempts) {
    try {
      const r = await axios.put(url, body, { headers: { ...a.headers, "Content-Type": a.ct } });
      return res.json(r.data ?? { ok: true });
    } catch (e: any) { lastError = e; }
  }
  res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to update details" });
});

// ── Change price ───────────────────────────────────────────────────────────
app.put("/api/eldorado/offers/:offerId/change-price", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  const id = req.params.offerId;
  const { amount, currency } = req.body;
  const cookieOnly = { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" };
  const withBearer = { ...cookieOnly, Authorization: `Bearer ${token}` };
  const fallbacks = [
    { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${id}/price`, headers: cookieOnly },
    { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${id}/price`, headers: withBearer },
    { url: `https://eldorado.gg/api/predefinedOffersUser/me/${id}/changePrice`,    headers: withBearer },
    { url: `https://eldorado.gg/api/flexibleOffersUser/me/${id}/changePrice`,      headers: withBearer },
  ];
  let lastError: any = null;
  for (const f of fallbacks) {
    try {
      const r = await axios.put(f.url, { amount, currency }, { headers: { ...f.headers, "Content-Type": "application/json" } });
      return res.json(r.data);
    } catch (e: any) { lastError = e; }
  }
  res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to update price" });
});

// ── Pause ──────────────────────────────────────────────────────────────────
app.post("/api/eldorado/offers/:offerId/pause", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  const id = req.params.offerId;
  const h = { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" };
  const fallbacks = [
    { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${id}/pause`, method: "post" },
    { url: `https://eldorado.gg/api/predefinedOffersUser/me/${id}/pause`,           method: "put" },
  ];
  let lastError: any = null;
  for (const f of fallbacks) {
    try {
      const r = await (axios as any)[f.method](f.url, {}, { headers: { ...h, "Content-Type": "application/json" } });
      return res.json(r.data);
    } catch (e: any) { lastError = e; }
  }
  res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to pause" });
});

// ── Resume ─────────────────────────────────────────────────────────────────
app.post("/api/eldorado/offers/:offerId/resume", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  const id = req.params.offerId;
  const h = { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json" };
  const fallbacks = [
    { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${id}/resume`, method: "post" },
    { url: `https://eldorado.gg/api/predefinedOffersUser/me/${id}/resume`,           method: "put" },
  ];
  let lastError: any = null;
  for (const f of fallbacks) {
    try {
      const r = await (axios as any)[f.method](f.url, {}, { headers: { ...h, "Content-Type": "application/json" } });
      return res.json(r.data);
    } catch (e: any) { lastError = e; }
  }
  res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to resume" });
});

// ── Bulk price ─────────────────────────────────────────────────────────────
app.post("/api/eldorado/offers/game/:gameId/price", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.post(`https://www.eldorado.gg/api/v1/item-management/me/offers/game/${req.params.gameId}/price`, req.body, {
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json", "Content-Type": "application/json-patch+json" },
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── Create item offer ──────────────────────────────────────────────────────
app.post("/api/eldorado/offers/item", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const r = await axios.post("https://www.eldorado.gg/api/v1/item-management/me/offers/item", req.body, {
      headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", Authorization: `Bearer ${token}`, Cookie: `__Host-EldoradoIdToken=${token}`, Accept: "application/json", "Content-Type": "application/json" },
    });
    res.json(r.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

// ── Gameflip ────────────────────────────────────────────────────────────────
app.get("/api/gameflip/me", async (req, res) => {
  const c = gfCreds(req);
  if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
  try {
    const r = await gfRequest('get', `${GF_BASE}/account/me/profile`, c.key, c.secret);
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" }); }
});

app.get("/api/gameflip/listings", async (req, res) => {
  const c = gfCreds(req);
  if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
  try {
    const r = await gfRequest('get', `${GF_BASE}/listing`, c.key, c.secret, { params: { ...req.query, v2: true } });
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" }); }
});

app.get("/api/gameflip/listing/:id", async (req, res) => {
  const c = gfCreds(req);
  if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
  try {
    const r = await gfRequest('get', `${GF_BASE}/listing/${req.params.id}`, c.key, c.secret);
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" }); }
});

app.patch("/api/gameflip/listing/:id", async (req, res) => {
  const c = gfCreds(req);
  if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
  const url = `${GF_BASE}/listing/${req.params.id}`;
  const ops = req.body;

  const doPatchOps = async (patchOps: any[]) =>
    gfRequest('patch', url, c.key, c.secret, {
      data: patchOps,
      headers: { "Content-Type": "application/json-patch+json" },
    });

  const fetchStatus = async () => {
    const cur = await gfRequest('get', url, c.key, c.secret);
    return (cur.data?.data?.status ?? cur.data?.status) as string | undefined;
  };

  const doCycle = async () => {
    await doPatchOps([{ op: 'replace', path: '/status', value: 'ready' }]);
    await doPatchOps(ops);
    const final = await doPatchOps([{ op: 'replace', path: '/status', value: 'onsale' }]);
    return res.json(final.data);
  };

  try {
    let status: string | undefined;
    try { status = await fetchStatus(); } catch {}
    if (status === 'onsale') return await doCycle();
    const r = await doPatchOps(ops);
    return res.json(r.data);
  } catch (e: any) {
    const msg: string = e.response?.data?.error?.message || '';
    if (e.response?.status === 400 && msg.includes('onsale')) {
      try { return await doCycle(); } catch (e2: any) {
        return res.status(e2.response?.status || 500).json(e2.response?.data || { error: 'Failed during status cycle' });
      }
    }
    res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" });
  }
});

app.get("/api/gameflip/search", async (req, res) => {
  const c = gfCreds(req);
  if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
  try {
    const r = await gfRequest('get', `${GF_BASE}/listing`, c.key, c.secret, { params: req.query });
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" }); }
});

app.get("/api/gameflip/wallet", async (req, res) => {
  const c = gfCreds(req);
  if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
  try {
    const r = await gfRequest('get', `${GF_BASE}/account/me/wallet_history`, c.key, c.secret, { params: { limit: 1 } });
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: "Failed" }); }
});

// ── ZeusX routes ─────────────────────────────────────────────────────────────
const ZX_BASE = 'https://api.zeusx.com/v1';
const zxHeaders = (token: string, cfClearance?: string) => ({
  'Authorization': `Bearer ${token.replace(/^Bearer\s+/i, '')}`,
  'Content-Type': 'application/json',
  'accept': 'application/json, text/plain, */*',
  'origin': 'https://zeusx.com',
  'referer': 'https://zeusx.com/',
  'zeusx-currency': 'USD',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  ...(cfClearance ? { 'cookie': `cf_clearance=${cfClearance}` } : {}),
});
const zxToken = (req: any) => (req.headers['x-zx-token'] as string || '').replace(/^Bearer\s+/i, '');
const zxCf = (req: any) => (req.headers['x-zx-cf'] as string || '').trim();

app.get('/api/zeusx/me', async (req, res) => {
  const token = zxToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    await axios.get(`${ZX_BASE}/offer/my-sales-listing?pageIndex=0&pageSize=1`, { headers: zxHeaders(token) });
    res.json({ data: { id: payload?.data?.id, exp: payload?.exp } });
  } catch (e: any) { res.status(e.response?.status || 401).json(e.response?.data || { error: 'Invalid token' }); }
});

app.get('/api/zeusx/listings', async (req, res) => {
  const token = zxToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const pageIndex = parseInt(req.query.pageIndex as string || '0') || 0;
    const r = await axios.get(`${ZX_BASE}/offer/my-sales-listing`, { headers: zxHeaders(token), params: { pageIndex } });
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' }); }
});

app.get('/api/zeusx/offer/:id', async (req, res) => {
  const token = zxToken(req);
  const cf = zxCf(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const r = await axios.get(`${ZX_BASE}/offer/${req.params.id}`, { headers: zxHeaders(token, cf) });
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' }); }
});

app.put('/api/zeusx/offer/:id', async (req, res) => {
  const token = zxToken(req);
  const cf = zxCf(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    let full: any = req.body._fullOffer;
    if (!full || typeof full !== 'object' || !full.id) {
      const offerRes = await axios.get(`${ZX_BASE}/offer/${req.params.id}`, { headers: zxHeaders(token, cf) });
      full = offerRes.data?.data;
      if (!full || typeof full !== 'object' || !full.id) {
        return res.status(502).json({ error: 'Could not fetch offer from ZeusX. Update cf_clearance and try again.' });
      }
    }
    const resolvedScId = full.service_category_id || full.service_category || full.service_category_base_id;
    const offer = {
      ...full,
      id: full.id || full.offer_id,
      service_category_id: resolvedScId,
      service_category: resolvedScId,
      offer_base_attribute_value: (full.attribute_values || []).map((av: any) => ({
        base_attribute_id: av.base_attribute_id,
        base_attribute_value: av.base_attribute_value,
      })),
      agreeTerm: true,
      removing_photo_ids: [],
      photos: [],
      uploaded_photos: [],
    };
    const r = await axios.put(`${ZX_BASE}/offer/${req.params.id}/update`, { offer }, { headers: zxHeaders(token, cf) });
    res.json(r.data);
  } catch (e: any) {
    console.error('[ZX PUT] error:', e.response?.status, JSON.stringify(e.response?.data));
    res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' });
  }
});

app.get('/api/zeusx/search', async (req, res) => {
  const token = zxToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const r = await axios.get(`${ZX_BASE}/offer/sales-listing`, { headers: zxHeaders(token), params: { offer_status: 'CREATED', sort: 'listed_price:asc', pageSize: 50, ...req.query } });
    res.json(r.data);
  } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' }); }
});

export default app;
