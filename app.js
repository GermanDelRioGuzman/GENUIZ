require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const OpenAI = require('openai');

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('secreto'));
app.use(flash());

// Configuración de la sesión
app.use(session({
    secret: 'secreto',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

//middleware to invalid cache
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Expires', '-1');
    res.setHeader('Pragma', 'no-cache');
    next();
});

console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);

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
    console.log('Conexión exitosa a la base de datos');
    connection.query(`CREATE TABLE IF NOT EXISTS exams_json (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL,
        title VARCHAR(50) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        description_ VARCHAR(255) NULL,
        level ENUM('facil', 'medio', 'dificil') NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        exam_code VARCHAR(50) UNIQUE NOT NULL,
        exam_data JSON,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
    )`, (err, result) => {
        if (err) {
            console.error('Error al crear la tabla:', err);
        } else {
            console.log('Tabla exams_json creada o ya existe');
        }
    });
});

passport.use(new PassportLocal(async function (username, password, done) {
    const query = 'SELECT users.*, role.role_name FROM users LEFT JOIN role ON users.role_id = role.id WHERE username = ?';
    connection.query(query, [username], async (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length === 0) {
            return done(null, false, { message: 'Usuario no encontrado' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return done(null, false, { message: 'Contraseña incorrecta' });
        }
        if (user.role_id === null) {
            return done(null, false, { message: 'Debe completar su registro.' });
        }
        return done(null, user);
    });
}));

//login with Google

passport.use('google-login', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback/login"
},
function(token, tokenSecret, profile, done) {
    connection.query('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length === 0) {
            return done(null, false, { message: 'Usuario no encontrado' });
        } else {
            const user = results[0];
            if (user.role_id === null) {
                return done(null, user, { message: 'complete' });
            }
            return done(null, user);
        }
    });
}));

//register with Google

passport.use('google-register', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback/register"
},
function(token, tokenSecret, profile, done) {
    connection.query('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length === 0) {
            const query = 'INSERT INTO users (google_id, username, name, role_id) VALUES (?, ?, ?, ?)';
            connection.query(query, [profile.id, profile.emails[0].value, profile.displayName, null], (err, results) => {
                if (err) {
                    return done(err);
                }
                const newUser = { id: results.insertId, username: profile.emails[0].value, name: profile.displayName, role_id: null };
                return done(null, newUser);
            });
        } else {
            return done(null, false, { message: 'Usuario ya existente' });
        }
    });
}));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    const query = 'SELECT users.*, role.role_name FROM users LEFT JOIN role ON users.role_id = role.id WHERE users.id = ?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length === 0) {
            return done(new Error('Usuario no encontrado'), null);
        }
        done(null, results[0]);
    });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/iniciosesion');
}

function ensureRole(role) {
    return function(req, res, next) {
        if (req.isAuthenticated() && req.user.role_name === role) {
            return next();
        }
        res.sendStatus(403);
    }
}

app.get("/", ensureAuthenticated, (req, res) => {
    const userRole = req.user.role_name;
    if (userRole === 'student') {
        res.redirect("/vistaEstudiante.html");
    } else if (userRole === 'teacher') {
        res.redirect("/vistaProfesor.html");
    } else {
        res.send("Error: Rol de usuario desconocido.");
    }
});

//login 
app.get("/iniciosesion", (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'iniciosesion.html'));
});

app.post("/iniciosesion", (req, res, next) => {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/iniciosesion?error=' + encodeURIComponent(info.message));
        }
        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }
            return res.redirect('/');
        });
    })(req, res, next);
});

//register

app.get("/registrarme", (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'registrarme.html'));
});

