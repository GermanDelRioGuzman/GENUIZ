const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;

//const bcrypt = require('bcrypt'); //hash de contraseñas
const mysql = require('mysql'); // librería de MySQLote

const app = express();

app.use(express.urlencoded({ extended: true}));
app.use(cookieParser('secreto'));

app.use(session({
    secret: 'secreto',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


// conexión a la base de datos:
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'AmoShrek2!#',
    database: 'genuiz' //la borré sin querer jajan't
  });

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión  exitosa');
});

//

passport.use(new PassportLocal(function(username, password, done){
    //consultar a la base de datos
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length === 0) {
            return done(null, false); // si no encuentra al usuario
        }

        const user = results[0];
        if (user.password !== password) {
            return done(null, false); // si la contraseña es incorrecta
        }

        // ...

        return done(null, user); // autenticaion exitosa
    });

}));


passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    done(null, { id: 1, name: "Cody" }); //se devuelve el usuario fijo



});

app.set('view engine', 'ejs');

app.get("/",(req,res,next)=>{
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
},(req,res) =>{
    //si ya iniciamos mostrar bienvenida 
    
    //si no hemos iniciado sesion redireccionar a /login
    res.send("HOLA DANIELA");
});

app.get("/login",(req,res) => {
    res.render("login"); //mostrar el formulario de login 
});

app.post("/login", passport.authenticate('local',{
    successRedirect: "/",
    failureRedirect: "/login" 
}));


//para registro de usuario
app.get("/register", (req, res) => {
    res.render("register"); 
});

app.post("/register", (req, res) => {
    const { username, password } = req.body; 

    // verifica si el usuario ya existe
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
             console.error('Error en la consulta', err);
             return res.redirect('/register'); 
         }
    
        if (results.length > 0) {
            console.log('El usuario ya existe');
            return res.redirect('/register');
        }

        // agrega el usuario en la base de datos
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        connection.query(query, [username, password], (err, results) => {
            if (err) {
                console.error('Error al registrar usuario', err);
                return res.redirect('/register');
            }

            console.log('Usuario registrado');
            res.redirect('/login');
        });
    });
});
//
app.listen(8080, ()=> console.log("Server started")); 