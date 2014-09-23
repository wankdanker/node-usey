usey
----

This module generates a single function which when called will pass the values
passed to it to each of the functions specified with the `.use()` method. If one
of the functions passes an error to the `next()` function the main callback will
be immediately called (if specified) and no functions further in the chain will
be processed.

This is inspired by the express.js `.use()` method and is a generic implementation
of it.

install
-------

```bash
npm install usey
```

basic example
-------------

```js
var Usey = require('usey');

var app = Usey();

app.use(function (obj1, obj2, next) {
   obj1.x += 1;
   obj2.y += 1;

   return next();
});

app.use(function (obj1, obj2, next) {
   obj1.x += 2;
   obj2.y += 2;

   return next();
});

app({ x : 0 }, { y : 0 }, function (err, obj1, obj2) {
   console.log(arguments);
});
```

usage
-----

###Create an instance

When you create an instance by calling `Usey()`, it returns a function. That
function has one method: `.use()`.

```js
var Usey = require('usey');
var u = Usey(); //this creates the instance function
```

###Add middleware/plugins/functions

When you call the `.use()` method, you may pass it a single function, an array
of functions or many functions as arguments.

```js
u.use(fn1);
u.use([fn2, fn3, fn4]);
u.use(fn5, fn6, fn7, fn8);
u.use(fn9);
```

###Calling the main function

Now when you call `u(arg1, arg2, arg3, ..., function (err, arg1, arg2, arg3, ...){})`,
it will in turn call, in order:

```js
fn1(arg1, arg2, arg3, ..., next);
fn2(arg1, arg2, arg3, ..., next);
fn3(arg1, arg2, arg3, ..., next);
fn4(arg1, arg2, arg3, ..., next);
fn5(arg1, arg2, arg3, ..., next);
fn6(arg1, arg2, arg3, ..., next);
fn7(arg1, arg2, arg3, ..., next);
fn8(arg1, arg2, arg3, ..., next);
fn9(arg1, arg2, arg3, ..., next);
```

However, it will only call each function after the currently executing function
calls the `next()` method.

```js
var obj = {};
u(obj, function (err, obj) {
	console.log(obj);
});
```

http server example
-------------------

```js
var Usey = require('usey')
   , responseTime = require('response-time') 
   ;

var app = Usey();

app.use(responseTime()) //this middleware adds a X-Response-Time http header
   .use(Redirect) //this middleware attaches .redirect() to the response object
   .use(Router(app)) //this middleware attaches .get() and .post() methods to app
   .use(_404) //this middleware is called last

app.get('/test', function (req, res, next) {
   return res.end('hello');
});

app.get('/redirect-me', function (req, res, next) {
   return res.redirect('https://www.npmjs.org');
});

var server = http.createServer(app)

server.listen(1337);

function Redirect(req, res, next) {
   //append redirect method to response object
   res.redirect = function (url) {
      res.writeHead(302, {
         Location : url
      });
   };

   return next();
}

function Router(app) {
   var routes = [];

   ['get', 'post'].forEach(function (method) {
      app[method] = addRoute.bind(app, method)
   });

   app.add = addRoute;

   function addRoute (method, path, handler) {
      routes.push({
         method : method.toUpperCase()
         , path : path
         , handler : handler
      });

      return app;
   }

   return function (req, res, next) {
      var route;
      for (var x = 0; x < routes.length; x ++ ){
         route = routes[x];

         if (route.method == req.method && route.path == req.url) {
            return route.handler(req, res, next);
         }
      };

      return next();
   }
}

function _404 (req, res, next) {
   res.writeHead(404);
   res.end('File not found');
}
```

license
-------

MIT
