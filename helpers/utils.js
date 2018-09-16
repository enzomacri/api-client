exports.isObject = function(obj) {
    return (obj instanceof Object);
};
exports.getTime = function() {
    return Math.floor(Date.now()/1000);
};
exports.isFunction = function(func) {
    return (typeof func === 'function');
};

