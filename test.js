var test = require('tape');
var usey = require('./');

usey.defaults.stackNames = true;

test('straight forward usage', function (t) {
	t.plan(1);

	var u = usey();

	u.use(add1).use(add2).use(add3);

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 6);
		t.end();
	});
});

test('straight forward usage with async/await', async function (t) {
	t.plan(2);

	var u = usey();

	u.use(add1Async).use(add2Async).use(add3Async);

	var [obj1, obj2] = await u({ x : 0 }, {b : 1});

	t.equal(obj1.x, 6);
	t.equal(obj2.b, 1);
	t.end();
	
});

test('async/await: pass an error to next()', async function (t) {
	t.plan(1);

	var u = usey();

	u.use(function (obj1, obj2, next) {
		return next(new Error('test error'));
	});

	try {
		var [obj1, obj2] = await u({ x : 0 }, {b : 1});
	} catch (e) {
		t.equal(e.message, 'test error');
		t.end();
	}
});

test('async/await: throw an error', async function (t) {
	t.plan(1);

	var u = usey();

	u.use(function (obj1, obj2) {
		throw new Error('test error');
	});

	try {
		var [obj1, obj2] = await u({ x : 0 }, {b : 1});
	} catch (e) {
		t.equal(e.message, 'test error');
		t.end();
	}
});

test('using a sequence', function (t) {
	t.plan(1);

	var u = usey();

	u.use(add1, add2, add3)
		.use(add1, add2, add3)

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 12);
		t.end();
	});
});

test('using a sequence async/await', async function (t) {
	t.plan(1);

	var u = usey();

	u.use(add1Async, add2Async, add3Async)
		.use(add1Async, add2Async, add3Async)

	var [obj] = await u({ x : 0 });
	
	t.equal(obj.x, 12);
	t.end();
});

test('passing an error to next()', function (t) {
	t.plan(2);

	var u = usey();

	u.use(add1)
		.use(add2)
		.use(passAnError)
		.use(add3)

	u({ x : 0 }, function (err, obj) {
		t.equal(err.message, 'Things did not work out')
		t.equal(obj.x, 3);
		t.end();
	});
});

test('passing an error to next() async/await', async function (t) {
	t.plan(2);

	var u = usey();

	u.use(add1Async)
		.use(add2Async)
		.use(passAnErrorAsync)
		.use(add3Async)

	var obj = { x : 0 }

	try {
		await u(obj);
	}
	catch (err) {
		t.equal(err.message, 'Things did not work out')
		t.equal(obj.x, 3);
		t.end();
	}
});

test('exit a sequence early', function (t) {
	t.plan(2);

	var u = usey();

	u.use(add1, add2, add3)
		.use(add1, exitSequence, add2, add3)
		.use(add1, add2, add3);

	u({ x : 0 }, function (err, obj) {
		t.equal(err, null);
		t.equal(obj.x, 13);
		t.end();
	});
});

test('exit a sequence early async/await', async function (t) {
	t.plan(1);

	var u = usey();

	u.use(add1Async, add2Async, add3Async)
		.use(add1Async, exitSequence, add2Async, add3Async)
		.use(add1Async, add2Async, add3Async);

	var [obj] = await u({ x : 0 });

	t.equal(obj.x, 13);
	t.end();
});

test('anonymous chaining', function (t) {
	t.plan(1);

	usey().use(add1).use(add2).use(add3)
	({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 6);
		t.end();
	});
});

test('custom context', function (t) {
	var ctx = { a : 0 };

	t.plan(6);

	u = usey({ context : ctx }).use(function (obj, cb) {
		obj.a = this.a++;

		return cb();
	}).use(function (obj, cb) {
		obj.b = this.a++;

		return cb();
	})

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.a, 0);
		t.equal(obj.b, 1);
		t.equal(obj.x, 0);
	});

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.a, 2);
		t.equal(obj.b, 3);
		t.equal(obj.x, 0);

		t.end();
	});
});

test('unique context (default)', function (t) {
	t.plan(2);

	u = usey().use(function (obj, cb) {
		this.a = this.a || 0;

		return cb();
	}).use(function (obj, cb) {
		this.a += 1;

		return cb();
	});

	u({ x : 0 }, function (err, obj) {
		t.equal(this.a, 1);
	});

	u({ x : 0 }, function (err, obj) {
		t.equal(this.a, 1);
		t.end();
	});

});

test('throws on non-function argument', function (t) {
	t.plan(1);

	t.throws(function () {
		u = usey().use('asdf','asdf')
			.use(function (obj, cb) {
				return cb();
			})

		u({ x : 0 }, function (err, obj) {

		});
	}, /non-function argument/gi);
});

test('fn should not be global', function (t) {
	t.plan(1);

	u = usey().use(add1)
		.use(add2)
		.use(add3)

	u({ x : 0 }, function (err, obj) {
		t.equal(global.hasOwnProperty('fn'), false, 'fn is not a global');
		t.end();
	});
});

