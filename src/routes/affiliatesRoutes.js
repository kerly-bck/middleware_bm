const express = require('express');
const router = express.Router();
const affiliatesController = require('../controllers/affiliatesController');

router.post('/check', affiliatesController.checkAffiliate); // principal
router.post('/force-register', affiliatesController.forceRegister); // opcional: forzar registro manual

/**
 * POST /api/affiliates/sync
 * Flujo completo: validar + registrar (si no existe) + tag en Shopify
 *
 * Recibe:
 * {
 *   identificacionUser: "0102030405",
 *   nombre: "Juan",
 *   apellido: "Pérez",
 *   correo: "juan@ejemplo.com",
 *   telefono: "0999999999",
 *   customerId: 1234567890
 * }
 */
router.post("/sync", async (req, res) => {
    const { identificacionUser, nombre, apellido, correo, telefono, customerId } = req.body;

    if (!identificacionUser || !nombre || !apellido || !correo) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    try {
        // 1️⃣ Validar afiliación
        const validateBody = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <dameDatos xmlns="http://190.11.19.61:8181/wsDatosSocia">
            <identificacionUser>${identificacionUser}</identificacionUser>
          </dameDatos>
        </soap12:Body>
      </soap12:Envelope>`;

        const validateResponse = await axios.post("https://mockserver.com/wsDatosUser/Service.asmx", validateBody, {
            headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
        });

        const xmlValidate = validateResponse.data;
        const exists = xmlValidate.includes("<existeAfiliado>true</existeAfiliado>");

        if (exists) {
            console.log(`✅ Afiliado encontrado para ${identificacionUser}`);
        } else {
            console.log(`🟡 Afiliado no encontrado. Registrando nuevo...`);

            // 2️⃣ Registrar nuevo afiliado
            const registerBody = `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                         xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
          <soap12:Body>
            <ingresarAfiliado xmlns="http://190.11.19.61:8181/wsDatosSocia">
              <identificacionUser>${identificacionUser}</identificacionUser>
              <nombre>${nombre}</nombre>
              <apellido>${apellido}</apellido>
              <correo>${correo}</correo>
              <telefono>${telefono}</telefono>
            </ingresarAfiliado>
          </soap12:Body>
        </soap12:Envelope>`;

            const registerResponse = await axios.post("https://mockserver.com/wsDatosUser/Service.asmx", registerBody, {
                headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
            });

            const xmlRegister = registerResponse.data;
            const success = xmlRegister.includes("<ingresoExitoso>true</ingresoExitoso>");

            if (success) {
                console.log(`✅ Nuevo afiliado registrado: ${identificacionUser}`);
            } else {
                console.warn(`⚠️ Error al registrar afiliado ${identificacionUser}`);
            }
        }

        // 3️⃣ Agregar tag "afiliado" en Shopify
        if (customerId) {
            await shopifyApi.put(`/customers/${customerId}.json`, {
                customer: {
                    id: customerId,
                    tags: "afiliado",
                },
            });
            console.log(`🏷️ Tag "afiliado" asignada al cliente ${customerId}`);
        }

        // 4️⃣ Respuesta al frontend o sistema
        res.json({
            afiliado: true,
            message: exists ? "Cliente ya era afiliado" : "Cliente registrado y marcado como afiliado",
        });
    } catch (error) {
        console.error("❌ Error en sync afiliados:", error.message);
        res.status(500).json({ error: "Error al validar/registrar afiliado" });
    }
});

module.exports = router;
