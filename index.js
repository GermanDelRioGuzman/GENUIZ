//A01641976 
const OpenAI = require("openai");  //importo la libreria de openai
const path = require('path'); //importo path
const express = require('express'); //importo express
const bodyParser = require('body-parser'); //importo body-parser
const cors = require('cors');  //importo cors

const app = express(); //creo la app
const port = 3000; //creo el puerto

//middelwares
app.use(cors());    //uso cors
app.use(bodyParser.json()); //uso body-parser

require('dotenv').config();
//esto es para que se pueda leer el archivo .env

//nueva conexion con open ai y lo voy a igualar a un objeto
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})


//función asincrona 
async function main() {
    // Servir archivos estáticos desde la carpeta public
    app.use(express.static('public'));

    
    // Ruta para manejar la petición POST
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });

    app.use(express.json()); //uso json
    
    // Ruta para manejar la petición POST
    app.post('/recibir-datos', (req, res) => {
        console.log('Dato recibido:', req.body.miDato);  // Accedemos al dato enviado como JSON
        res.send('Dato procesado en el servidor: ' + req.body.miDato);
    });


}

main() //llamo a la función main

