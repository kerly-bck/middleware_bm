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

// Read a test product
export async function getTestProduct() {
    const conn = await getConnection();
    const [rows] = await conn.execute("SELECT tienda, sku, stock FROM stockTienda LIMIT 1");
    await conn.end();
    return rows[0];
}
