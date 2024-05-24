//A01641976 
const OpenAI= require("openai");  //importo la libreria de openai

const express = require('express'); //importo express
const bodyParser = require('body-parser'); //importo body-parser
const cors = require('cors');  //importo cors

const app= express(); //creo la app
const port=3000; //creo el puerto

//middelwares
app.use(cors());    //uso cors
app.use(bodyParser.json()); //uso body-parser

require('dotenv').config();   
//esto es para que se pueda leer el archivo .env

//nueva conexion con open ai y lo voy a igualar a un objeto
const openai= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

//vamos a ir guardando toda la conversación

//función asincrona 
async function main(){


app.listen(port, () => { //escucho el puerto
    console.log(`Server is running on port http://localhost:${port}`) //imprimo en consola
})

let history = []; //historial de la conversación

app.post('/api/chat', async (req,res)=> { //ruta para el chat
   
    if(!req.body || !req.body.userQuestion){  //si no hay un mensaje en el body
        return res.status(400).json({error: "Bad Request or missing request"}); //devuelvo un error
    }

    let userQuestion = req.body.userQuestion; //el mensaje que viene del body

    let messages = [ {role: "user", content:userQuestion }]; //  el mensaje que viene del usuario

    try { //intento hacer una petición a la api de openai
        const completion = await openai.chat.completions.create({ //creo una conversación
            model :"gpt-3.5-turbo", //modelo
            messages:messages //mensajes
        });

        let botResponse = completion.choices[0].message; //la respuesta del bot

        history.push(messages[0]); //guardo el mensaje del usuario en el historial
        history.push({role: "bot", content: botResponse}); //guardo la respuesta en el historial

        res.json({ //devuelvo un json con el mensaje
            botResponse,
            history});

    } catch{ //si hay un error
        console.error("Error form openai api", error); //imprimo en consola
        res.status(500).json({error: "Internal Server Error"}) //devuelvo un error

    }

});


}

main() //llamo a la función main

