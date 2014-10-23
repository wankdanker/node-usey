module.exports = Usey;

function Usey (options) {
    var chains = {};

    options = options || {};

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

        push(chains[null], null);

        next();

        function next (err) {
            if (err) {
                if (typeof err === 'string') {
                    if (chains[err]) {
                        //load the named chain on to the stack
                        push(chains[err], err);
                    }
                    else {
                        //pop off the top of the stack
                        pop();
                    }

                    return next();
                }
                else if (chains.error) {
                    stack = [];
                    push(chains.error, 'error');
                    args.unshift(err);
    
                    return next();
                }
            }

            chain = top();
            
            fn = chain.chain[chain.index++];
           
            if (!fn) {
                //reached the end of the chain at the top of the stack
                //get to the next level of the stack and try again
                pop();
                chain = top();
                
                if (chain) {
                    fn = chain.chain[chain.index++];
                }
                else {
                    fn = null;
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

            if (Array.isArray(fn)) {
                chain.seqIndex = 0;
                args.pop();
                args.push(nextInSequence);

                return nextInSequence();
            }

            return fn.apply(context, args);
        }

        function nextInSequence (err) {
            if (err && typeof err === 'object') {
                //if there is an error, just go back to the next function
                //and let it handle exiting
                //we only want to do that when it is an object, because
                //a string may be passed to this function to exit the
                //sequence and move on to the next link in the chain

                return next(err);
            }

            var sfn = fn[chain.seqIndex++];

            if (err && typeof err === 'string') {
                //if a string is passed instead of err, then we 
                //need to jump out of the sequence early or jump to
                //the named chain if it exists. We can fake exiting
                //by forcing the sequence function to null

                if (chains[err]) {
                    args.pop();
                    args.push(next);

                    return next(err);
                }
                else {
                    sfn = null;
                }
            }

            if (!sfn) {
                //prepare for going to processing each chain index
                args.pop();
                args.push(next);
                
                return next();
            }

            return sfn.apply(context, args);
        }

        function push (chain, name) {
            var c = { chain : chain, index : 0, seqIndex : 0, name : name };

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
        var check, args, chain, name = null, u;

        if (typeof fn === 'string') {
            name = fn;
        }

        chain = chains[name] = chains[name] || [];
        
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

        if (name) {
            //push a new usey instance
            //u = Usey({ context : 'this' });
            //u.use(fn);
            chain.push(fn);
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
