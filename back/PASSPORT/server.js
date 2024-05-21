const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.get("/", (req,res) =>{

    //si ya iniciamos mostrar bienvenida 
    //si no hemos iniciado sesion redireccionar a /login
})

app.get("/login",(req,res) => {
    //mostrar el formulario de login 
    res.render("login");
});

app.post("/login", (req,res)=>{
    //recibir credenciales e iniciar sesion 
});

app.listen(8080, ()=> console.log("Server started")); 