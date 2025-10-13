// app.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const webhooksRouter = require('./src/routes/webhooks');
// Rutas existentes
const inventoryRoutes = require('./src/routes/inventoryRoutes');
// Nueva ruta de afiliados
const affiliatesRoutes = require('./src/routes/affiliatesRoutes');

const app = express();

// --- Middleware global ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// --- Rutas principales ---
app.use('./api/inventory', inventoryRoutes); // ya existente
app.use('/api/affiliates', affiliatesRoutes); // nueva
app.use("/api/webhooks", webhooksRouter);

// --- Root de verificación ---
app.get('/', (req, res) => {
    res.send('✅ Middleware Shopify activo - Integración Inventario & Afiliados');
});

// --- Manejo de errores global ---
app.use((err, req, res, next) => {
    console.error('❌ Error global:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

// --- Inicializar servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));

module.exports = app;
