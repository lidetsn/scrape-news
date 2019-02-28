var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
exphbs = require('express-handlebars'),
path = require('path');

var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");
var PORT = 3000;

var app = express();

//,,,,,,,,,,,,,,,,,,,,,,,,,,,
// use handlebars
app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine", "handlebars");


app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));
//app.use(express.static(path.join(__dirname, 'public')));
// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/teckNewsDb", { useNewUrlParser: true });

// app.get("/", function(req, res) {

//   db.Article.find({
//       saved: false
//     },

//     function(error, dbArticle) {
//       if (error) {
//         console.log(error);
//       } else {
//         res.render("index", {
//           articles: dbArticle
//         });
//       }
//     })
// })

// Routes
// A GET route for scraping the echoJS website
//==============================================================================================
app.get("/scrape", function(req, res) {
axios.get("https://techcrunch.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
     console.log(">>>>>>>>>>>>>>.")
     console.log(response.data)
    $("div .post-block ").each(function(i, element) {
      // Save an empty result object
      var result = {};     
      result.title = $(this).children('header').children('h2')
        .children("a")
        .text();
         result.summary = $(this).children('div')
         .text();
      result.link = $(this).children('header').children('h2')
        .children("a")
        .attr("href");
      db.Article.create(result)
        .then(function(dbArticle) {
          //for testing purpose
          console.log(dbArticle);
          // res.render("index", {
          //   articles: dbArticle
          // });
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

//======================== Route for getting all Articles from the db modefied ok=================
app.get("/articles", function(req, res) {
  db.Article.find({})
    .then(function(dbArticle) {      
      console.log(dbArticle)
      res.render("index", {
                  articles: dbArticle
                });
    })
    .catch(function(err) {
      res.json(err);
    });
});
//==================================================================================================

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.render("index", {
        articles: dbArticle
      });
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
