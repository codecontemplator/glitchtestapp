//
// Load dependencies
//

var express = require('express');
var app = express();

// ref: https://github.com/socketio/socket.io/blob/master/examples/cluster-nginx/server/index.js
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser')
var fs = require('fs');
var session = require('client-sessions');
var nosql = require('nosql');
var uuid = require('uuid');


//
// Initialize database
//

var db = nosql.load('./database.nosql');

db.find().make(function(filter) {
    filter.callback(function(err, response) {
        console.log("Database content at startup: " + JSON.stringify(response));
    });
})

//
// Babel setup
//

var { File, transformFile } = require('babel-core');
const babel_opts = JSON.parse(fs.readFileSync('package.json')).babel;

//
// Security middleware
//

const clientSessionSettings = {
  cookieName: 'session',
  secret: process.env.SESSION_SECRET,
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: true,
  ephemeral: true  
};

app.use(session(clientSessionSettings));

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

//
// Static files etc
// 

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

app.use(express.static('public'));

app.get("/", requireLogin, function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


//
// The api
// 

var sessions = {};

function fireEvent(sessionId, eventName, eventData) {
  var session = sessions[sessionId];
  if (session) {
    session.socket.broadcast.emit(eventName, eventData);  
  }  
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

app.get("/userinfo", function(request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.send(JSON.stringify({ role: request.session.role }));
});

app.get("/login", function (request, response) {
  response.sendFile(__dirname + '/views/login.html');
});

app.post('/login', function(req, res) {
  if (req.body.secret) {
    if (req.body.secret == process.env.USER_SECRET) {
        const sessionId = uuid.v4(); 
        req.session.role = "user";      
        req.session.id = sessionId;
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

app.put("/list/:id/items/:itemId", requireLogin, function(request,response,next) {
  const listId = request.params.id;
  const itemId = request.params.itemId;
  var itemData = request.body;
  itemData.id = itemId;
  itemData.listId = listId;
  const databaseQuery = new Promise((resolve, reject) => {
    db.update(itemData).where('id', itemId).callback(function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }      
    });
  });
  
  databaseQuery.then(() => {
    response.sendStatus(200);
    fireEvent(request.session.id, 'item-updated', itemData);
  });    
});


//
// Start server process
//
server.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + server.address().port);
});

//
// Pubsub
//

// ref: https://stackoverflow.com/questions/18475543/how-access-session-data-of-node-client-sessions-on-socket-io
var cookie = require('cookie');
var encode = require('client-sessions').util.encode;
var decode = require('client-sessions').util.decode;

// Authorization middleware. Check that the request contains a valid session token
io.use(function(socket, next) {
  var handshakeData = socket.request;
  
  if (!handshakeData.headers.cookie) {
    next(new Error('not authorized'));
  }

  var session = decode(clientSessionSettings, cookie.parse(handshakeData.headers.cookie).session).content;
  
  if (!session.role) {
      next(new Error('not authorized'));
  }

  // add the socket to the session object and store it globally for access by the rest api
  session.socket = socket;
  sessions[session.id] = session;

  socket.on('disconnect', function() {
      delete sessions[session.id];
  });  
  
  next();
});

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {
  
  socket.on('begin-item-edit', function (data) {
    console.log("begin-item-edit");
		socket.broadcast.emit('begin-item-edit', data);    
  });
  
  socket.on('end-item-edit', function (data) {
    console.log("end-item-edit");
		socket.broadcast.emit('end-item-edit', data);        
  });
  
});