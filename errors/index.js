"use strict";

const CustomError = require('./custom-error');
const ApiError = require('./api-error');

var ClientError = CustomError('ClientError');
var HttpError = CustomError('HttpError');

module.exports = {
    ClientError,
    HttpError,
    ApiError
};
