// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs');
var session = require('client-sessions');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

app.use(session({
  cookieName: 'session',
  secret: process.env.SESSION_SECRET,
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  //httpOnly: true,
  //secure: true,
  ephemeral: true  
}));

app.use(function(req, res, next) {
  console.log("middleware");
  if (req.session && req.session.role) {
      console.log("middleware 2 " + req.session.role + " : " + JSON.stringify(req.url));
      res.locals.role = req.session.role;
      next();
  } else {
    next();
  }
});

function requireLogin (req, res, next) {
  if (!req.session.role) {
    res.redirect('/login');
  } else {
    next();
  }
};

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", requireLogin, function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

//var database = require("./database.json"); 
function getDatabaseContent() {
  const text = fs.readFileSync('./database.json','utf8');
  console.log(text);
  return JSON.parse(text);
}

function setDatabaseContent(content)
{
  fs.writeFileSync('./database.json', JSON.stringify(content, null, 2));
}

app.get("/login", function (request, response) {
  response.sendFile(__dirname + '/views/login.html');
});

app.post('/login', function(req, res) {
  console.log("/login post " + JSON.stringify(req.body) + " : " + JSON.stringify(req.params) + " : " + JSON.stringify(req.query))
  if (req.body.secret) {
    if (req.body.secret == process.env.USER_SECRET) {
        req.session.role = "user";
        res.redirect('/');      
    }
    else {
      res.sendStatus(403);  // unauthorized
    }
  }
});

app.get('/logout', function(req, res) {
  req.session.reset();
  res.redirect('/');
});

app.get("/bookings", function (request, response) {

  response.send(getDatabaseContent())
});

app.put("/bookings/:id", function(request, response) {
  var id = request.params.id;
  var database = getDatabaseContent();
  database[id-1] = request.body;
  setDatabaseContent(database);
  response.sendStatus(200);
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
