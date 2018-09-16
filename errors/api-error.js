"use strict";

class ApiError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
    getCode() {
        return this.code
    }
};

module.exports = ApiError;
