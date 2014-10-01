var test = require('tape');
var usey = require('./');

test('straight forward usage', function (t) {
	t.plan(1);

	var u = usey();
	
	u.use(add1).use(add2).use(add3);

	u({ x : 0 }, function (err, obj) {
		t.equal(obj.x, 6);
		t.end();
	});
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

test('passing an error to next()', function (t) {
	t.plan(2);

	var u = usey();

	u.use(add1)
		.use(add2)
		.use(passAnError)
	
	u({ x : 0 }, function (err, obj) {
		t.equal(err.message, 'Things did not work out')
		t.equal(obj.x, 3);
		t.end();
	});
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
		u = usey().use('asdf')
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
		t.equal(global.hasOwnProperty('fn'), false, 'fn IS a global');
		t.end();
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

function passAnError(obj, next) {
	return next(new Error('Things did not work out'));
}

function exitSequence(obj, next) {
	return next('use');
};
