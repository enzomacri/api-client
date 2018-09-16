'use strict';
var Utils = require('./helpers/utils');
var request = require('request');

class Request {
    constructor(url) {
        if (!url || typeof url !== 'string') {
            throw new TypeError('url should be a string');
        }
        this.url = url;
        this.method = 'get';
    }

    setMethod(method) {
        this.method = method;
        return this;
    }

    setParams(params) {
        this.params = params;
        return this;
    }

    setTimeout(timeout) {
        this.timeout = timeout;
        return this;
    }

    setHeaders(headers) {
        this.headers = headers;
        return this;
    }

    perform() {
        const options = {
            timeout: this.timeout
        };
        switch (this.method.toLowerCase()) {
            case 'post':
                return new Promise((resolve,reject) => {
                    makePostRequest(
                        this.url,
                        this.params,
                        this.headers,
                        options,
                        (err, response) => {
                            if (err) {
                                return reject(err);
                            }
                            return resolve(response);
                        }
                    );
                });
            case 'get':
            default:
                return new Promise((resolve, reject) => {
                    makeGetRequest(
                        this.url,
                        this.params,
                        this.headers,
                        options,
                        (err, response) => {
                            if (err) {
                                return reject(err);
                            }
                            return resolve(response);
                        }
                    );
                });
        }
    }
}

function makeGetRequest(path, params, headers, options, callback) {
    let config = {
        uri: path,
        headers: headers,
        qs: params,
        encoding: null
    };

    if (options != null && typeof options === 'object') {
        config = Object.assign(config, options);
    }
    return request.get(config, callback);
};

function makePostRequest(path, params, headers, options, callback) {
    if (!headers) {
        headers = {
            'Content-Type': "application/json"
        };
    }

    if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    switch(headers["Content-Type"]) {
        case "application/json": {
            return makeJsonRequest(path, params, headers, options, callback);
        }
        case "application/form-x-urlencoded":
        default:
            return makeUrlEncodedRequest(path, params, headers, options, callback)
    }
};

function makeJsonRequest(path, params, headers, options, callback) {
    let config = {
        uri: path,
        headers : headers,
        body: params,
        json: true,
        encoding: null
    };

    if (options != null && typeof options === 'object') {
        config = Object.assign(config, options);
    }
    return request.post(config, callback);
};

function makeUrlEncodedRequest(path, params, headers, options, callback) {
    let config = {
        uri: path,
        headers: headers,
        form: params,
        encoding: null
    };

    if (options != null && typeof options === 'object') {
        config = Object.assign(config, options);
    }
    return request.post(config, callback);
};

module.exports = Request;
