require('dotenv').config(); // Asegúrate de que esta línea esté al principio

const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;
const path = require('path');
const mysql = require('mysql');
const OpenAI = require('openai');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 8080; // Puedes cambiar este puerto si es necesario

// Middleware análisis de datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('secreto'));
app.use(cors());

app.use(session({
    secret: 'secreto',
    resave: true,
    saveUninitialized: true
}));

// Configuración básica passport
app.use(passport.initialize());
app.use(passport.session());

// Conexión a la base de datos MySQL
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

// Configuración OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Rutas de autenticación y vistas
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

app.get("/iniciosesion", (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'iniciosesion.html'));
});

app.post("/iniciosesion", passport.authenticate('local', {
    successRedirect: "/", // Redirigir al usuario a la página principal donde se redirige según el rol
    failureRedirect: "/iniciosesion"
}));

app.get("/registrarme", (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'registrarme.html'));
});

app.post("/registrarme", (req, res) => {
    const { name, username, password, role } = req.body;

    console.log('Datos recibidos del formulario:', req.body);

    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error en la consulta', err);
            return res.redirect('/registrarme');
        }

        if (results.length > 0) {
            console.log('El usuario ya existe');
            return res.redirect('/registrarme');
        }

        connection.query('SELECT id FROM role WHERE role_name = ?', [role], (err, results) => {
            if (err || results.length === 0) {
                console.error('Error al obtener el role_id', err);
                return res.redirect('/registrarme');
            }

            const role_id = results[0].id;

            console.log('Role ID:', role_id);

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

app.use(express.static(path.join(__dirname, '..', '..', 'src', 'views')));

app.get('/vistaEstudiante.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'vistaEstudiante.html'));
});

app.get('/vistaProfesor.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'src', 'views', 'vistaProfesor.html'));
});

// Rutas para generar exámenes (OpenAI)
app.post('/recibir-datos', async (req, res) => {
    if (!req.body || !req.body.miDato) {  // Si no hay un mensaje en el body
        return res.status(400).json({ error: "Bad Request or missing request" }); // Devuelvo un error
    }
    console.log('Dato recibido:', req.body.miDato);  // Accedemos al dato enviado como JSON

    let miDato = req.body.miDato; // El mensaje que viene del body

    let messages = [{ role: "user", content: miDato }]; // El mensaje que viene del usuario

    try { // Intento hacer una petición a la API de OpenAI
        const completion = await openai.chat.completions.create({ // Creo una conversación
            model: "gpt-3.5-turbo", // Modelo
            messages: messages // Mensajes
        });

        let botResponse = completion.choices[0].message; // La respuesta del bot

        res.json({ // Devuelvo un JSON con el mensaje
            botResponse
        });

        console.log('Respuesta del bot:', botResponse); // Imprimo en consola la respuesta del bot

    } catch (error) { // Si hay un error
        console.error("Error from openai api", error); // Imprimo en consola
        res.status(500).json({ error: "Internal Server Error" }) // Devuelvo un error
    }
});

// Conexión a la base de datos SQLite
let db = new sqlite3.Database(path.join(__dirname, '..', '..', 'src', 'my_database.db'), (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS exams(
                id INTEGER PRIMARY KEY,
                data TEXT,
                room INTEGER
              )`,
            (err) => {
                if (err) {
                    console.error(err.message);
                } else {
                    console.log("Exams table created successfully");
                }
            });
    }
});

// Ruta para guardar exámenes
app.post('/save-exam', (req, res) => {
    let examData = req.body.data;

    db.run(`INSERT INTO exams(data) VALUES(?)`, [examData], function (err) {
        if (err) {
            console.error(err.message);
            res.status(500).send(err);
        } else {
            console.log(`A row has been inserted with rowid ${this.lastID}`);
            res.status(200).send({ id: this.lastID });
        }
    });
});

// Ruta para obtener todos los exámenes
app.get('/get-exams', (req, res) => {
    db.all(`SELECT * FROM exams`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send(err);
        } else {
            res.status(200).send(rows);
        }
    });
});

// Ruta para obtener un examen basado en el room
app.get('/get-exam', (req, res) => {
    const examId = req.query.id;

    db.get(`SELECT * FROM exams WHERE id = ?`, [examId], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).send(err);
        } else {
            if (row) {
                res.status(200).send(row);
            } else {
                res.status(404).send({ message: 'Examen no encontrado' });
            }
        }
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
