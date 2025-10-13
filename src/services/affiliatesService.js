const axios = require('axios');
const soapClient = require('../utils/soapClient');

const SOAP_VALIDATE_URL = process.env.SOAP_VALIDATE_URL; // e.g. https://host/wsDatosUser/Service.asmx
const SOAP_REGISTER_URL = process.env.SOAP_REGISTER_URL; // endpoint register

exports.validateAffiliateSOAP = async (cedula) => {
    // arma el XML para dameDatos y postea (soap12)
    const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <dameDatos xmlns="http://190.11.19.61:8181/wsDatosSocia">
        <identificacionUser>${cedula}</identificacionUser>
      </dameDatos>
    </soap12:Body>
  </soap12:Envelope>`;

    const resp = await soapClient.postSOAP(SOAP_VALIDATE_URL, xml);
    // parsea la respuesta (depende del WS real). Aquí asumimos un tag <dameDatosResult> con JSON o campos.
    // Debes adaptar el parser según el body real devuelto.
    const parsed = soapClient.parseValidateResponse(resp.data);
    return parsed; // { exists: true/false, data: {...} }
};

exports.registerAffiliateSOAP = async ({ cedula, nombre, apellido, email, telefono }) => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <registrarAfiliado xmlns="http://190.11.19.61:8181/wsDatosSocia">
        <identificacionUser>${cedula}</identificacionUser>
        <nombre>${nombre}</nombre>
        <apellido>${apellido}</apellido>
        <email>${email}</email>
        <telefono>${telefono}</telefono>
      </registrarAfiliado>
    </soap12:Body>
  </soap12:Envelope>`;

    const resp = await soapClient.postSOAP(SOAP_REGISTER_URL, xml);
    const parsed = soapClient.parseRegisterResponse(resp.data);
    return parsed; // { success: true/false, message: '' }
};
