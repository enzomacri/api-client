"use strict";


class ApiError extends Error {
    constructor(message, code) {
        this.message = message;
        this.code = code;
    }

    get code() {
        return this.code;
    }

    set code(code) {
        this.code = code;
    }
};

module.exports = ApiError;
