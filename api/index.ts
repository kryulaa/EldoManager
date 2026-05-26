import express from "express";
import axios from "axios";

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

export default app;
