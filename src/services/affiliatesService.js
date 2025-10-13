import soapClient from "../utils/soapClient.js";
import { shopifyApi } from "../utils/shopifyClient.js";

export async function handleAffiliateValidation(customerData) {
    const { id, first_name, last_name, email, phone, note } = customerData;

    const cedulaMatch = note ? note.match(/\d{10}/) : null;
    const cedula = cedulaMatch ? cedulaMatch[0] : null;

    if (!cedula) {
        console.log("⚠️ Cliente sin cédula, no se valida afiliación.");
        return;
    }

    const xml = await soapClient.validateAffiliate(cedula);
    const exists = xml.includes("<existeAfiliado>true</existeAfiliado>");

    if (!exists) {
        console.log("🟡 Afiliado no existe, registrando...");
        await soapClient.registerAffiliate({
            cedula,
            nombre: first_name,
            apellido: last_name,
            correo: email,
            telefono: phone,
        });
    }

    await shopifyApi.put(`/customers/${id}.json`, {
        customer: { id, tags: "afiliado" },
    });

    console.log(`🏷️ Tag 'afiliado' añadida al cliente ${id}`);
}
