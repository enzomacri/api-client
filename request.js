'use strict';
var Utils = require('./helpers/utils');
var request = require('request');

var makeRequest = function(path, method, params, headers, options, callback) {
    if (!path || typeof path !== 'string') {
        return callback(new TypeError("path should be a string"));
    }
    if (typeof options === 'function') {
        callback = options;
        options = null
    } else if (typeof headers === 'function') {
        callback = headers;
        headers = null;
    }

    if (method === 'get') {
        return makeGetRequest(path, params, headers, options, callback);
    } else {
        return makePostRequest(path, params, headers, options, callback);
    }
};

var makeGetRequest = function(path, params, headers, options, callback) {
    var config = {
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

var makePostRequest = function(path, params, headers, options, callback) {

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

var makeJsonRequest = function(path, params, headers, options, callback) {
    var config = {
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

var makeUrlEncodedRequest = function(path, params, headers, options, callback) {
    var config = {
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

var get = function(path, params, headers, options, callback) {
    return makeRequest(path, 'get', params, headers, options, callback);
};

var post = function(path, params, headers, options, callback) {
    return makeRequest(path, 'post', params, headers, options, callback);
};

module.exports = {
    get : get,
    post: post
};
