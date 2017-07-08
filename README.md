A glitch test application
=========================

Test of some web technologies along with the glitch dev+hosting environment.

* [express js](https://expressjs.com/) - for http server and rest api implementation
* [socket.io](https://socket.io/) - for server side events
* [nosql](https://www.npmjs.com/package/nosql) - for a light weight json database
* [client-sessions](https://github.com/mozilla/node-client-sessions) - for security
* [(p)react](https://github.com/developit/preact) - for user interface
* [babel](https://babeljs.io/) - to enable client side jsx

and the almost mandatory technlogies ofcourse

* [boostrap](http://getbootstrap.com/) - for styling
* [jQuery](https://jquery.com/) - for... things... (currently mostly for rest api calls to the server)

Glitch general note
-------------------

On the front-end,
- edit `public/client.js`, `public/style.css` and `views/index.html`
- drag in `assets`, like images or music, to add them to your project

On the back-end,
- your app starts at `server.js`
- add frameworks and packages in `package.json`
- safely store app secrets in `.env` (nobody can see this but you and people you invite)


