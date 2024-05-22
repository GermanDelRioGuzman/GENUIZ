const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;

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

passport.use(new PassportLocal(function(username, password, done){
    if (username === "admin" && password === "123")
        return done(null, { id: 1, name: "Cody" });
    done(null, false);
}));
// { id: 1, name: "Cody" }
// 1 -> Serializacion

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    done(null, { id: 1, name: "Cody" });
});

app.set('view engine', 'ejs');

app.get("/",(req,res,next)=>{
    if (req.isAuthenticated()) return next();

    res.redirect("/login");
},(req,res) =>{
    //si ya iniciamos mostrar bienvenida 
    
    //si no hemos iniciado sesion redireccionar a /login
    res.send("HOLA DANIELA");
})

app.get("/login",(req,res) => {
    //mostrar el formulario de login 
    res.render("login");
});

app.post("/login", passport.authenticate('local',{
    successRedirect: "/",
    failureRedirect: "/login"
}));

app.listen(8080, ()=> console.log("Server started")); 