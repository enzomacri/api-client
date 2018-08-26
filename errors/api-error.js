"use strict";

const CustomError = require('./custom-error');

var err = CustomError('ApiError');

function ApiError(message, code) {
    err.call(this, message);
    this.code = code;
}

ApiError.prototype = Object.create(err.prototype);
ApiError.prototype.constructor = ApiError;
ApiError.prototype.getCode = function() {return this.code;};
ApiError.prototype.setCode = function(code) {this.code = code;};

module.exports = ApiError;
