// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs');
var session = require('client-sessions');
var nosql = require('nosql');
var db = nosql.load('./database.nosql');

db.find().make(function(filter) {
    filter.callback(function(err, response) {
        console.log("Database content at startup: " + JSON.stringify(response));
    });
})

var { File, transformFile } = require('babel-core');
var app = express();

const babel_opts = JSON.parse(fs.readFileSync('package.json')).babel;

//babel_opts.plugins = ['babel-plugin-transform-es2015-modules-systemjs'];

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

app.use(session({
  cookieName: 'session',
  secret: process.env.SESSION_SECRET,
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: true,
  ephemeral: true  
}));

app.use(function(req, res, next) {
  if (req.session && req.session.role) {
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

app.get(/.*\.js$/, (req, res, next) => {
  const path = `public${req.path}`;
  
  if (req.query['original'] !== undefined) {
    return fs.readFile(path, next);
  }
  
  transformFile(path, babel_opts, (err, result) => {
    if (err) {
      return next(err);
    }
    
    res.end(result.code);
  });
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", requireLogin, function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


app.get("/userinfo", function(request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.send(JSON.stringify({ role: request.session.role }));
});

//var database = require("./database.json"); 
function getDatabaseContent() {
  const text = fs.readFileSync('./database.json','utf8');
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

app.get("/list/:id/items", requireLogin, function (request, response) {
  const listId = request.params.id;
  const databaseQuery = new Promise((resolve, reject) => {
    db.find().make(function(filter) {
        filter.where('listId', '=', listId);
        filter.callback(function(err, resultset) {
            if (err) {
              reject(err);
            } else {
              resolve(resultset);
            }
        });
    })    
  });
  
  databaseQuery.then(data => response.send(data));
});

app.put("/list/:id/items/:itemId", function(request,response,next) {
  const listId = request.params.id;
  const itemId = request.params.itemId;
  var itemData = request.body;
  itemData.id = itemId;
  itemData.listId = listId;
  db.update(itemData).where('id', itemId);
  response.sendStatus(200);  // not sure if the update is completed here?
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
