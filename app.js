const express = require("express");
const app = express();
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const path = require("path");
const Game = require("./models/Game");
const methodOverride = require("method-override");
const catchAsyncErr = require("./other/catchAsyncErr")
const ErrorClass = require("./other/ErrorClass");
const {gameSchema, commentSchema} = require("./validationSchemas")
const Comment = require("./models/comments")

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
app.use(methodOverride("_method"))

const validateGame = (req, res, next) => {
     
     let genreObj = req.body.genre; 
    let genreList = Object.keys(genreObj).map(key => (genreObj[key] === "on") ? key : "") 
    let platformsObj = req.body.platforms;
    let platformsList = Object.keys(platformsObj).map(key => (platformsObj[key] === "on") ? key : "")
    let games = {...req.body.games, genre:genreList, platforms: platformsList}
    const {error} = gameSchema.validate({games:games});
     if(error) {
         const msg = error.details.map(er => er.message).join(",")
         throw new ErrorClass(msg, 500)
    } else {
         next();
    }
}

const validateComment = (req, res, next) => {
    const {error} = commentSchema.validate({comment: req.body})
    if(error) {
        const msg = error.details.map(er => er.message).join(",")
        throw new ErrorClass(msg, 500)
   } else {
        next();
   }
}

app.get("/", (req, res) => {
    res.send("Working....")
})

app.get("/games", catchAsyncErr(async (req, res) => {
    const games = await Game.find({});
    res.render("./game/GameIndex", {allgames: games})
}))

app.get("/games/new", (req, res) => {
    res.render("./game/newGame");
})

app.post("/games", validateGame, catchAsyncErr(async(req, res, next) => {
    if(!req.body.games) throw new ErrorClass("Invalid Game", 500);
    let genreObj = req.body.genre; 
    let genreList = Object.keys(genreObj).map(key => (genreObj[key] === "on") ? key : "") 
    let platformsObj = req.body.platforms;
    let platformsList = Object.keys(platformsObj).map(key => (platformsObj[key] === "on") ? key : "")
    let game = new Game({...req.body.games, genre:genreList, platforms: platformsList});
    await game.save();
    res.redirect("/games");
   
}))

app.get("/games/:id", catchAsyncErr(async (req, res) => {
    const game = await Game.findById(req.params.id).populate("comments");
    console.log(game);
    res.render("./game/showGame", {game: game})
}))

app.delete("/games/:gameId/comments/:id", catchAsyncErr(async (req, res) => {
    const {gameId, id} = req.params;
    await Game.findByIdAndUpdate(gameId, {$pull: {comments: id}})
    await Comment.findByIdAndDelete(req.params.id);
    res.redirect(`/games/${gameId}`)
}))

app.post("/games/:id/comment", validateComment, catchAsyncErr(async(req, res) => {
    const game = await Game.findById(req.params.id)
    const comment = new Comment(req.body)
    game.comments.push(comment);
    await comment.save();
    await game.save()
    res.redirect(`/games/${req.params.id}`)
}))

app.get("/games/:id/edit", catchAsyncErr(async (req, res) => {
    const game = await Game.findById(req.params.id);
    res.render("./game/editGame", {game: game,})
}))

app.delete("/games/:id", catchAsyncErr(async (req, res) => {
    await Game.findByIdAndDelete(req.params.id)
    res.redirect("/games");
}))

app.put("/games/:id", validateGame, catchAsyncErr(async (req,res) => {
    const id = req.params.id;
    let genreObj = req.body.genre; 
    let genreList = Object.keys(genreObj).map(key => (genreObj[key] === "on") ? key : "") 
    let platformsObj = req.body.platforms;
    let platformsList = Object.keys(platformsObj).map(key => (platformsObj[key] === "on") ? key : "")
    await Game.findByIdAndUpdate(id, {...req.body.games, genre: genreList, platforms: platformsList})
    res.redirect(`/games/${id}`)
}))


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