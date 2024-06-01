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
    app.use(express.static('views'));
    app.use(express.json()); //uso json

    // Ruta para manejar la petición POST
    app.post('/recibir-datos', async (req, res) => {
        if (!req.body || !req.body.miDato) {  //si no hay un mensaje en el body
            return res.status(400).json({ error: "Bad Request or missing request" }); //devuelvo un error
        }
        console.log('Dato recibido:', req.body.miDato);  // Accedemos al dato enviado como JSON

        let miDato = req.body.miDato; //el mensaje que viene del body

        let messages = [{ role: "user", content: miDato }]; //  el mensaje que viene del usuario

        try { //intento hacer una petición a la api de openai
            const completion = await openai.chat.completions.create({ //creo una conversación
                model: "gpt-3.5-turbo", //modelo
                messages: messages //mensajes
            });

            let botResponse = completion.choices[0].message; //la respuesta del bot

            res.json({ //devuelvo un json con el mensaje
                botResponse
            });

            console.log('Respuesta del bot:', botResponse); //imprimo en consola la respuesta del bot

        } catch { //si hay un error
            console.error("Error form openai api", error); //imprimo en consola
            res.status(500).json({ error: "Internal Server Error" }) //devuelvo un error

        }
    });



    // Ruta para manejar la petición POST
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });

}

main() //llamo a la función main

