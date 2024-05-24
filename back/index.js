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

//in this part we goona connect the server route with the hommepage
app.use(express.static(path.join(_dirname, 'front'))); //ruta para el front

app.listen(port, () => { //escucho el puerto
    console.log(`Server is running on port http://localhost:${port}`) //imprimo en consola
})



}

main() //llamo a la función main

