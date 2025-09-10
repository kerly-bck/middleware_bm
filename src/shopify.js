import axios from "axios";

const shopifyApi = axios.create({
    baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
    headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
    },
});

// Get inventory_item_id de un producto (y sus variantes)
export async function getProductInventoryItem(productId) {
    const res = await shopifyApi.get(`/products/${productId}.json`);
    const product = res.data.product;

    return product.variants.map((v) => ({
        variant_id: v.id,
        sku: v.sku,
        inventory_item_id: v.inventory_item_id,
    }));
}

// Update shopify stock
export async function updateInventoryLevel(inventoryItemId, locationId, available) {
    const res = await shopifyApi.post(`/inventory_levels/set.json`, {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available,
    });
    return res.data;
}

export default shopifyApi;
