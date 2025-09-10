import mysql from "mysql2/promise";

export async function getConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });
}

// ✅ Obtener todos los productos
export async function getAllProducts() {
    const connection = await getConnection();
    const [rows] = await connection.query("SELECT sku, stock, inventory_item_id FROM stockTienda");
    await connection.end();
    return rows;
}

// ✅ Guardar inventory_item_id encontrado
export async function saveInventoryItemId(sku, inventoryItemId) {
    const connection = await getConnection();
    await connection.query(
        "UPDATE stockTienda SET inventory_item_id = ? WHERE sku = ?",
        [inventoryItemId, sku]
    );
    await connection.end();
}
