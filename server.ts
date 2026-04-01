import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

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

  app.get("/api/eldorado/predefined-offers", async (req, res) => {
    try {
      const response = await axios.get("https://eldorado.gg/api/predefinedOffers/game", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Accept": "application/json",
        },
      });
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
    try {
      const response = await axios.get("https://eldorado.gg/api/flexibleOffers", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Accept": "application/json",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Eldorado Public Flexible Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch public flexible offers" });
    }
  });

  app.get("/api/eldorado/public-item-offers", async (req, res) => {
    try {
      const response = await axios.get("https://eldorado.gg/api/v1/item-management/offers", {
        params: req.query,
        headers: {
          "User-Agent": "KrayonStore-Bot-25yJDXVwME",
          "Accept": "application/json",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Eldorado Public Item Offers Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to fetch public item offers" });
    }
  });

  app.put("/api/eldorado/offers/:offerId/details", async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const headers = {
      "User-Agent": "KrayonStore-Bot-25yJDXVwME",
      "Authorization": `Bearer ${token}`,
      "Cookie": `__Host-EldoradoIdToken=${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "swagger": "Swager request",
      "Swagger": "Swager request"
    };

    try {
      // Try PUT first as it's standard for details update
      const response = await axios.put(`https://eldorado.gg/api/v1/item-management/me/offers/item/${req.params.offerId}/details`, req.body, { headers });
      res.json(response.data);
    } catch (error: any) {
      console.error("Update Details Error (PUT):", error.response?.status, error.response?.data);
      
      // Fallback to POST if PUT is not allowed or fails
      try {
        console.log("Retrying update details with POST...");
        const response = await axios.post(`https://eldorado.gg/api/v1/item-management/me/offers/item/${req.params.offerId}/details`, req.body, { headers });
        return res.json(response.data);
      } catch (postError: any) {
        console.error("Update Details Error (POST):", postError.response?.status, postError.response?.data);
        res.status(postError.response?.status || 500).json(postError.response?.data || { error: "Failed to update offer" });
      }
    }
  });

  // New endpoints for Predefined and Flexible offers based on user documentation
  app.put("/api/eldorado/offers/:offerId/change-price", async (req, res) => {
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

    const { amount, currency } = req.body;
    const body = { amount, currency };

    const fallbacks = [
      // Primary: User's exact snippet logic
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/price`, method: 'put', contentType: 'application/json', headers: userHeaders },
      // Fallbacks with more headers
      { url: `https://www.eldorado.gg/api/v1/item-management/me/offers/${req.params.offerId}/price`, method: 'put', contentType: 'application/json', headers: fullHeaders },
      { url: `https://eldorado.gg/api/predefinedOffersUser/me/${req.params.offerId}/changePrice`, method: 'put', contentType: 'application/json', headers: userHeaders },
      { url: `https://eldorado.gg/api/predefinedOffersUser/me/${req.params.offerId}/changePrice`, method: 'put', contentType: 'application/json-patch+json', headers: fullHeaders },
      { url: `https://eldorado.gg/api/flexibleOffersUser/me/${req.params.offerId}/changePrice`, method: 'put', contentType: 'application/json', headers: userHeaders },
      { url: `https://eldorado.gg/api/v1/item-management/me/offers/item/${req.params.offerId}/details`, method: 'put', contentType: 'application/json', headers: fullHeaders, data: { pricePerUnit: { amount, currency } } }
    ];

    let lastError = null;
    for (const fallback of fallbacks) {
      try {
        console.log(`Trying price update: ${fallback.method.toUpperCase()} ${fallback.url} (${fallback.contentType})`);
        const response = await (axios as any)[fallback.method](fallback.url, fallback.data || body, { 
          headers: { ...fallback.headers, "Content-Type": fallback.contentType } 
        });
        return res.json(response.data);
      } catch (error: any) {
        lastError = error;
        console.error(`Price Update Failed for ${fallback.url}:`, error.response?.status, error.response?.data);
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
