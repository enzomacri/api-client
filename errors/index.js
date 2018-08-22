"use strict";

function CustomError(type) {
    var err = function(message) {
        this.type = type;
        this.message = message;
        this.stack = new Error().stack;
    }
    err.prototype = new Error();
    err.prototype.getType = function() {return this.type;};
    return err;
}

var ClientError = CustomError('ClientError');
var HttpError = CustomError('HttpError');
var ApiError = CustomError('ApiError');

module.exports = {
    ClientError,
    HttpError,
    ApiError
};
