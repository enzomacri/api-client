'use strict';

class ClientError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }

    getCode() {
        return this.code;
    }
}

module.exports = ClientError;