app.post("/registrarme", (req, res, next) => {
    const { name, username, password, role } = req.body;

    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            return res.redirect('/registrarme?error=database');
        }

        if (results.length > 0) {
            return res.redirect('/registrarme?error=userexists');
        }

        connection.query('SELECT id FROM role WHERE role_name = ?', [role], (err, results) => {
            if (err || results.length === 0) {
                return res.redirect('/registrarme?error=rolenotfound');
            }

            const role_id = results[0].id;

            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    return res.redirect('/registrarme?error=hash');
                }

                const query = 'INSERT INTO users (name, username, password, role_id) VALUES (?, ?, ?, ?)';
                connection.query(query, [name, username, hashedPassword, role_id], (err, results) => {
                    if (err) {
                        return res.redirect('/registrarme?error=insert');
                    }

                    req.login({ id: results.insertId, username, role_name: role }, (err) => {
                        if (err) {
                            return next(err);
                        }
                        return res.redirect('/');
                    });
                });
            });
        });
    });
});

//google
app.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback/login', 
    passport.authenticate('google-login', { failureRedirect: '/iniciosesion?error=complete' }),
    (req, res) => {
        if (req.user.role_id === null) {
            return res.redirect('/completar-registro');
        }
        res.redirect('/');
    }
);

app.get('/auth/google/register', passport.authenticate('google-register', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback/register', 
    passport.authenticate('google-register', { failureRedirect: '/registrarme?error=userexists' }),
    (req, res) => {
        res.redirect('/completar-registro');
    }
);

app.get('/completar-registro', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'completar-registro.html'));
});

app.post('/completar-registro', ensureAuthenticated, (req, res) => {
    const { role } = req.body;
    const userId = req.user.id;

    connection.query('SELECT id FROM role WHERE role_name = ?', [role], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/completar-registro');
        }

        const role_id = results[0].id;

        connection.query('UPDATE users SET role_id = ? WHERE id = ?', [role_id, userId], (err, results) => {
            if (err) {
                return res.redirect('/completar-registro');
            }

            res.redirect('/');
        });
    });
});

app.get('/vistaEstudiante.html', ensureAuthenticated, ensureRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'vistaEstudiante.html'));
});

app.get('/vistaProfesor.html', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'vistaProfesor.html'));
});

app.get('/generador.html', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'generador.html'));
});

// logout
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.redirect('/?error=logout');
        }
        req.session.destroy((err) => {
            if (err) {
                return res.redirect('/?error=logout');
            }
            res.clearCookie('connect.sid');
            res.redirect('/iniciosesion');
        });
    });
});


app.use(express.static(path.join(__dirname, 'src', 'views')));

// Rutas para manejar exámenes
app.post('/recibir-datos', ensureAuthenticated, ensureRole('teacher'), async (req, res) => {
    if (!req.body || !req.body.miDato) {
        console.error('Petición incorrecta o falta el dato');
        return res.status(400).json({ error: "Bad Request or missing request" });
    }
    console.log('Dato recibido:', req.body.miDato);

    let miDato = req.body.miDato;
    let messages = [{ role: "user", content: miDato }];

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages
        });

        let botResponse = completion.choices[0].message.content;
        console.log("Respuesta del bot (sin procesar):", botResponse);

        // Validar la estructura del JSON
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(botResponse);
        } catch (error) {
            console.error("Error al parsear la respuesta JSON:", error);
            return res.status(500).json({ error: "Invalid JSON format from OpenAI" });
        }

        if (!parsedResponse || !parsedResponse.botResponse || !parsedResponse.botResponse.content) {
            console.error("Estructura de contenido inválida:", parsedResponse);
            return res.status(400).json({ error: "Invalid content structure" });
        }

        const processedResponse = {
            botResponse: {
                content: parsedResponse.botResponse.content
            }
        };

        console.log("Respuesta del bot (procesada):", processedResponse);

        res.json(processedResponse);
    } catch (error) {
        console.error("Error from OpenAI API", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.post('/save-exam', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    const { title, topic, description_, level, content } = req.body;
    const teacher_id = req.user.id;

    console.log("Usuario autenticado:", req.user);
    console.log("ID del profesor:", teacher_id);
    console.log("Datos recibidos para guardar:", req.body);

    // Verificar que la estructura del contenido es correcta
    if (!content || !content.preguntas || !Array.isArray(content.preguntas) || content.preguntas.length === 0) {
        console.error("Estructura de contenido inválida:", content);
        return res.status(400).json({ error: "Invalid content structure" });
    }

    const examData = content; // El contenido del examen en formato JSON
    const examCode = Math.random().toString(36).substring(2, 10).toUpperCase(); // Generar un código único para el examen

    const examQuery = 'INSERT INTO exams_json (teacher_id, title, topic, description_, level, exam_code, exam_data) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(examQuery, [teacher_id, title, topic, description_, level, examCode, JSON.stringify(examData)], (err, examResults) => {
        if (err) {
            console.error('Error al guardar el examen:', err);
            return res.status(500).json({ error: 'Error al guardar el examen' });
        }

        res.json({ message: 'Examen guardado correctamente', id: examResults.insertId, accessCode: examCode });
    });
});

