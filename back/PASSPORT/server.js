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
    password: 'password',
    database: 'genuiz' 
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

//

passport.deserializeUser(function(id, done) {
    connection.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
        if (err) {
            return done(err);
        }
        done(null, results[0]);
    });
});

// passport.deserializeUser(function(id, done){
//     done(null, { id: 1, name: "Cody" }); //se devuelve el usuario fijo
// });


app.set('view engine', 'ejs');

app.get("/",(req,res,next)=>{
    //si no hemos iniciado sesion redireccionar a /login
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
},(req,res) =>{
    //si ya iniciamos mostrar bienvenida 
    res.send("HOLA DANIELA");
});

app.get("/login", (req, res) => { //ruta login
    res.render("login");
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
    const { name, username, password, role } = req.body;  //datos del formulario

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

        // Obtener el role_id basado en el `role_name`
        connection.query('SELECT id FROM role WHERE role_name = ?', [role], (err, results) => {
            if (err || results.length === 0) {
                console.error('Error al obtener el role_id', err);
                return res.redirect('/register');
            }

        const role_id = results[0].id; // obttener el role_id del resultado de la consulta
        
        // agrega el usuario en la base de datos
        const query = 'INSERT INTO users (name, username, password, role_id) VALUES (?, ?, ?, ?)';
        connection.query(query, [name, username, password, role_id], (err, results) => {
            if (err) {
                console.error('Error al registrar usuario', err);
                return res.redirect('/register');
            }

            console.log('Usuario registrado');
            res.redirect('/login');
        });
     });
  });
});

//
app.listen(8080, ()=> console.log("Server started")); 

