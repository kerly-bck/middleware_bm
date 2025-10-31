import mysql from "mysql2/promise";

export async function getConnection() {
    console.log('host', process.env.DB_HOST);
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });
}

// Get all products
export async function getProductsBatch(offset = 0, limit = 10) {
    const connection = await getConnection();
    const [rows] = await connection.query(
        "SELECT sku, stock, inventory_item_id FROM stockTienda LIMIT ? OFFSET ?",
        [limit, offset]
    );
    await connection.end();
    return rows;
}

// Save inventory_item_id found
export async function saveInventoryItemId(sku, inventoryItemId) {
    const connection = await getConnection();
    await connection.query(
        "UPDATE stockTienda SET inventory_item_id = ? WHERE sku = ?",
        [inventoryItemId, sku]
    );
    await connection.end();
}

// Get updated products in the last 24 hours
export async function getUpdatedProducts(hours = 24) {
    const connection = await getConnection();
    const [rows] = await connection.query(
        `SELECT sku, stock, inventory_item_id, tienda 
     FROM stockTienda 
     WHERE time_stamp >= NOW() - INTERVAL ? HOUR`,
        [hours]
    );
    return rows;
}


// Obtener todos los productos con precios desde la DB
export async function getAllProductsPrices(batchSize, offset) {
    const connection = await getConnection();
    await connection.query("SET SQL_BIG_SELECTS = 1");
    const [rows] = await connection.query(`
    SELECT 
      SKU,
      pvp,
      pvp_afi,
      inventory_item_id
    FROM itemEcomm
    WHERE existe_shopify IS NULL  
    AND inventory_item_id IS NOT NULL
    AND time_stamp > '2025-10-20 12:18:15'
    LIMIT ? OFFSET ?
      `,
        [batchSize, offset]
    );
    await connection.end();
    return rows;
}