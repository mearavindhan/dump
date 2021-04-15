if(process.env.NODE_ENV !== "production") {
    require("dotenv").config()
}
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const path = require("path");
const methodOverride = require("method-override");
const ErrorClass = require("./other/ErrorClass");
const session = require("express-session");
const flash = require("connect-flash");
const passport  = require("passport")
const LocalStrategy = require("passport-local")
const User = require("./models/user");
const Game = require("./models/Game")

const gameRoutes = require("./routes/gamesRoute");
const commentRoutes = require("./routes/commentsRoute")
const userRoutes = require("./routes/usersRoute");

const dbUrl ="mongodb://localhost:27017/game-hub";

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});


const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine("ejs", ejsMate)

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

app.use(express.urlencoded({extended : true}))
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const sessionProps = {
    secret: "hellosirindlnaln",
    resave: false,
    saveUninitialized: true ,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 *24 * 7,
        maxAge: 1000 * 60 * 60 *24 * 7,
        sameSite: 'strict'
    }
}
app.use(session(sessionProps))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", (req, res) => {
    res.send("Working....")
})

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error")
    next();
})



app.use("/games/:id/comment", commentRoutes)

app.use("/games", gameRoutes)

app.use("/", userRoutes); 

app.get("/search", async (req,res) => {
    const games = await Game.find({$text: {$search: req.query.query}})
    res.render("search", {foundGames : games})
})

app.get("/mygames", (req,res) => {
    res.render("./game/mygames")
})



app.get("*", (req, res, next) => {
    next(new ErrorClass("Page Not Found", 404) )
})

app.use((error, req, res, next) => {
    const { statusCode = 500} = error;
    if(!error.msg) {
        error.msg = "Internal Error"
    }
    res.status(statusCode).render("./error", {error});
})


app.listen(3000, () => {
    console.log("Server Listening...")
})