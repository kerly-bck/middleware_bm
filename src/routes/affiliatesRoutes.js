import express from "express";
import axios from "axios";
import {checkAffiliate } from '../controllers/affiliatesController.js';
import { handleAffiliateValidation } from "../services/affiliatesService.js";
const router = express.Router();
import {shopifyApi} from "../shopify.js";

router.post('/check', checkAffiliate); // principal
// router.post('/force-register', affiliatesController.forceRegister); // opcional: forzar registro manual

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

        const validateResponse = await axios.post("https://fecfa79a-3e2b-4aaf-8ac1-bf167ed6b2ed.mock.pstmn.io/dameDatos", validateBody, {
            headers: { "Content-Type": "application/soap+xml; charset=utf-8",
            "Access-Control-Allow-Origin": "*"},
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

            const registerResponse = await axios.post("https://fecfa79a-3e2b-4aaf-8ac1-bf167ed6b2ed.mock.pstmn.io/registrarAfiliado", registerBody, {
                headers: { "Content-Type": "application/soap+xml; charset=utf-8", "Access-Control-Allow-Origin": "*" },
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

/**
 * POST /api/affiliates/validate
 * Recibe: { identificacionUser: "0102030405" }
 * Retorna: { exists: true/false, data }
 */
router.post("/validates", async (req, res) => {
    const { identificacionUser } = req.body;

    if (!identificacionUser) {
        return res.status(400).json({ error: "El campo identificacionUser es obligatorio" });
    }

    try {
        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <dameDatos xmlns="http://190.11.19.61:8181/wsDatosSocia">
            <identificacionUser>${identificacionUser}</identificacionUser>
          </dameDatos>
        </soap12:Body>
      </soap12:Envelope>`;

        const response = await axios.post("https://fecfa79a-3e2b-4aaf-8ac1-bf167ed6b2ed.mock.pstmn.io/dameDatos", soapBody, {
            headers: { "Content-Type": "application/soap+xml; charset=utf-8", "Access-Control-Allow-Origin": "*" },
        });

        const xml = response.data;
        const exists = xml.includes("<existeAfiliado>true</existeAfiliado>");

        let data = null;
        if (exists) {
            const nombreMatch = xml.match(/<nombre>(.*?)<\/nombre>/);
            const telefonoMatch = xml.match(/<telefono>(.*?)<\/telefono>/);
            data = {
                nombre: nombreMatch ? nombreMatch[1] : "Afiliado",
                telefono: telefonoMatch ? telefonoMatch[1] : "",
            };
        }

        res.json({ exists, data });
    } catch (error) {
        console.error("❌ Error en validate:", error.message);
        res.status(500).json({ error: "Error al validar afiliación" });
    }
});

router.post("/validate", async (req, res) => {
    try {
        await handleAffiliateValidation(req.body);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Error en afiliados:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
