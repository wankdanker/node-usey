module.exports = promise;

function promise() {
    var res;
    var rej;
    
    var p = new Promise(function (resolve, reject) {
        res = resolve;
        rej = reject;
    });

    function cb () {
        var args = Array.prototype.slice.call(arguments);

        if (args[0] && args[0] !== 'exit') {
            return rej(args[0]);
        }

        args.shift();

        return res.call(p, args);
    }

    cb.promise = p;

    return cb;
}