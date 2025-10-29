import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const shopifyApi = axios.create({
    baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
    headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
    },
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getProductInventoryItem(sku) {
    console.log("Consultando Shopify con URL:", process.env.SHOPIFY_STORE_URL);
    let url = `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01/products.json?limit=250&fields=id,title,variants`;
    console.log("Shopify URL:", url);

    while (url) {
        try {
            const res = await shopifyApi.get(`/products.json?limit=250&fields=id,title,variants`);
            console.log("Shopify RES:", res);
            const products = res.data.products;

            for (const product of products) {
                for (const variant of product.variants) {
                    if (variant.sku === sku) {
                        console.log(`✅ Producto encontrado: ${product.title}`);
                        console.log(`📦 Inventory Item ID: ${variant.inventory_item_id}`);
                        return variant.inventory_item_id;
                    }
                }
            }

            // Check API call usage and pause if needed
            const callLimitHeader = res.headers['x-shopify-shop-api-call-limit'];
            if (callLimitHeader) {
                const [used, total] = callLimitHeader.split('/').map(Number);
                if (used >= total - 5) {
                    console.log('⏳ Cerca del límite, esperando...');
                    await sleep(1000);
                } else {
                    await sleep(600); // esperar por defecto
                }
            }

            // Extraer el enlace "next" del header Link
            const linkHeader = res.headers['link'];
            if (linkHeader) {
                const match = linkHeader.match(/<([^>]+)>; rel="next"/);
                url = match ? match[1] : null;
            } else {
                url = null;
            }

        } catch (error) {
            console.error('❌ Error al consultar Shopify API:', error.response?.data || error.message);
            return null;
        }
    }
    console.log('🔍 SKU no encontrado.');
    return null;
}

export async function getProductInventoryItem1(sku) {
    try {
        const res = await shopifyApi.get(`/products.json?fields=id,title,variants`);

        const products = res.data.products;

        for (const product of products) {
            for (const variant of product.variants) {
                if (variant.sku === sku) {
                    return {
                        productId: product.id,
                        variantId: variant.id,
                        title: product.title
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Error en getProductInventoryItem:", error.response?.data || error.message);
        return null;
    }
}
export async function getProductInventoryItem0(sku) {
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


// 🔍 Buscar variant_id por SKU
export async function getVariantIdBySKU(sku) {
    try {
        const response = await shopifyApi.get(
            `/variants.json?sku=${encodeURIComponent(sku)}`
        );

        const variants = response.data.variants;
        if (variants.length > 0) {
            return variants; //[0].id; // Devolvemos el primer match
        } else {
            console.warn(`⚠️ No se encontró variant para SKU: ${sku}`);
            return null;
        }

        // const variant = response.data.variants.find(
        //     (v) => v.sku === sku && v.title !== "Default Title"
        // );
        // return variant
    } catch (error) {
        console.error(`❌ Error buscando variant_id para SKU ${sku}:`, error.response?.data || error.message);
        return null;
    }
}

// Actualiza el precio normal de una variante
export async function updateShopifyVariantPrice(variantId, price) {
    try {
        console.log(`🔍 variant_id pvp: ${variantId} | price: ${price}`);
        const response = await shopifyApi.put(
            `/variants/${variantId}.json`,
            { variant: { id: variantId, price: price } }
        );
        return response.data.variant;
    } catch (error) {
        console.error("❌ Error al actualizar precio en Shopify:", error.response?.data || error.message);
        throw error;
    }
}

// Crea o actualiza el precio afiliado como metafield
export async function updateAffiliatePriceMetafield(variantId, affiliatePrice) {
    try {
        console.log(`🔍 variantId pvp afiliado: ${variantId} | price: ${affiliatePrice}`);
        const response = await shopifyApi.post(
            `/variants/${variantId}/metafields.json`,
            {
                metafield: {
                    namespace: "custom",
                    key: "precio_afiliado",
                    type: "number_decimal",
                    value: affiliatePrice.toString(),
                },
            }
        );
        return response.data.metafield;
    } catch (error) {
        console.error("❌ Error al actualizar metafield:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Obtiene el inventory_item_id desde Shopify usando GraphQL por SKU.
 * 🚀 Mucho más rápido que la API REST.
 */
export async function getProductInventoryItem9(sku) {
    try {
        console.log(`🔍 Buscando SKU en Shopify (GraphQL): ${sku}`);

        const query = `
      {
        productVariants(first: 1, query: "sku:${sku}") {
          edges {
            node {
              id
              sku
              inventoryItem {
                id
              }
              product {
                id
                title
                status
              }
            }
          }
        }
      }
    `;

        const response = await axios.post(
            `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01/graphql.json`,
            { query },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                },
            }
        );

        const variantEdges = response.data.data?.productVariants?.edges || [];

        if (variantEdges.length === 0) {
            console.log(`❌ SKU no encontrado en Shopify: ${sku}`);
            return null;
        }

        const variant = variantEdges[0].node;
        const inventoryItemId = variant.inventoryItem.id.replace("gid://shopify/InventoryItem/", "");
        const productId = variant.product.id.replace("gid://shopify/Product/", "");
        const variantId = variant.id.replace("gid://shopify/ProductVariant/", "");

        // console.log(`✅ Encontrado: ${variant.sku}`);
        // console.log(`📦 Inventory Item ID: ${inventoryItemId}`);
        // console.log(`🛍 Product ID: ${productId}`);
        // console.log(`📘 Producto: ${variant.product.title} (${variant.product.status})`);

        console.log(`✅ VariantId: ${variantId} | III: ${inventoryItemId} | Product ID: ${productId} | Status: ${variant.product.status}`);

        return {
            inventory_item_id: inventoryItemId,
            product_id: productId,
            variant_id: variantId,
        };

    } catch (error) {
        console.error("🚨 Error en getProductInventoryItem (GraphQL):", error.response?.data || error.message);
        return null;
    }
}