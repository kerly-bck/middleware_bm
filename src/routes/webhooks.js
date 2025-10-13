import express from "express";
import axios from "axios";
import { shopifyApi } from "../shopify.js";

const router = express.Router();

/**
 * Webhook: customers/create (Shopify → Middleware)
 */
router.post("/customers/create", async (req, res) => {
    const data = req.body;

    try {
        const { id: customerId, first_name, last_name, email, phone, note } = data;

        // Extraer cédula desde note
        const cedulaMatch = note ? note.match(/\d{10}/) : null;
        const identificacionUser = cedulaMatch ? cedulaMatch[0] : null;

        if (!identificacionUser) {
            console.log("⚠️ Cliente sin cédula registrada, se omite validación.");
            return res.status(200).send("OK");
        }

        console.log(`📨 Webhook recibido para cliente ${customerId} (${identificacionUser})`);

        // 1️⃣ Validar afiliado
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

        if (!exists) {
            console.log("🟡 Afiliado no existe, registrando...");

            const registerBody = `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                         xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
          <soap12:Body>
            <ingresarAfiliado xmlns="http://190.11.19.61:8181/wsDatosSocia">
              <identificacionUser>${identificacionUser}</identificacionUser>
              <nombre>${first_name}</nombre>
              <apellido>${last_name}</apellido>
              <correo>${email}</correo>
              <telefono>${phone || ""}</telefono>
            </ingresarAfiliado>
          </soap12:Body>
        </soap12:Envelope>`;

            const registerResponse = await axios.post("https://mockserver.com/wsDatosUser/Service.asmx", registerBody, {
                headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
            });

            if (registerResponse.data.includes("<ingresoExitoso>true</ingresoExitoso>")) {
                console.log(`✅ Afiliado ${identificacionUser} registrado en SOAP`);
            } else {
                console.warn(`⚠️ No se pudo registrar afiliado ${identificacionUser}`);
            }
        } else {
            console.log(`✅ Afiliado ${identificacionUser} ya existe en SOAP`);
        }

        // 2️⃣ Agregar tag "afiliado" en Shopify
        await shopifyApi.put(`/customers/${customerId}.json`, {
            customer: { id: customerId, tags: "afiliado" },
        });

        console.log(`🏷️ Tag 'afiliado' añadida a cliente ${customerId}`);

        res.status(200).send("OK");
    } catch (error) {
        console.error("❌ Error procesando webhook:", error.message);
        res.status(500).send("Error");
    }
});

export default router;
