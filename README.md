usey
----

Generic middleware/plugin framework inspired by express.js's .use()

about
-----

[![build status](https://secure.travis-ci.org/wankdanker/node-usey.png)](http://travis-ci.org/wankdanker/node-usey)

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

named chains example
--------------------

```js
var Usey = require('usey');

var app = Usey();

//do a thing, and then goto cleanup
//going to cleanup because of this is not going to happen
//because doThing is going to throw an error
app.use(doThing, Usey.goto('cleanup'));

//use the goto helper to jump to the cleanup chain when
//and if the error chain gets hit
app.use('error', Usey.goto('cleanup'))
app.use('cleanup', doCleanup)

app({ x : 0 }, function (err, obj) {

});

function doThing (obj, next) {
	//throwing an error will cause the 'error' chain
	//to be called
	return next(new Error("this thing failed"));
}

function doCleanup (obj, next) {
	return next();
}
```

usage
-----

### Create an instance

When you create an instance by calling `Usey()`, it returns a function. That
function has one method: `.use()`.

```js
var Usey = require('usey');
var u = Usey(); //this creates the instance function
```

The Usey constructor takes an options object with the following options:

* context : [object] this is the context (the `this` value) for each of the functions passed
to the `use()` function and for the main callback.
    * By default a new empty object created when calling the usey instance function
    and that is used as the context for each function passed to `use()`
* timeout : [number] a numeric value that specifies the maximum number of milliseconds to wait
for any of the .use() specified functions to callback
* stackNames : [boolean] if true, when `.use()` is called, we will use stack traces
to determine where the function was defined. This information is used when debugging
* debug : [function] an optional function that will be called with debug information.
If not defined, it defaults to using the `debug` module.

### Add middleware/plugins/functions

When you call the `.use()` method, you may pass it a single function, an array
of functions or many functions as arguments.

```js
u.use(fn1);
u.use([fn2, fn3, fn4]);
u.use(fn5, fn6, fn7, fn8);
u.use(fn9);
```

### Remove middleware/plugins/functions

When you call the `.unuse()` method passing it a function reference, you can remove
that function from the processing chain.

```js
u.unuse(fn9);
```

### Inserting / unshifting middleware/plugins/functions

You can insert a function to specific position using `.insert()` or `.unshift()`

```js
//put the function f10 at the beginning of a chain
u.unshift(f10);

//put the function f11 at some specific position
u.insert(5, f11);

//you can also to it to named chains
u.unshift('error', logErrorMessage);

u.insert('cleanup', 4, closeDatabase);
```

### Call the main function

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

Named Function Chains
---------------------

You may call the `.use()` method passing it a string as the first argument. That
string should be the name of a chain. You can then call that chain from another.

The named chain `error` is a special named chain that will be called if an error
is passed to the `next()` callback at any time. The `error` named chain will be
processed before the main callback will be called. This is helpful for cleaning up
after errors have occurred.

```js
var u = Usey();

u.use(openDatabase('mydatabase'));
u.use(beginTransaction);
u.use(insertOrderHeader);
u.use(insertOrderItems);
u.use(commitTransaction);
u.use(goto('finally'));
u.use('finally', closeDatabase);
u.use('finally', closeRedis);
u.use('error', rollbackTransaction);
u.use('error', goto('finally'));

u(order, function (err) {
	//done
});

function openDatabase(db) {
	return function () {
		var self = this
			, next = getNext(arguments);

		//this is hypothetical
		mysql.open(db, function (err, client) {
			if (err) {
				return next(err);
			}

			self.db = client;

			return next();
		});
	}
}

function beginTransaction() {
	var next = getNext(arguments);

	this.db.beginTransaction(next);
}

function goto(name) {
	return function () {
		var next = getNext(arguments);

		next(name);
	}
};

function getNext(a) {
	return a[a.length -1];
}
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
