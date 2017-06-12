// server.js
// where your node app starts

// init project
var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
//app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

//var database = require("./database.json"); 
function getDatabaseContent() {
  return JSON.parse(fs.readFileSync('./database.json', 'utf8'));
}

function setDatabaseContent(content)
{
  fs.writeFileSync('./database.json', JSON.stringify(content, null, 2));
}

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
