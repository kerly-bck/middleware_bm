import axios from "axios";

/**
 * Realiza una solicitud SOAP con Axios.
 */
export function postSOAP(url, xml) {
    return axios.post(url, xml, {
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(xml)
        },
        timeout: 5000
    });
}

// Parsers mínimos — ADAPTAR según el XML real del WS
export function parseValidateResponse(xmlString) {
    const exists = xmlString.includes('<exists>true</exists>') || xmlString.includes('Exists>true');
    return { exists };
}

export function parseRegisterResponse(xmlString) {
    const ok = xmlString.includes('<success>true</success>') || xmlString.includes('RegistroOK');
    return { success: ok };
}
