import {shopifyApi} from "../shopify.js";

exports.getCustomer = async (customerId) => {
    const res = await shopifyApi.get(`/customers/${customerId}.json`);
    return res.data.customer;
};

exports.extractCedulaFromCustomer = (customer) => {
    // 1) preferir metafields (si lo guardan ahí). Si no, revisar note
    if (!customer) return null;
    // ejemplo: cedula en customer.note: "cedula:0123456789"
    if (customer.note) {
        const m = customer.note.match(/cedula[:=]\s*([\dA-Za-z\-]+)/i);
        if (m) return m[1];
    }
    // si usan metafields -> habría que llamar GET /customers/{id}/metafields.json
    return null;
};

// Añadir tag 'afiliado' si no existe
exports.addCustomerTag = async (customerId, tag) => {
    const customer = await this.getCustomer(customerId);
    const existing = (customer.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    if (existing.includes(tag)) return;
    existing.push(tag);
    const tagsString = existing.join(', ');
    await shopifyApi.put(`/customers/${customerId}.json`, { customer: { id: customerId, tags: tagsString }});
};
