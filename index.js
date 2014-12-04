module.exports = Usey;

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

function Usey (options) {
    var root = []
        , chains
        ;

    options = options || {};
    chains = options.chains || {};

    UseyInstance.use = use;

    return UseyInstance;

    function UseyInstance () {
        var context = (options.context === 'this')
                ? this
                : options.context || {}
            , args = Array.prototype.slice.call(arguments)
            // if the last arg is a function then it's the callback
            , cb = (typeof args[args.length - 1] === 'function')
                ? args.pop()
                : null
            , fn
            , stack = []
            , chain
            ;

        //or unshift
        args.push(next);

        push(root, null);

        next();

        function next (err) {
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
                        stack = [];

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

                return cb.apply(context, args);
            }

            return fn.apply(context, args);
        }


        function push (chain, name) {
            var c = { chain : chain, index : 0, name : name };

            stack.push(c);

            return c;
        }

        function top () {
            return stack[stack.length - 1];
        }

        function pop () {
            return stack.pop();
        }
    }

    function use (fn) {
        var check, args, chain, name, u;

        if (typeof fn === 'string') {
            name = fn;
            chain = chains[name] = chains[name] || [];
        }
        else {
            chain = root;
        }

        if (arguments.length > 1) {
            fn = Array.prototype.slice.call(arguments)

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
                    u.use(f);
                });
    
                chain.push(u);
            }
            else {
                chain.push(fn[0]);
            }
        }
        else {
            chain.push(fn);
        }

        return UseyInstance;
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
}
