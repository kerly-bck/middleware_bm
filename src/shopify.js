import axios from "axios";

const shopifyApi = axios.create({
    baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
    headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
    },
});

export async function getProductInventoryItem(sku) {
    try {
        // Buscar variantes filtrando por SKU
        const res = await shopifyApi.get(`/variants.json?sku=${encodeURIComponent(sku)}`);

        if (res.data.variants && res.data.variants.length > 0) {
            const variant = res.data.variants[0]; // primera coincidencia
            return variant.inventory_item_id;     // ID que necesitamos para stock
        }

        console.error(`No se encontró producto con SKU ${sku}`);
        return null;
    } catch (error) {
        console.error("Error en getProductInventoryItem:", error.response?.data || error.message);
        return null;
    }
}

// Get inventory_item_id de un producto (y sus variantes)
export async function getProductInventoryItemByID(productId) {
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
