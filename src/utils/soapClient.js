import axios from "axios";

const soapClient = {
    async validateAffiliate(cedula) {
        const body = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <dameDatos xmlns="http://190.11.19.61:8181/wsDatosSocia">
            <identificacionUser>${cedula}</identificacionUser>
          </dameDatos>
        </soap12:Body>
      </soap12:Envelope>`;

        const response = await axios.post(process.env.SOAP_VALIDATE_URL, body, {
            headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
        });
        return response.data;
    },

    async registerAffiliate(data) {
        const { cedula, nombre, apellido, correo, telefono } = data;

        const body = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <ingresarAfiliado xmlns="http://190.11.19.61:8181/wsDatosSocia">
            <identificacionUser>${cedula}</identificacionUser>
            <nombre>${nombre}</nombre>
            <apellido>${apellido}</apellido>
            <correo>${correo}</correo>
            <telefono>${telefono || ""}</telefono>
          </ingresarAfiliado>
        </soap12:Body>
      </soap12:Envelope>`;

        const response = await axios.post(process.env.SOAP_REGISTER_URL, body, {
            headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
        });
        return response.data;
    },
};

export default soapClient;
