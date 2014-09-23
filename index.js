module.exports = Usey

function Usey (options) {
    var chain = [];

    UseyInstance.use = use;

    return UseyInstance;

    function UseyInstance () {
        var chainIndex = 0
            , sequenceIndex = 0
            , args = Array.prototype.slice.call(arguments)
            // if the last arg is a function then it's the callback
            , cb = (typeof args[args.length - 1] === 'function')
                ? args.pop()
                : null
            ;

        //or unshift
        args.push(next);

        next();

        function next (err) {
            fn = chain[chainIndex++];

            if (!fn || err) {
                if (!cb) {
                    //no callback specified, nothing else to do.
                    return;
                }

                args.pop();
                //push the error into the callback args array
                args.unshift(err || null);
                return cb.apply(cb, args);
            }

            if (Array.isArray(fn)) {
                //prepare for processing the sequence at this index in the chain
                sequenceIndex = 0;

                args.pop();
                args.push(nextInSequence);

                return nextInSequence();
            }

            return fn.apply(UseyInstance, args);
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

            var sfn = fn[sequenceIndex++];

            if (err && typeof err === 'string') {
                //if a string is passed instead of err, then we 
                //need to jump out of the sequence early. We can
                //fake that by forcing the sequence function to null
                sfn = null;
            }

            if (!sfn) {
                //prepare for going to processing each chain index
                args.pop();
                args.push(next);
                
                return next();
            }

            return sfn.apply(UseyInstance, args);
        }
    }

    function use (fn) {
        if (arguments.length > 1) {
            chain.push(Array.prototype.slice.call(arguments));
        }
        else {
            chain.push(fn);
        }

        return UseyInstance;
    }
}
