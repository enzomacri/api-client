'use strict'

module.exports = function CustomError(type) {
    var err = function(message) {
        this.type = type;
        this.message = message;
        this.stack = new Error().stack;
    };
    err.prototype = new Error();
    err.prototype.getType = function() {return this.type;};
    return err;
};
