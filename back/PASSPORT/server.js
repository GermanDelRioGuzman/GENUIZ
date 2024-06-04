const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;
const path = require('path'); // módulo path de Node.js
const mysql = require('mysql'); // librería de MySQL

const app = express();

// Middleware análisis de datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('secreto'));

app.use(session({
    secret: 'secreto',
    resave: true,
    saveUninitialized: true
}));

// Configuración básica passport
app.use(passport.initialize());
app.use(passport.session());

// Conexión a la base de datos:
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
    console.log('Conexión exitosa');
});

// Configuración passport
passport.use(new PassportLocal(function(username, password, done) {
    connection.query(`
        SELECT users.*, role.role_name 
        FROM users 
        JOIN role ON users.role_id = role.id 
        WHERE username = ?`, [username], (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length === 0) {
            return done(null, false); // Usuario no encontrado
        }

        const user = results[0];
        if (user.password !== password) {
            return done(null, false); // Contraseña incorrecta
        }

        return done(null, user); // Autenticación exitosa
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    connection.query(`
        SELECT users.*, role.role_name 
        FROM users 
        JOIN role ON users.role_id = role.id 
        WHERE users.id = ?`, [id], (err, results) => {
        if (err) {
            return done(err);
        }
        done(null, results[0]);
    });
});

// Rutas
// Ruta principal, redirige a la página de inicio de sesión si no está autenticado
app.get("/", (req, res) => {
    if (req.isAuthenticated()) {
        const userRole = req.user.role_name;
        if (userRole === 'student') {
            res.redirect("/vistaEstudiante.html");
        } else if (userRole === 'teacher') {
            res.redirect("/vistaProfesor.html");
        } else {
            res.send("Error: Rol de usuario desconocido.");
        }
    } else {
        res.redirect("/iniciosesion");
    }
});

// Ruta para la página de inicio de sesión
app.get("/iniciosesion", (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'iniciosesion.html'));
});

// Ruta para el inicio de sesión
app.post("/iniciosesion", passport.authenticate('local', {
    successRedirect: "/", // Redirigir al usuario a la página principal donde se redirige según el rol
    failureRedirect: "/iniciosesion"
}));

// Ruta para la página de registro
app.get("/registrarme", (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'registrarme.html'));
});

// Ruta para el registro de usuario
app.post("/registrarme", (req, res) => {
    const { name, username, password, role } = req.body; // Datos del formulario

    console.log('Datos recibidos del formulario:', req.body);

    // Verifica si el usuario ya existe
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error en la consulta', err);
            return res.redirect('/registrarme');
        }

        if (results.length > 0) {
            console.log('El usuario ya existe');
            return res.redirect('/registrarme');
        }

        // Obtener el role_id basado en el `role_name`
        connection.query('SELECT id FROM role WHERE role_name = ?', [role], (err, results) => {
            if (err || results.length === 0) {
                console.error('Error al obtener el role_id', err);
                return res.redirect('/registrarme');
            }

            const role_id = results[0].id; // Obtener el role_id del resultado de la consulta

            console.log('Role ID:', role_id);

            // Agrega el usuario en la base de datos
            const query = 'INSERT INTO users (name, username, password, role_id) VALUES (?, ?, ?, ?)';
            connection.query(query, [name, username, password, role_id], (err, results) => {
                if (err) {
                    console.error('Error al registrar usuario', err);
                    return res.redirect('/registrarme');
                }

                console.log('Usuario registrado');
                res.redirect('/iniciosesion');
            });
        });
    });
});

// Ruta para servir archivos estáticos
app.use(express.static(path.join(__dirname, '..', '..', 'src', 'views')));

// Servir archivos HTML de las vistas
app.get('/vistaEstudiante.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'vistaEstudiante.html'));
});

app.get('/vistaProfesor.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'vistaProfesor.html'));
});

// Iniciar servidor
app.listen(8080, () => console.log("Server started"));
