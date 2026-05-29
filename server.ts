import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import speakeasy from "speakeasy";
import crypto from "crypto";

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

const responseCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL_MS = 60_000;
function getCached(key: string) {
  const e = responseCache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL_MS ? e.data : null;
}
function setCached(key: string, data: any) {
  responseCache.set(key, { data, ts: Date.now() });
}

// XSRF token cache — Eldorado requires X-XSRF-TOKEN header + XSRF-TOKEN cookie for write ops
const xsrfCache = new Map<string, { value: string; ts: number }>();
const XSRF_TTL_MS = 8 * 60 * 1000; // 8 min (conservative vs typical 10-min expiry)

async function fetchXsrfToken(authToken: string): Promise<string | null> {
  const cached = xsrfCache.get(authToken);
  if (cached && Date.now() - cached.ts < XSRF_TTL_MS) return cached.value;

  const pages = [
    'https://www.eldorado.gg/seller/offers',
    'https://www.eldorado.gg/',
  ];

  for (const url of pages) {
    try {
      const r = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Cookie": `__Host-EldoradoIdToken=${authToken}`,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        maxRedirects: 5,
        timeout: 15000,
      });
      const cookies: string[] = (r.headers['set-cookie'] as string[]) || [];
      for (const c of cookies) {
        const m = c.match(/XSRF-TOKEN=([^;]+)/i);
        if (m) {
          const val = decodeURIComponent(m[1]);
          xsrfCache.set(authToken, { value: val, ts: Date.now() });
          console.log(`✓ XSRF token obtained from ${url}`);
          return val;
        }
      }
      console.warn(`⚠ XSRF-TOKEN not found in Set-Cookie from ${url}`);
    } catch (e: any) {
      console.warn(`⚠ XSRF fetch from ${url} failed: ${e.message}`);
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for Eldorado API
  app.get("/api/eldorado/notifications", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      const response = await axios.get("https://eldorado.gg/api/notifications/me", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Eldorado API Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/eldorado/offers", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      const response = await axios.get("https://www.eldorado.gg/api/v1/item-management/me/offers/me/search", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Authorization": `Bearer ${token}`,
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Eldorado Offers API Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch offers" });
    }
  });

  // New endpoint for images as requested by user
  app.get("/api/eldorado/my-offers-images", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
      const response = await axios.get("https://www.eldorado.gg/api/v1/item-management/me/offers/me/search", {
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Authorization": `Bearer ${token}`,
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
        },
      });

      const images = response.data.results.map((o: any) => ({
        id: o.id,
        image: o.mainOfferImage?.smallImage || o.offerImages?.[0]?.smallImage || o.mainOfferImage?.largeImage || null
      }));

      res.json(images);
    } catch (error: any) {
      console.error("My Offers Images Error:", error.response?.status, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch images" });
    }
  });

  app.get("/api/eldorado/my-predefined-offers", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
      const response = await axios.get("https://eldorado.gg/api/predefinedOffers/me", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Authorization": `Bearer ${token}`,
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("My Predefined Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch predefined offers" });
    }
  });

  app.get("/api/eldorado/predefined-offers", async (req, res) => {
    const cacheKey = `predefined:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    try {
      const response = await axios.get("https://eldorado.gg/api/predefinedOffers/game", {
        params: req.query,
        headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", "Accept": "application/json" },
      });
      setCached(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("Eldorado Predefined Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch predefined offers" });
    }
  });

  app.get("/api/eldorado/flexible-offers", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      const response = await axios.get("https://eldorado.gg/api/flexibleOffers/me/search", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Authorization": `Bearer ${token}`,
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Eldorado Flexible Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch flexible offers" });
    }
  });

  app.get("/api/eldorado/public-flexible-offers", async (req, res) => {
    const cacheKey = `pub-flex:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    try {
      const response = await axios.get("https://eldorado.gg/api/flexibleOffers", {
        params: req.query,
        headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", "Accept": "application/json" },
      });
      setCached(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      // 400 here is expected for game/category combos not supported by the flexible offers API
      if (error.response?.status !== 400) console.error("Eldorado Public Flexible Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch public flexible offers" });
    }
  });

  app.get("/api/eldorado/public-item-offers", async (req, res) => {
    const cacheKey = `pub-item:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    try {
      const response = await axios.get("https://eldorado.gg/api/v1/item-management/offers", {
        params: req.query,
        headers: { "User-Agent": "KrayonStore-Bot-25yJDXVwME", "Accept": "application/json" },
      });
      setCached(cacheKey, response.data);
      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status !== 400) console.error("Eldorado Public Item Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch public item offers" });
    }
  });

  app.put("/api/eldorado/offers/:offerId/details", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });

    const id = req.params.offerId;
    const { quantity, offerTitle, description, gameId, category, currentPrice, currentCurrency, guaranteedDeliveryTime, mainOfferImage, offerImages } = req.body;

    if (!mainOfferImage) {
      console.error('Stock update BLOCKED: mainOfferImage is missing from request body. Offer ID:', id);
      return res.status(400).json({ error: 'mainOfferImage is required but was not provided by the client.' });
    }

    // Correct body format per Swagger spec (nested under details/augmentedGame)
    const nestedBody: any = {
      details: {
        offerTitle: offerTitle || '',
        description: description ?? '',
        guaranteedDeliveryTime: guaranteedDeliveryTime || 'Instant',
        ...(mainOfferImage != null ? { mainOfferImage } : {}),
        ...(offerImages?.length ? { offerImages } : {}),
        pricing: {
          quantity: Number(quantity),
          minQuantity: 1,
          pricePerUnit: {
            amount: Number(currentPrice),
            currency: currentCurrency || 'USD',
          },
        },
      },
      augmentedGame: {
        gameId,
        category,
        offerAttributes: [],
      },
    };
    console.log('Stock update body:', JSON.stringify(nestedBody));
    console.log('  mainOfferImage received:', JSON.stringify(mainOfferImage));

    // Fetch XSRF token — required by Eldorado for all write operations on this endpoint
    const xsrf = await fetchXsrfToken(token);
    if (xsrf) console.log(`Stock update: XSRF token ready`);
    else console.warn(`Stock update: XSRF token unavailable — likely to get 403`);

    const cookieStr = xsrf
      ? `__Host-EldoradoIdToken=${token}; XSRF-TOKEN=${encodeURIComponent(xsrf)}`
      : `__Host-EldoradoIdToken=${token}`;

    const xsrfHdr: Record<string, string> = xsrf
      ? { "X-XSRF-TOKEN": xsrf, "RequestVerificationToken": xsrf }
      : {};

    // Plain headers — mirrors what works for price update
    const plain = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Cookie": cookieStr,
      "Accept": "application/json",
      ...xsrfHdr,
    };
    const plainBearer = { ...plain, "Authorization": `Bearer ${token}` };

    // With swagger headers (per API spec)
    const swag = {
      ...plain,
      "swagger": "Swager request",
      "Swagger": "Swager request",
      "X-Swagger": "Swagger request",
      "x-swagger": "Swager request",
    };
    const swagBearer = { ...swag, "Authorization": `Bearer ${token}` };

    const url = `https://www.eldorado.gg/api/v1/item-management/me/offers/item/${id}/details`;

    const attempts: { data: any; headers: any; ct: string; label: string }[] = [
      // No swagger, application/json — closest to working price update
      { data: nestedBody, headers: plain,      ct: 'application/json',            label: 'plain-cookie json' },
      { data: nestedBody, headers: plainBearer, ct: 'application/json',           label: 'plain-bearer json' },
      // No swagger, json-patch+json
      { data: nestedBody, headers: plain,      ct: 'application/json-patch+json', label: 'plain-cookie patch' },
      { data: nestedBody, headers: plainBearer, ct: 'application/json-patch+json', label: 'plain-bearer patch' },
      // With swagger headers, json-patch+json (per Swagger spec)
      { data: nestedBody, headers: swag,       ct: 'application/json-patch+json', label: 'swagger-cookie patch' },
      { data: nestedBody, headers: swagBearer, ct: 'application/json-patch+json', label: 'swagger-bearer patch' },
      // With swagger headers, json
      { data: nestedBody, headers: swag,       ct: 'application/json',            label: 'swagger-cookie json' },
      { data: nestedBody, headers: swagBearer, ct: 'application/json',            label: 'swagger-bearer json' },
    ];

    let lastError: any = null;
    for (const a of attempts) {
      try {
        console.log(`Stock PUT [${a.label}] /item/${id}/details`);
        const response = await axios.put(url, a.data, { headers: { ...a.headers, "Content-Type": a.ct } });
        console.log(`  ✓ ${response.status} — stock update succeeded`);
        return res.json(response.data ?? { ok: true });
      } catch (err: any) {
        const status = err.response?.status;
        const body   = JSON.stringify(err.response?.data);
        console.error(`  ✗ [${a.label}] ${status} — ${body}`);
        lastError = err;
      }
    }

    res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to update offer details" });
  });

  app.put("/api/eldorado/offers/:offerId/change-price", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });

    const id = req.params.offerId;
    const { amount, currency } = req.body;
    const body = { amount, currency };

    // No Origin/Referer — they trigger CSRF checks and cause 403.
    const cookieOnlyHeaders = {
      "User-Agent": "KrayonStore-Bot-25yJDXVwME",
      "Cookie": `__Host-EldoradoIdToken=${token}`,
      "Accept": "application/json",
    };
    const cookieBearerHeaders = {
      ...cookieOnlyHeaders,
      "Authorization": `Bearer ${token}`,
    };

    const fallbacks: { url: string; method: string; ct: string; headers: any; data?: any }[] = [
      // Cookie-only first (how the browser sends it — no Authorization header)
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${id}/price`, method: 'put', ct: 'application/json', headers: cookieOnlyHeaders },
      // Cookie + Bearer
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${id}/price`, method: 'put', ct: 'application/json', headers: cookieBearerHeaders },
      // Alternative endpoints
      { url: `https://eldorado.gg/api/predefinedOffersUser/me/${id}/changePrice`, method: 'put', ct: 'application/json', headers: cookieBearerHeaders },
      { url: `https://eldorado.gg/api/flexibleOffersUser/me/${id}/changePrice`,   method: 'put', ct: 'application/json', headers: cookieBearerHeaders },
      // Details endpoint with price body (last resort)
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/item/${id}/details`, method: 'put', ct: 'application/json', headers: cookieBearerHeaders, data: { pricePerUnit: { amount, currency } } },
    ];

    let lastError: any = null;
    for (const f of fallbacks) {
      try {
        console.log(`Price update: ${f.method.toUpperCase()} ${f.url}`);
        const response = await (axios as any)[f.method](f.url, f.data ?? body, {
          headers: { ...f.headers, "Content-Type": f.ct },
        });
        console.log(`  → SUCCESS ${response.status}`);
        return res.json(response.data);
      } catch (error: any) {
        lastError = error;
        console.error(`  → ${error.response?.status}`, JSON.stringify(error.response?.data));
      }
    }

    res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to update price" });
  });

  app.post("/api/eldorado/offers/:offerId/pause", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    
    const userHeaders = {
      "User-Agent": "KrayonStore-Bot-25yJDXVwME",
      "Authorization": `Bearer ${token}`
    };

    const fullHeaders = {
      ...userHeaders,
      "Cookie": `__Host-EldoradoIdToken=${token}`,
      "Accept": "application/json",
      "swagger": "Swager request",
      "Swagger": "Swager request",
      "X-Swagger": "Swagger request",
      "x-swagger": "Swager request"
    };

    const fallbacks = [
      // Primary: User's exact snippet logic
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/pause`, method: 'post', headers: userHeaders },
      // Fallbacks
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/pause`, method: 'post', contentType: 'application/json', headers: fullHeaders },
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/pause`, method: 'post', contentType: 'application/json-patch+json', headers: fullHeaders },
      { url: `https://eldorado.gg/api/predefinedOffersUser/me/${req.params.offerId}/pause`, method: 'put', contentType: 'application/json', headers: userHeaders },
      { url: `https://eldorado.gg/api/v1/item-management/me/offers/item/${req.params.offerId}/pause`, method: 'post', contentType: 'application/json', headers: fullHeaders },
      { url: `https://eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/pause`, method: 'put', contentType: 'application/json', headers: fullHeaders }
    ];

    let lastError = null;
    for (const fallback of fallbacks) {
      try {
        console.log(`Retrying pause with ${fallback.method.toUpperCase()} ${fallback.url}...`);
        const response = await (axios as any)[fallback.method](fallback.url, {}, { 
          headers: fallback.contentType ? { ...fallback.headers, "Content-Type": fallback.contentType } : fallback.headers
        });
        return res.json(response.data);
      } catch (retryError: any) {
        lastError = retryError;
        console.error(`Pause Fallback Error (${fallback.method}):`, retryError.response?.status, retryError.response?.data);
      }
    }
    
    res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to pause offer" });
  });

  app.post("/api/eldorado/offers/:offerId/resume", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    
    const userHeaders = {
      "User-Agent": "KrayonStore-Bot-25yJDXVwME",
      "Authorization": `Bearer ${token}`
    };

    const fullHeaders = {
      ...userHeaders,
      "Cookie": `__Host-EldoradoIdToken=${token}`,
      "Accept": "application/json",
      "swagger": "Swager request",
      "Swagger": "Swager request",
      "X-Swagger": "Swagger request",
      "x-swagger": "Swager request"
    };

    const fallbacks = [
      // Primary: User's exact snippet logic
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/resume`, method: 'post', headers: userHeaders },
      // Fallbacks
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/resume`, method: 'post', contentType: 'application/json', headers: fullHeaders },
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/resume`, method: 'post', contentType: 'application/json-patch+json', headers: fullHeaders },
      { url: `https://eldorado.gg/api/predefinedOffersUser/me/${req.params.offerId}/resume`, method: 'put', contentType: 'application/json', headers: userHeaders },
      { url: `https://eldorado.gg/api/v1/item-management/me/offers/item/${req.params.offerId}/resume`, method: 'post', contentType: 'application/json', headers: fullHeaders },
      { url: `https://eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/resume`, method: 'put', contentType: 'application/json', headers: fullHeaders }
    ];

    let lastError = null;
    for (const fallback of fallbacks) {
      try {
        console.log(`Retrying resume with ${fallback.method.toUpperCase()} ${fallback.url}...`);
        const response = await (axios as any)[fallback.method](fallback.url, {}, { 
          headers: fallback.contentType ? { ...fallback.headers, "Content-Type": fallback.contentType } : fallback.headers
        });
        return res.json(response.data);
      } catch (retryError: any) {
        lastError = retryError;
        console.error(`Resume Fallback Error (${fallback.method}):`, retryError.response?.status, retryError.response?.data);
      }
    }
    
    res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to resume offer" });
  });

  app.post("/api/eldorado/offers/game/:gameId/price", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
      const response = await axios.post(`https://www.eldorado.gg/api/v1/item-management/me/offers/game/${req.params.gameId}/price`, req.body, {
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Authorization": `Bearer ${token}`,
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
          "Content-Type": "application/json-patch+json",
          "swagger": "Swager request",
          "Swagger": "Swager request",
          "X-Swagger": "Swagger request",
          "x-swagger": "Swager request"
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Bulk Price Error:", error.response?.status, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to update bulk price" });
    }
  });

  app.post("/api/eldorado/offers/item", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
      const response = await axios.post(`https://www.eldorado.gg/api/v1/item-management/me/offers/item`, req.body, {
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Authorization": `Bearer ${token}`,
          "Cookie": `__Host-EldoradoIdToken=${token}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "swagger": "Swager request",
          "Swagger": "Swager request",
          "X-Swagger": "Swagger request",
          "x-swagger": "Swager request"
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Create Item Error:", error.response?.status, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to create/update item offer" });
    }
  });

  // ── Gameflip ────────────────────────────────────────────────────────────
  function gfCreds(req: express.Request) {
    const key = (req.headers["x-gf-key"] as string)?.trim();
    const secret = (req.headers["x-gf-secret"] as string)?.trim();
    return key && secret ? { key, secret } : null;
  }

  app.get("/api/gameflip/me", async (req, res) => {
    const c = gfCreds(req);
    if (!c) return res.status(401).json({ error: "No Gameflip credentials" });
    // Debug: log the auth header being sent (first 20 chars of secret masked)
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
    const ops: { op: string; path: string; value: any }[] = req.body;

    const fetchStatus = async () => {
      const cur = await gfRequest('get', url, c.key, c.secret);
      const status = cur.data?.data?.status ?? cur.data?.status;
      console.log(`[GF GET] status=${status}`);
      return status as string | undefined;
    };

    let listingStatus: string | undefined;
    try { listingStatus = await fetchStatus(); } catch {}

    const doPatchOps = async (patchOps: any[]) =>
      gfRequest('patch', url, c.key, c.secret, {
        data: patchOps,
        headers: { "Content-Type": "application/json-patch+json" },
      });

    console.log(`[GF PATCH] listingStatus=${listingStatus} body=${JSON.stringify(ops)}`);

    const doCycle = async () => {
      console.log(`[GF PATCH] cycling status: ready → patch → onsale`);
      await doPatchOps([{ op: 'replace', path: '/status', value: 'ready' }]);
      await doPatchOps(ops);
      const final = await doPatchOps([{ op: 'replace', path: '/status', value: 'onsale' }]);
      console.log(`[GF PATCH] cycle success`);
      return res.json(final.data);
    };

    try {
      if (listingStatus === 'onsale') {
        return await doCycle();
      }
      const r = await doPatchOps(ops);
      console.log(`[GF PATCH] success`);
      return res.json(r.data);
    } catch (e: any) {
      const msg: string = e.response?.data?.error?.message || '';
      if (e.response?.status === 400 && msg.includes('onsale')) {
        try { return await doCycle(); } catch (e2: any) {
          console.error(`[GF PATCH] cycle failed`, JSON.stringify(e2.response?.data));
          return res.status(e2.response?.status || 500).json(e2.response?.data || { error: 'Failed during status cycle' });
        }
      }
      console.error(`[GF PATCH] FAIL ${e.response?.status}`, JSON.stringify(e.response?.data));
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

  // ── ZeusX routes ────────────────────────────────────────────────────────────
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
      const sales = r.data?.data?.sales ?? [];
      console.log(`[ZX LISTINGS] pageIndex=${pageIndex} → ${sales.length} items, total=${r.data?.data?.pagination?.totalRecords}`);
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
    console.log(`[ZX PUT] id=${req.params.id} cf_len=${cf.length} body=${JSON.stringify(req.body)}`);
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      // Prefer fullOffer sent by the frontend (fetched in browser with correct cf_clearance/IP).
      // Fall back to server-side GET only if it wasn't provided.
      let full: any = req.body._fullOffer;
      if (!full || typeof full !== 'object' || !full.id) {
        console.log(`[ZX PUT] no _fullOffer in body, fetching from ZeusX...`);
        const offerRes = await axios.get(`${ZX_BASE}/offer/${req.params.id}`, { headers: zxHeaders(token, cf) });
        full = offerRes.data?.data;
        if (!full || typeof full !== 'object' || !full.id) {
          console.error('[ZX PUT] GET returned non-offer data:', JSON.stringify(offerRes.data).slice(0, 300));
          return res.status(502).json({ error: 'Could not fetch offer from ZeusX. Update cf_clearance and try again.' });
        }
      }
      console.log(`[ZX PUT] full keys: ${Object.keys(full).join(', ')}`);
      console.log(`[ZX PUT] sc_id=${full.service_category_id} sc=${full.service_category} scb_id=${full.service_category_base_id} game=${full.game_id} price=${full.listed_price} qty=${full.quantity}`);
      const resolvedScId = full.service_category_id || full.service_category || full.service_category_base_id;
      if (!resolvedScId) console.warn('[ZX PUT] WARNING: could not resolve service_category_id');
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
      console.log(`[ZX PUT] sending offer (service_category_id=${offer.service_category_id} price=${offer.listed_price} qty=${offer.quantity})`);
      console.log(`[ZX PUT] offer JSON:`, JSON.stringify({ offer }).slice(0, 800));
      const r = await axios.put(`${ZX_BASE}/offer/${req.params.id}/update`, { offer }, { headers: zxHeaders(token, cf) });
      console.log(`[ZX PUT] success:`, r.data?.status);
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

  // ── G2G routes ────────────────────────────────────────────────────────────────
  const G2G_BASE = 'https://open-api.g2g.com/v2';

  function g2gCreds(req: express.Request) {
    const key = (req.headers['x-g2g-key'] as string || '').trim();
    const secret = (req.headers['x-g2g-secret'] as string || '').trim();
    const user = (req.headers['x-g2g-user'] as string || '').trim();
    return key && secret ? { key, secret, user } : null;
  }

  function g2gSign(urlPath: string, key: string, secret: string, user: string) {
    const timestamp = Date.now();
    const canonical = urlPath + key + user + String(timestamp);
    const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
    return {
      'g2g-api-key': key,
      'g2g-userid': user,
      'g2g-signature': signature,
      'g2g-timestamp': String(timestamp),
      'Content-Type': 'application/json',
    };
  }

  app.get('/api/g2g/me', async (req, res) => {
    const c = g2gCreds(req);
    if (!c) return res.status(401).json({ error: 'No G2G credentials' });
    try {
      const urlPath = '/v2/store';
      const r = await axios.get(`${G2G_BASE}/store`, { headers: g2gSign(urlPath, c.key, c.secret, c.user) });
      console.log('[G2G /me] payload keys:', Object.keys(r.data?.payload || {}));
      res.json(r.data);
    } catch (e: any) {
      console.error('[G2G /me]', e.response?.status, JSON.stringify(e.response?.data));
      res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' });
    }
  });

  const G2G_BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.g2g.com',
    'Referer': 'https://www.g2g.com/offers/list',
  };

  app.get('/api/g2g/offers', async (req, res) => {
    const c = g2gCreds(req);
    if (!c) return res.status(401).json({ error: 'No G2G credentials' });
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.page_size) || 48;
    const status = (req.query.status as string) || 'live';

    // 1. sls.g2g.com FIRST — returns offer_title_collection_tree needed for images + market search
    if (c.user) {
      const slsParams: any = { seller_id: c.user, status, page, page_size: pageSize };
      for (const url of ['https://sls.g2g.com/offer/search', 'https://sls.g2g.com/offer/list']) {
        try {
          console.log(`[G2G offers] trying ${url} seller_id=${c.user}`);
          const r = await axios.get(url, { headers: G2G_BROWSER_HEADERS, params: slsParams, timeout: 8000 });
          const results: any[] = r.data?.payload?.results ?? [];
          console.log(`[G2G offers] ${url} → code=${r.data?.code} results=${results.length}`);
          if ((r.data?.code === 2000 || r.data?.code === '2000') && results.length > 0) return res.json(r.data);
        } catch (e: any) {
          console.log(`[G2G offers] ${url} failed: ${e.response?.status || e.message}`);
        }
      }
    }

    // 2. Fallback: Open API POST /v2/offers/search
    try {
      const urlPath = '/v2/offers/search';
      const body: any = { filter: { status }, page_size: pageSize, page };
      if (c.user) body.filter.seller_id = c.user;
      console.log(`[G2G offers] Open API POST body=${JSON.stringify(body)}`);
      const r = await axios.post(`${G2G_BASE}/offers/search`, body, {
        headers: { ...g2gSign(urlPath, c.key, c.secret, c.user), 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      const results: any[] = r.data?.payload?.results ?? [];
      console.log(`[G2G offers] Open API → code=${r.data?.code} results=${results.length}`);
      return res.json({ code: 2000, payload: { results, total_result: results.length } });
    } catch (e: any) {
      console.log(`[G2G offers] Open API failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
    }

    res.status(502).json({ error: 'Could not load G2G offers — check server log for details' });
  });

  app.get('/api/g2g/market', async (req, res) => {
    const fa = (req.query.fa as string || '').trim();
    const q = (req.query.q as string || '').trim();
    const brand_id = (req.query.brand_id as string || '').trim();

    // Try sls.g2g.com with exact fa filter (most precise)
    if (fa) {
      try {
        const params: any = { fa, status: 'live', page: 1, page_size: 48 };
        if (q) params.q = q;
        console.log(`[G2G market] sls fa=${fa} q=${q}`);
        const r = await axios.get('https://sls.g2g.com/offer/search', { headers: G2G_BROWSER_HEADERS, params, timeout: 10000 });
        const results = r.data?.payload?.results ?? [];
        console.log(`[G2G market] sls → ${results.length} results`);
        if (r.data?.code === 2000 || r.data?.code === '2000') return res.json(r.data);
      } catch (e: any) {
        console.log(`[G2G market] sls failed: ${e.response?.status || e.message}`);
      }
    }

    // Fallback: Open API keyword search
    if (brand_id || q) {
      try {
        const body: any = { filter: { status: 'live' }, page_size: 48, page: 1 };
        if (brand_id) body.filter.brand_id = brand_id;
        if (q) body.filter.query = q;
        console.log(`[G2G market] Open API body=${JSON.stringify(body)}`);
        const r = await axios.post(`${G2G_BASE}/offers/search`, body, {
          headers: { 'Content-Type': 'application/json' }, timeout: 10000,
        });
        const results = r.data?.payload?.results ?? [];
        console.log(`[G2G market] Open API → ${results.length} results`);
        return res.json({ code: 2000, payload: { results } });
      } catch (e: any) {
        console.log(`[G2G market] Open API failed: ${e.response?.status || e.message}`);
      }
    }

    res.status(502).json({ error: 'Could not load market prices' });
  });

  // sls.g2g.com offer routes (JWT-authenticated, mirrors G2G website)
  const slsJwtHeaders = (jwt: string) => ({
    ...G2G_BROWSER_HEADERS,
    'authorization': jwt,
    'Content-Type': 'application/json',
  });

  app.get('/api/g2g/offer-sls/:id', async (req, res) => {
    const jwt = (req.headers['x-g2g-jwt'] as string || '').trim();
    try {
      const r = await axios.get(`https://sls.g2g.com/offer/${req.params.id}`, {
        headers: jwt ? slsJwtHeaders(jwt) : G2G_BROWSER_HEADERS,
        timeout: 8000,
      });
      res.json(r.data);
    } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' }); }
  });

  app.patch('/api/g2g/offer-sls/:id', async (req, res) => {
    const jwt = (req.headers['x-g2g-jwt'] as string || '').trim();
    if (!jwt) return res.status(401).json({ error: 'G2G session token required (x-g2g-jwt)' });
    console.log(`[G2G SLS PATCH] /offer/${req.params.id} body=${JSON.stringify(req.body)}`);
    try {
      const r = await axios.patch(`https://sls.g2g.com/offer/${req.params.id}`, req.body, {
        headers: slsJwtHeaders(jwt),
        timeout: 10000,
      });
      console.log(`[G2G SLS PATCH] ${r.status} code=${r.data?.code}`);
      res.json(r.data);
    } catch (e: any) {
      console.error(`[G2G SLS PATCH] ${e.response?.status}`, JSON.stringify(e.response?.data));
      res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' });
    }
  });

  app.get('/api/g2g/offer/:id', async (req, res) => {
    const c = g2gCreds(req);
    if (!c) return res.status(401).json({ error: 'No G2G credentials' });
    try {
      const urlPath = `/v2/offers/${req.params.id}`;
      const r = await axios.get(`${G2G_BASE}/offers/${req.params.id}`, { headers: g2gSign(urlPath, c.key, c.secret, c.user) });
      res.json(r.data);
    } catch (e: any) { res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' }); }
  });

  app.patch('/api/g2g/offer/:id', async (req, res) => {
    const c = g2gCreds(req);
    if (!c) return res.status(401).json({ error: 'No G2G credentials' });
    try {
      const urlPath = `/v2/offers/${req.params.id}`;
      console.log(`[G2G PATCH] ${urlPath} body=${JSON.stringify(req.body)}`);
      const r = await axios.patch(`${G2G_BASE}/offers/${req.params.id}`, req.body, { headers: g2gSign(urlPath, c.key, c.secret, c.user) });
      console.log(`[G2G PATCH] success ${r.status}`);
      res.json(r.data);
    } catch (e: any) {
      console.error(`[G2G PATCH] ${e.response?.status}`, JSON.stringify(e.response?.data));
      res.status(e.response?.status || 500).json(e.response?.data || { error: 'Failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