test('special error chains', function (t) {
	var a = [];
	t.plan(6);

	u = usey().use(add1)
		.use(passAnError)
		.use('error', function (err, obj, next) {
			setImmediate(function () {
				a.push(1);
				t.equal(typeof err, 'object');
				t.equal(err.message, 'Things did not work out');

				return next();
			});
		})
		.use('error', function (err, obj, next) {
			t.equal(typeof err, 'object');
			t.equal(err.message, 'Things did not work out');

			return next();
		})
		.use(add3);

	u({ x : 0 }, function (err, obj) {
		a.push(2);

		t.deepEqual(a, [1,2]);
		t.equal(typeof err, 'object');
		t.end();
	});
});

test('named chains', function (t) {
	t.plan(1);

	u = usey().use(add1, add2, add3)
		.use('test', add3)
		.use('test2', add1)
		.use(function (obj, next) {
			return next('test');
		})
		.use(add2);

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 11);
		t.end();
	});
});

test('stack and named chaing usage', function (t) {
	u = usey();

	u.use('a', function (obj, next) {
		obj.x += 1;

		return next();
	}, function (obj, next) {
		if (obj.x > 5) {
			return next('quit'); //quit is arbitrary, it's just a non existent named chain
		}

		//create a loop
		return next('a');
	});

	u.use(function (obj, next) {
		return next('a');
	});

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 6);
		t.end();
	});
});

test('special exit next value to get out of deep stack; goto; getNext', function (t) {
	t.plan(1);

	u = usey();

	u.use('a', add1, usey.goto('b'), add3);
	u.use('b', add1, usey.goto('c'), add3);
	u.use('c', add1, usey.goto('d'), add3);
	u.use('d', usey.goto('exit'), add3);
	u.use(usey.goto('a'));

	u({ x : 0 }, function (err, obj) {
		console.log(err);
		t.equal(obj.x, 3);
		t.end();
	});
});

test('test timeout option', function (t) {
	t.plan(2);

	u = usey({ timeout : 100 });

	u.use(add1, add1, add1);
	u.use(function (obj, next) {
		setTimeout(next, 200)
	});
	u.use(add3);

	u({ x : 0 }, function (err, obj) {
		t.equal(err && err.message, 'usey encountered a timeout', 'error message is correct');
		t.equal(obj.x, 3);
		t.end();
	});
});

test('unuse() should clear out the chain', function (t) {
	u = usey();

	u.use(add1, add1, add1);
	u.use(add3);

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 6);

		u.unuse();
		u({x : 0}, function (err, obj) {
			t.equal(obj.x, 0);
			t.end();
		});
	});
});

test('unuse(add1, true) should remove all add1 functions', function (t) {
	u = usey();

	u.use(add1, add1, add1);
	u.use(add3);

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 6);

		u.unuse(add1, true);
		u({x : 0}, function (err, obj) {
			t.equal(obj.x, 3);
			t.end();
		});
	});
});

test('events.on() and events.emit() should work', function (t) {
	t.plan(3);

	u = usey();

	u.events.on('step1', function (val) {
		t.deepEqual(val, { x : 0 });
	});

	u.events.on('step2', function (val) {
		t.deepEqual(val, { x : 1 });
	});

	u.use(function (a, next) {
		u.events.emit('step1', a);

		a.x += 1;

		return next();
	});

	u.use(function (b, next) {
		u.events.emit('step2', b);

		b.x += 1;

		return next();
	});

	u({ x : 0 }, function (err, obj) {
		t.deepEqual(obj, { x : 2 });
		t.end();
	});
});

test('test unshift and unuse', function (t) {
	u = usey();

	u.use(add1, add1, add1);
	u.use(add3);
	u.unshift(mult3);

	u({ x : 1 }, function (err, obj) {
		t.equal(obj.x, 9);

		u.unuse(add1, true);
		u({x : 1}, function (err, obj) {
			t.equal(obj.x, 6);
			t.end();
		});
	});
});

test('test insert and unuse', function (t) {
	u = usey();

	u.use(add1, add1, add1);
	u.use(add3);
	u.insert(1, mult3);

	u({ x : 1 }, function (err, obj) {
		t.equal(obj.x, 15);

		u.unuse(add1, true);
		u({x : 1}, function (err, obj) {
			t.equal(obj.x, 6);
			t.end();
		});
	});
});

function add1 (obj, next) {
	obj.x += 1;

	return next();
}

function add2 (obj, next) {
	obj.x += 2;

	return next();
}

function add3 (obj, next) {
	obj.x += 3;

	return next();
}

function add1Async (obj) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			obj.x += 1;

			resolve(obj);
		}, 30);
	});
}

function add2Async (obj) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			obj.x += 2;

			resolve(obj);
		}, 20);
	});
}

function add3Async (obj) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			obj.x += 3;

			resolve(obj);
		}, 10);
	});
}

function mult3 (obj, next) {
	obj.x = obj.x * 3;

	return next();
}

function passAnError(obj, next) {
	return next(new Error('Things did not work out'));
}

function passAnErrorAsync(obj) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			reject(new Error('Things did not work out'))
		}, 10)
	});
}


function exitSequence(obj, next) {
	return next('use');
};



