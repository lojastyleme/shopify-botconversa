const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

// ======================================================
// 1. Buscar detalhes do produto (metafields → descriptionHtml)
// ======================================================
app.post("/product/details", async (req, res) => {
  try {
    const { product_handle } = req.body;
    const url = `${SHOPIFY_STORE_URL}/admin/api/2023-07/products.json?handle=${product_handle}`;

    const { data } = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!data.products || data.products.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const product = data.products[0];
    const descriptionHtml = product.body_html || "";

    // Extrair medidas, tecido e composição se estiverem no descriptionHtml
    const medidas = descriptionHtml.match(/Medidas:(.*?)<\/p>/i)?.[1]?.trim() || null;
    const tecido = descriptionHtml.match(/Tecido:(.*?)<\/p>/i)?.[1]?.trim() || null;
    const composicao = descriptionHtml.match(/Composição:(.*?)<\/p>/i)?.[1]?.trim() || null;

    res.json({
      title: product.title,
      price: product.variants[0].price,
      medidas,
      tecido,
      composicao,
      size_chart_url: null, // Pode buscar de metafield específico se quiser
      variants: product.variants.map(v => ({
        id: v.id,
        title: v.title,
        available: v.available
      })),
      product_url: `https://${SHOPIFY_STORE_URL.split("//")[1]}/products/${product_handle}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================================================
// 2. Simular frete (CBB Shipping Rates)
// ======================================================
app.post("/cart/preview", async (req, res) => {
  try {
    const { variantId, zip } = req.body;

    // Essa chamada é fictícia porque o CBB Shipping Rates não expõe API pública
    // Aqui você precisaria simular o "add to cart" e pegar o frete via Storefront API
    // ou via método interno do app (se disponível)
    // Exemplo abaixo é simulação
    res.json({
      prontaEntrega: true, // Ou false se for por encomenda
      options: [
        { carrier: "Correios PAC", deadline: 5, price: "R$ 25,00" },
        { carrier: "Sedex", deadline: 2, price: "R$ 39,00" }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================================================
// 3. Buscar pedido e rastreio
// ======================================================
app.post("/order/find", async (req, res) => {
  try {
    const { order_number, email } = req.body;
    const url = `${SHOPIFY_STORE_URL}/admin/api/2023-07/orders.json?name=${order_number}&email=${email}`;

    const { data } = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!data.orders || data.orders.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const order = data.orders[0];
    const fulfillment = order.fulfillments && order.fulfillments.length > 0 ? order.fulfillments[0] : {};

    res.json({
      tracking_company: fulfillment.tracking_company || null,
      tracking_number: fulfillment.tracking_number || null,
      tracking_url: fulfillment.tracking_url || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
