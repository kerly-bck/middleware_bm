import axios from "axios";
module.exports.postSOAP = (url, xml) => {
    return axios.post(url, xml, {
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(xml)
        },
        timeout: 5000
    });
};

// Parsers mínimos — ADAPTAR según el XML real del WS
module.exports.parseValidateResponse = (xmlString) => {
    // muy simple: buscar un nodo <exists>true</exists> o similar
    // recomiendo usar xml2js para parsear en producción
    const exists = xmlString.includes('<exists>true</exists>') || xmlString.includes('Exists>true');
    return { exists };
};

module.exports.parseRegisterResponse = (xmlString) => {
    const ok = xmlString.includes('<success>true</success>') || xmlString.includes('RegistroOK');
    return { success: ok };
};
