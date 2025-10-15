import {getCustomer, extractCedulaFromCustomer, addCustomerTag} from '../services/shopifyService.js';
// import {validateAffiliateSOAP, registerAffiliateSOAP} from '../services/affiliatesService.js';

exports.checkAffiliate = async (req, res) => {
    try {
        const { customerId, cedula } = req.body;
        if (!customerId && !cedula) return res.status(400).json({ error: 'customerId o cedula requerido' });

        // 1) Obtener customer desde Shopify
        const customer = await getCustomer(customerId);
        // preferir cedula desde metafield -> note fallback
        const customerCedula = cedula || extractCedulaFromCustomer(customer);

        if (!customerCedula) {
            return res.status(400).json({ error: 'Cédula no encontrada en customer y no fue enviada' });
        }

        // 2) Validar con WS afiliados (SOAP)
        const validation = await validateAffiliateSOAP(customerCedula);

        if (validation.exists) {
            // 3a) Si existe - asegurar tag afiliado en Shopify
            await addCustomerTag(customerId, 'afiliado');
            return res.json({ status: 'afiliado', message: 'Cliente afiliado', from: 'validate' });
        }

        // 3b) No existe -> registrar en WS afiliados usando datos del customer
        const payload = {
            cedula: customerCedula,
            nombre: customer.first_name || '',
            apellido: customer.last_name || '',
            email: customer.email || '',
            telefono: customer.phone || ''
        };

        const regRes = await registerAffiliateSOAP(payload);
        if (regRes.success) {
            await addCustomerTag(customerId, 'afiliado');
            return res.json({ status: 'registered', message: 'Registrado y tag aplicado' });
        }

        // fallback
        return res.status(500).json({ error: 'No fue posible registrar como afiliado' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'error interno' });
    }
};

// exports.forceRegister = async (req, res) => {
//     // endpoint para admin/test donde se llama register directamente con payload
//     try {
//         const result = await affiliatesService.registerAffiliateSOAP(req.body);
//         res.json(result);
//     } catch (err) {
//         console.error('❌ Error en forceRegister:', err.message);
//         res.status(500).json({ error: 'Error forzando registro de afiliado.' });
//     }
// };
