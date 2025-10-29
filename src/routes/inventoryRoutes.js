import express from "express";
import {getAllProductsPrices, getProductsBatch, getUpdatedProducts, saveInventoryItemId} from "../db.js";
import {
    shopifyApi,
    getProductInventoryItem,
    updateInventoryLevel,
    updateShopifyVariantPrice,
    updateAffiliatePriceMetafield, getVariantIdBySKU, getProductInventoryItem1, getProductInventoryItem9
} from "../shopify.js";

const router = express.Router();

// Endpoint list updated products in the last 2 hours
// GET /db-updated-products?hours=21
router.get("/db-updated-products", async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 2;
        const products = await getUpdatedProducts(hours);
        res.json({ updated: products });
    } catch (error) {
        console.error("Error en test-db-updated:", error.message);
        res.status(500).json({ error: error.message });
    }
});


// Sync all products
// GET /sync-all
router.get("/sync-all", async (req, res) => {
    try {
        const batchSize = 200;
        let offset = 0;
        let totalProcessed = 0;
        const results = [];

        while (true) {
            const products = await getProductsBatch(offset, batchSize);
            if (products.length === 0) break;

            console.log(`Procesando batch desde ${offset} (${products.length} registros)`);

            for (const product of products) {
                let inventoryItemId = product.inventory_item_id;

                try {
                    if (!inventoryItemId) {
                        const item = await getProductInventoryItem(product.sku);
                        if (!item) {
                            results.push({ sku: product.sku, status: "❌ No encontrado en Shopify" });
                            continue;
                        }

                        inventoryItemId = item.inventory_item_id;
                        await saveInventoryItemId(product.sku, inventoryItemId);
                    }

                    await updateInventoryLevel(
                        inventoryItemId,
                        process.env.SHOPIFY_LOCATION_ID,
                        product.stock
                    );

                    results.push({ sku: product.sku, status: "✅ Sincronizado", stock: product.stock });
                } catch (error) {
                    console.error(`Error procesando SKU ${product.sku}:`, error.message);
                    results.push({ sku: product.sku, status: `❌ Error: ${error.message}` });
                }
            }

            totalProcessed += products.length;
            offset += batchSize;

            // Pausa ligera para evitar rate limit de Shopify
            await new Promise((resolve) => setTimeout(resolve, 2000));
            break;
        }

        res.json({ message: "Sincronización completada", totalProcessed, results });
    } catch (error) {
        console.error("Error en sync-all:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Sync only updated products in last X hours
// GET /sync-updated?hours=6
router.get("/sync-updated", async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const products = await getUpdatedProducts(hours);

        const results = [];

        for (const product of products) {
            let inventoryItemId = product.inventory_item_id;

            if (!inventoryItemId) {
                const item = await getProductInventoryItem(product.sku);
                if (!item) {
                    results.push({
                        sku: product.sku,
                        status: "❌ No encontrado en Shopify"
                    });
                    continue;
                }
                inventoryItemId = item.inventory_item_id;
                console.log('inventoryItemId 0', inventoryItemId);
                await saveInventoryItemId(product.sku, inventoryItemId);
            }

            console.log('inventoryItemId 1', inventoryItemId);

            console.log("Request Shopify:", {
                location_id: product.tienda,
                inventory_item_id: inventoryItemId,
                available: product.stock
            });

            // Usamos product.tienda como location_id dinámico
            await updateInventoryLevel(inventoryItemId, product.tienda, product.stock);

            results.push({
                sku: product.sku,
                status: "✅ Sincronizado",
                stock: product.stock,
                location_id: product.tienda,
                time_stamp: product.time_stamp
            });
        }

        res.json({ synced: results });
    } catch (error) {
        console.error("Error en sync-updated:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Test Shopify Endpoint
router.get("/test-shopify", async (req, res) => {
    try {
        const response = await shopifyApi.get("/products.json?limit=3");
        res.json({
            success: true,
            products: response.data.products
        });
    } catch (error) {
        console.error("Error Shopify:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });
    }
});

router.get("/sync-all-prices", async (req, res) => {
    const limit = parseInt(req.query.limit) || 500;
    let currentOffset = parseInt(req.query.offset) || 0;
    let isRunning = false;
    if (isRunning) {
        return res.status(409).json({ message: "Ya hay una sincronización en curso" });
    }

    isRunning = true;
    try {
        console.log("🔄 Iniciando sincronización masiva de precios...");

        while (true) {
            const products = await getAllProductsPrices(limit, currentOffset);
            // 1️⃣ Traer lote desde MySQL
      //       const [products] = await db.query(`
      //   SELECT sku, precio_normal, precio_afiliado
      //   FROM product_prices
      //   WHERE sku IS NOT NULL
      //   LIMIT ${BATCH_SIZE} OFFSET ${currentOffset};
      // `);

            if (products.length === 0) {
                console.log("✅ Sincronización completada: no hay más productos.");
                currentOffset = 0;
                break;
            }

            console.log(`🟡 Procesando ${products.length} productos (offset ${currentOffset})`);

            for (const p of products) {
                try {
                    const variant = await getVariantIdBySKU(p.SKU);

                    if (!variant) {
                        console.log(`⚠️ No encontrada variant válida para SKU ${p.SKU}`);
                        continue;
                    }

                    // 3️⃣ Actualizar precio normal
                    await updateShopifyVariantPrice(variant.id, p.pvp);

                    // 4️⃣ Actualizar metafield afiliado
                    await updateAffiliatePriceMetafield(variant.id, p.pvp_afi);

                    console.log(`✅ SKU ${p.SKU} actualizado correctamente`);
                } catch (err) {
                    console.error(
                        `❌ Error al actualizar SKU ${p.SKU}:`,
                        err.response?.data || err.message
                    );
                }
            }

            // 5️⃣ Avanzar el offset
            currentOffset += limit
            ;
            console.log(`➡️ Avanzando al siguiente lote. Nuevo offset: ${currentOffset}`);
        }

        res.json({ success: true, message: "Sincronización de precios completada." });
    } catch (err) {
        console.error("❌ Error general:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        isRunning = false;
    }
});

router.get("/sync-prices-batch", async (req, res) => {
    const limit = parseInt(req.query.limit) || 500;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const products = await getAllProductsPrices(limit, offset);
        console.log(`🟡 Procesando ${products.length} productos (offset ${offset})`);

        let updated = 0;

        for (const p of products) {
            // let variantId = p.variant_id;
            //     variantId = await getProductInventoryItem(p.SKU);

            // Buscar variant_id si no está
            // if (!variantId) {
            //     // variantId = await getVariantIdBySKU(p.SKU);
            //     variantId = await getProductInventoryItem(p.SKU);
            //     // if (variantId) {
            //     //     await connection.query(`UPDATE product_prices SET variant_id = ? WHERE sku = ?`, [variantId, p.SKU]);
            //     // } else {
            //     //     console.warn(`⚠️ No se encontró variant para SKU: ${p.sku}`);
            //     //     continue;
            //     // }
            // }
            const shopifyProduct = await getProductInventoryItem9(p.SKU);
            if (!shopifyProduct) {
                results.push({
                    sku: p.SKU,
                    status: "❌ No encontrado en Shopify",
                });
                continue;
            }
            let variantId = shopifyProduct.variant_id;
            // console.log('variantId', variantId)

            // Actualizar precios
            await updateShopifyVariantPrice(variantId, p.pvp);
            await new Promise(r => setTimeout(r, 700));
            await updateAffiliatePriceMetafield(variantId, p.pvp_afi);

            updated++;
        }

        // Preparar siguiente lote
        const nextOffset = products.length < limit ? null : offset + limit;

        res.json({
            success: true,
            processed: products.length,
            updated,
            nextOffset,
        });
    } catch (error) {
        console.error("❌ Error en /sync-prices-batch:", error);
        res.status(500).json({ error: error.message });
    }
});


export default router;
