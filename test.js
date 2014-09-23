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
