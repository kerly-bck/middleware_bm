import express from "express";
import { getTestProduct } from "./db.js";
import { updateInventoryLevel, shopifyApi } from "./shopify.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const app = express();
app.use(express.json());

// Endpoint de prueba
app.get("/ping", (req, res) => res.send("pong"));

// Sync test inventory
app.get("/sync-inventory", async (req, res) => {
    try {
        // 1. Get product from MySQL
        const product = await getTestProduct();
        console.log('Producto', product);

        // 2. Update shopify stock
        const shopifyInventoryItemId = process.env.TEST_INVENTORY_ITEM_ID;
        console.log('TEST_INVENTORY_ITEM_ID', process.env.TEST_INVENTORY_ITEM_ID);
        console.log('LOCATION_ID', process.env.LOCATION_ID);
        console.log('product.stock', product.stock);
        const response = await updateInventoryLevel(
            shopifyInventoryItemId,
            process.env.LOCATION_ID,
            product.stock
        );
        res.json({
            message: "Sync inventory",
            mysqlProduct: product,
            shopifyResponse: response
        });
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de prueba Shopify
// app.get("/test-shopify", async (req, res) => {
//     try {
//         console.log('SHOPIFY_STORE_URL', process.env.SHOPIFY_STORE_URL);
//         console.log('SHOPIFY_ACCESS_TOKEN', process.env.SHOPIFY_ACCESS_TOKEN);
//         console.log('URL', `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`);
//         const response = await shopifyApi.get("/products.json?limit=1");
//         res.json({
//             success: true,
//             products: response.data.products
//         });
//     } catch (error) {
//         console.error("Error Shopify:", error.response?.data || error.message);
//         res.status(500).json({
//             success: false,
//             error: error.response?.data || error.message
//         });
//     }
// });

// const PORT = process.env.PORT || 3000;
// if (process.env.NODE_ENV !== "production") {
//     app.listen(PORT, () => {
//         console.log(process.env.DB_NAME);
//         console.log(`Server running on http://localhost:${PORT}`);
//     });
// }

export default app;
