import axios from "axios";

const shopifyApi = axios.create({
    baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
    headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
});

// Update stock in a variant (inventory_item_id)
export async function updateInventoryLevel(inventoryItemId, locationId, available) {
    console.log('SHOPIFY_STORE_URL', process.env.SHOPIFY_STORE_URL);
    console.log('SHOPIFY_ACCESS_TOKEN', process.env.SHOPIFY_ACCESS_TOKEN);
    console.log('URL', `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`);
    const res = await shopifyApi.post("/inventory_levels/set.json", {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available
    });
    console.log('res', res);
    return res.data;
}