app.get('/get-exams-json', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    connection.query('SELECT id, title, topic, level, date, exam_code, exam_data FROM exams_json WHERE teacher_id = ?', [req.user.id], (err, results) => {
        if (err) {
            console.error('Error al obtener los exámenes:', err);
            return res.status(500).send('Error al obtener los exámenes');
        }
        res.json(results);
    });
});

app.get('/get-exam-json', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    const examId = req.query.id;
    connection.query('SELECT * FROM exams_json WHERE id = ?', [examId], (err, results) => {
        if (err) {
            console.error('Error al obtener el examen:', err);
            return res.status(500).send('Error al obtener el examen');
        }
        if (results.length === 0) {
            return res.status(404).send({ message: 'Examen no encontrado' });
        }
        res.json(results[0]);
    });
});

app.delete('/delete-exam', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    const examId = req.query.id;
    const sql = `DELETE FROM exams_json WHERE id = ?`;
    console.log(examId, sql);
    connection.query(sql, [examId], function (err) {
        if (err) {
            console.error(err.message);
            res.status(500).send(err);
        } else {
            console.log(`Row(s) deleted ${this.changes}`);
            res.status(200).send({ message: `Examen ${examId} eliminado correctamente` });
        }
    });
});

//PRUEBAS EXAMEN
// Ruta para obtener un examen por código
app.get('/get-exam-by-code', ensureAuthenticated, ensureRole('student'), (req, res) => {
    const examCode = req.query.code;
    connection.query('SELECT * FROM exams_json WHERE exam_code = ?', [examCode], (err, results) => {
        if (err) {
            console.error('Error al obtener el examen:', err);
            return res.status(500).json({ error: 'Error al obtener el examen' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Examen no encontrado' });
        }
        res.json(results[0]);
    });
});

// Ruta para guardar el resultado del examen
app.post('/save-exam-result', ensureAuthenticated, ensureRole('student'), (req, res) => {
    const { examId, finalScore } = req.body;
    const userId = req.user.id;

    const query = 'INSERT INTO exam_results (user_id, exam_id, score) VALUES (?, ?, ?)';
    connection.query(query, [userId, examId, finalScore], (err, results) => {
        if (err) {
            console.error('Error al guardar el resultado del examen:', err);
            return res.status(500).json({ error: 'Error al guardar el resultado del examen' });
        }
        res.json({ message: 'Resultado guardado correctamente' });
    });
});

// Modifica la ruta de vistaProfesor.html para mostrar los resultados
app.get('/get-exam-results', ensureAuthenticated, ensureRole('teacher'), (req, res) => {
    const examId = req.query.examId;
    const query = 'SELECT er.*, u.username, er.timestamp FROM exam_results er JOIN users u ON er.user_id = u.id WHERE er.exam_id = ?';
    connection.query(query, [examId], (err, results) => {
        if (err) {
            console.error('Error al obtener los resultados:', err);
            return res.status(500).json({ error: 'Error al obtener los resultados' });
        }
        res.json(results);
    });
});

//
app.listen(8080, () => console.log("Server started on http://localhost:8080"));
