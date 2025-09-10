import express from "express";
import { getAllProducts, saveInventoryItemId } from "./db.js";
import { updateInventoryLevel } from "./shopify.js";
import shopifyApi from "./shopify.js";

const router = express.Router();

// 🏓 Test
router.get("/ping", (req, res) => {
    res.json({ message: "pong 🏓" });
});

// 🗄️ Test DB
router.get("/test-db", async (req, res) => {
    try {
        const products = await getAllProducts();
        res.json({ success: true, products });
    } catch (error) {
        console.error("DB error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔄 Sincronización optimizada
router.get("/sync-inventory", async (req, res) => {
    try {
        const products = await getAllProducts();
        const updates = [];

        for (const row of products) {
            try {
                let inventoryItemId = row.inventory_item_id;

                // 1. Buscar inventory_item_id en Shopify si no está guardado
                if (!inventoryItemId) {
                    const searchRes = await shopifyApi.get(`/products.json?limit=250`);
                    const products = searchRes.data.products;

                    let variantFound = null;
                    for (const product of products) {
                        const variant = product.variants.find((v) => v.sku === row.sku);
                        if (variant) {
                            variantFound = variant;
                            break;
                        }
                    }

                    if (!variantFound) {
                        console.warn(`❌ SKU no encontrado en Shopify: ${row.sku}`);
                        updates.push({ sku: row.sku, updated: false, reason: "SKU no encontrado" });
                        continue;
                    }

                    inventoryItemId = variantFound.inventory_item_id;

                    // Guardamos en DB para la próxima sincronización
                    await saveInventoryItemId(row.sku, inventoryItemId);
                    console.log(`✅ Guardado inventory_item_id para SKU ${row.sku}`);
                }

                // 2. Actualizar inventario en Shopify
                const updateRes = await updateInventoryLevel(
                    inventoryItemId,
                    process.env.SHOPIFY_LOCATION_ID,
                    row.stock
                );

                updates.push({ sku: row.sku, updated: true, result: updateRes });
            } catch (err) {
                console.error(`Error con SKU ${row.sku}:`, err.response?.data || err.message);
                updates.push({ sku: row.sku, updated: false });
            }
        }

        res.json({ success: true, updates });
    } catch (error) {
        console.error("Sync error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
