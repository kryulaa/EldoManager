import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

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
