var dephault = require('./dephault');
var EventEmitter = require('events').EventEmitter;
var promise = require('./promise');

module.exports = Usey;

Usey.defaults = {
  debug : noop
  , stackNames : false
};

Usey.getNext = function (args) {
    //for simplicity, return the last argument assuming it is the next function
    //TODO: check name of function is next, try other arg slots if not found
    return args[args.length - 1];
};

Usey.goto = function (destination) {
    return function () {
        //get the `next` callback and call it with destination;
        Usey.getNext(arguments)(destination);
    };
};

Usey.next = function () {
    return function () {
        Usey.getNext(arguments)();
    };
};


/**
 * Create a new instance of a Usey chain
 *
 * @param {*} options
 * @returns
 */
function Usey (options) {
    var root = []
        , chains
        ;

    options = options || {};
    chains = options.chains || {};

    options.debug = dephault(options, 'debug', Usey.defaults.debug);
    options.stackNames = dephault(options, 'stackNames', Usey.defaults.stackNames);

    UseyInstance.use = use;
    UseyInstance.unuse = unuse;
    UseyInstance.unshift = unshift;
    UseyInstance.insert = insert;
    UseyInstance.events = new EventEmitter();

    return UseyInstance;

    function UseyInstance () {
        var context = (options.context === 'this')
                ? this
                : options.context || {}
            , args = Array.prototype.slice.call(arguments)
            // if the last arg is a function then it's the callback
            , cb = (typeof args[args.length - 1] === 'function')
                ? args.pop()
                : promise()
            , fn
            , stack = []
            , chain
            , timedout = 0
            , timeout
            , dbg = options.debug || debug
            , cbpromise
            ;

        //or unshift
        args.push(next);

        push(root, null);

        if (cb.promise) {
            cbpromise = cb.promise;

            next();

            return cbpromise;
        }
        
        return next();

        function next (err) {
            if (timeout) {
                clearTimeout(timeout);
            }

            if (err) {
                if (typeof err === 'string') {
                    if (chains[err]) {
                        //if there are no functions left in the current
                        //chain, then we can get pop this chain off the
                        //stack before pushing the next chain.
                        //pseudo-tail-call
                        if (chain.index > chain.chain.length) {
                            pop();
                        }

                        //load the named chain on to the stack
                        push(chains[err], err);

                        return next();
                    }
                    else if (err === 'exit') {
                        //it has been requested that we exit; this is
                        //a non-error situation where it was requested
                        //that we exit all stacks and just call the callback
                        stack = null;

                        //we don't call next, because we want to fall through
                        //to calling the callback
                    }
                    else {
                        //pop off the top of the stack
                        pop();

                        return next();
                    }
                }
                else if (chains.error) {
                    stack = [];
                    push(chains.error, 'error');
                    args.unshift(err);

                    return next();
                }
            }

            //do some accounting;
            if (fn) {
                fn._exit += 1;
                fn._pending -= 1;
            }

            chain = top();

            if (!chain) {
                fn = null;
            }
            else {
                fn = chain.chain[chain.index++];
            }

            if (!fn && chain && chain.name != 'error') {
                //reached the end of the chain at the top of the stack
                //get to the next level of the stack and try again
                pop();
                chain = top();

                if (chain) {
                    fn = chain.chain[chain.index++];
                }
            }

            if (!fn || err) {
                if (!cb) {
                    //no callback specified, nothing else to do.
                    return;
                }

                //pop off the next() reference in the args array
                args.pop();

                //if we are processing the error chain, then the error
                //has already been unshifted into the beginning of the args
                //array
                if (!chain || chain.name !== 'error') {
                    //push the error into the callback args array
                    args.unshift(err || null);
                }

                var r = cb.apply(context, args);

                //prevent cb from being called again
                cb = null;

                //clean up
                stack = null;
                UseyInstance = null;

                return r;
            }

            if (options.timeout) {
                timeout = setTimeout(function () {
                    timedout += 1;

                    return next(new Error('usey encountered a timeout'));
                }, options.timeout);
            }

            fn._enter += 1;
            fn._pending += 1;

            dbg('Calling: ', fn._name || fn.name);

            var r = fn.apply(context, args);

            if (r instanceof Promise) {
                return r.then(function (data) {
                    //TODO: what to do with data
                    return next()
                }).catch(next);
            }

            return r;
        }

        function push (chain, name) {
            var c = { chain : chain, index : 0, name : name };

            stack.push(c);

            return c;
        }

        function top () {
            return (!stack) ? null : stack[stack.length - 1];
        }

        function pop () {
            return stack.pop();
        }
    }

    /**
     * Adds a function, functions or array of functions
     * 
     * @param {Number} [index] optional integer position where to add the function
     * @param {String} [chain] optional named chain to add the function
     * @param {Function|Array.<Function>} [fn] the function to add or an array of functions
     * @returns
     */
    function use (/*[index,] [chainName,]*/ fn) {
        var check, args, chain, name, u, index;

        if (typeof fn === 'number') {
            index = fn;
            fn = arguments[1];
        }

        if (typeof fn === 'string') {
            name = fn;
            chain = chains[name] = chains[name] || [];
        }
        else {
            chain = root;
        }

        if (arguments.length > 1) {
            fn = Array.prototype.slice.call(arguments)


            //if we had an insert index then we need to shift
            //the arguments over
            if (typeof index !== 'undefined') {
                fn.shift();
            }

            //if we have a valid name then we should pull it
            //out of the array so we're just left with the non-name
            //args
            if (name) {
                fn.shift();
            }
        }

        check = validateUse(fn);

        if (check) {
            throw new Error(check);
        }

        if (Array.isArray(fn)) {
            if (fn.length > 1) {
                //push a new usey instance
                u = Usey({ context : 'this', chains : chains });

                fn.forEach(function (f) {
                    u.use(initializefn(f));
                });

                add(u);
            }
            else {
                add(initializefn(fn[0]));
            }
        }
        else {
            add(initializefn(fn));
        }

        return UseyInstance;

        function add(fn) {
            if (index === 0) {
                chain.unshift(fn);
            }
            else if (index) {
                chain.splice(index, 0, fn);
            }
            else {
                chain.push(fn)
            }
        }
    }

    function initializefn (fn) {
        var stack;

        fn._enter = 0;
        fn._exit = 0;
        fn._pending = 0;

        if (options.stackNames && !fn._name) {
            stack = new Error('').stack.split('\n');

            for (var i = 0; i < stack.length; i++) {
              if (~stack[i].indexOf('at Function.use')) {
                i ++;
                break;
              }
            }

            for (; i < stack.length; i++) {
                if (!~stack[i].indexOf('usey')) {
                  break;
                }
            }

            fn._name = fn._name || (fn.name || 'anonymous') + stack[i].trim().replace('at ', ' from ');
        }

        return fn;
    }

    function validateUse(fn) {
        var result
            , x = 0
            ;

        if (Array.isArray(fn)) {
            if (fn.length === 0) {
                return 'No arguments specified';
            }

            for ( ; x < fn.length; x++ ) {
                if (typeof fn[x] !== 'function') {
                    result = 'Non-function argument found at index ' + x;
                    break;
                }
            }
        }
        else {
            if (typeof fn !== 'function') {
                result = 'Non-function argument found at index 0';
            }
        }

        return result;
    }


    //TODO: use fn._enter, fn._exit and fn._pending to determine if we
    //should remove later functions in a chain. The fear is that some caller
    //might be in the middle of a chain and then have the rug pulled out from
    //underneath them. They'll not be able to finish what they are doing.
    //Using the accounting numbers, we can make an attempt to wait a timeout
    //before unloading functions if they have _pending > 0. We can also look
    //at _enter and _exit to see if the function typically does not get a
    //callback to next()
    function unuse(fn, recurse) {
        var index
            , tmp
            , remove
            ;

        if (fn === true) {
            fn = null;
            recurse = true;
        }

        //if no fn is passed, unuse all functions
        if (!fn) {
            if (recurse) {
                root.forEach(function (fn) {
                    if (fn.name === 'UseyInstance') {
                        fn.unuse(true);
                    }
                });
            }

            root.length = 0;

            return UseyInstance;
        }

        if (recurse) {
            //look for UseyInstances to recurse into
            root.filter(function (checkfn, index) {
                if (checkfn.name === 'UseyInstance') {
                    checkfn.unuse(fn, true);
                };
            });
        }

        //remove all instances of fn
        while (~(index = root.indexOf(fn))) {
            root.splice(index, 1);
        }

        return UseyInstance;
    }

    function unshift () {
        var args = Array.prototype.slice.call(arguments);

        args.unshift(0);

        use.apply(use, args);

        return UseyInstance;
    }

    function insert (chain, index) {
        var args = Array.prototype.slice.call(arguments);

        if (typeof chain === 'string') {
            if (typeof index !== 'number') {
                throw new Error('insert index must be numeric')
            }

            args[0] = index;
            args[1] = chain;
        }

        use.apply(use, args);

        return UseyInstance;
    }
}

function noop () {}

