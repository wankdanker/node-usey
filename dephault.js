module.exports = dephault;

function dephault(obj, key, otherwise1, otherwise2, otherwise3 /*, ...*/) {
  if (obj.hasOwnProperty(key)) {
    return obj[key];
  }

  for (var x = 2; x < arguments.length; x++ ) {
    if (arguments[x] != undefined) {
      return arguments[x];
    }
  }
}
