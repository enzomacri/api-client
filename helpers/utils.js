exports.isObject = function(obj) {
    return (obj instanceof Object);
};
exports.getTime = function() {
    return Math.floor(Date.now()/1000);
};
exports.isFunction = function(func) {
    return (typeof func === 'function');
};
exports.handleCallbackOrPromise = function(callback, err, res) {
    if(err) {
        if(typeof callback === 'function') {
            return callback(err);
        }
        else return Promise.reject(err);
    }
    else {
        if(typeof callback === 'function') {
            return callback(null, res);
        }
        else return Promise.resolve(res);
    }
};
