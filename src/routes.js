import express from "express";
import { getAllProducts, getUpdatedProducts, saveInventoryItemId } from "./db.js";
import { getProductInventoryItem, updateInventoryLevel } from "./shopify.js";

const router = express.Router();

/**
 * ✅ Endpoint de prueba: listar productos modificados en las últimas X horas
 * Ejemplo: GET /test-db-updated?hours=2
 */
router.get("/test-db-updated", async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 2;
        const products = await getUpdatedProducts(hours);
        res.json({ updated: products });
    } catch (error) {
        console.error("Error en test-db-updated:", error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 🔄 1. Sincronizar TODOS los productos
 * GET /sync-all
 */
router.get("/sync-all", async (req, res) => {
    try {
        const products = await getAllProducts();
        if (!products.length) {
            return res.json({ message: "No hay productos en la base de datos." });
        }

        const results = [];

        for (const product of products) {
            let inventoryItemId = product.inventory_item_id;

            // 👉 Si no existe en la DB, lo buscamos en Shopify
            if (!inventoryItemId) {
                const item = await getProductInventoryItem(product.sku);
                if (!item) {
                    results.push({ sku: product.sku, status: "❌ No encontrado en Shopify" });
                    continue;
                }
                inventoryItemId = item.inventory_item_id;

                // 👉 Guardamos en la DB para futuras sincronizaciones
                await saveInventoryItemId(product.sku, inventoryItemId);
            }

            // 👉 Actualizamos stock en Shopify
            await updateInventoryLevel(
                inventoryItemId,
                process.env.SHOPIFY_LOCATION_ID,
                product.stock
            );

            results.push({ sku: product.sku, status: "✅ Sincronizado", stock: product.stock });
        }

        res.json({ synced: results });
    } catch (error) {
        console.error("Error en sync-all:", error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * ⏱️ 2. Sincronizar SOLO productos modificados en las últimas X horas
 * GET /sync-updated?hours=6
 */
router.get("/sync-updated", async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const products = await getUpdatedProducts(hours);

        if (!products.length) {
            return res.json({ message: `No hay productos modificados en las últimas ${hours} horas.` });
        }

        const results = [];

        for (const product of products) {
            let inventoryItemId = product.inventory_item_id;

            // 👉 Buscar en Shopify si no tenemos inventory_item_id
            if (!inventoryItemId) {
                const item = await getProductInventoryItem(product.sku);
                if (!item) {
                    results.push({ sku: product.sku, status: "❌ No encontrado en Shopify" });
                    continue;
                }
                inventoryItemId = item.inventory_item_id;
                await saveInventoryItemId(product.sku, inventoryItemId);
            }

            // 👉 Actualizar en Shopify
            await updateInventoryLevel(
                inventoryItemId,
                process.env.SHOPIFY_LOCATION_ID,
                product.stock
            );

            results.push({
                sku: product.sku,
                status: "✅ Sincronizado",
                stock: product.stock,
                time_stamp: product.time_stamp
            });
        }

        res.json({ synced: results });
    } catch (error) {
        console.error("Error en sync-updated:", error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
