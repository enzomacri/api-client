const Utils = require('./helpers/utils');
const request = require('request');

var Client = function(apiUrl, config) {

    config = config || {};
    this.client_id  = config.client_id;
    this.client_secret = config.client_secret;

    if(config.access_token) this.access_token = config.access_token;
    if(config.refresh_token) this.refresh_token = config.refresh_token;

    if(config.authorization_code) this.authorization_code = config.authorization_code;

    if(config.username && config.password) {
        this.username = config.username;
        this.password = config.password;
    }

    if(config.scopes) {
        if(!Array.isArray(config.scopes)) {
            config.scopes = [config.scopes];
        }
        this.scopes = config.scopes;
    }

    if(config.urls) {
        this.urls = config.urls;
    }
    else {
        this.urls = {
            api : apiUrl,
            token: apiUrl + '/token',
            authorize: apiUrl + '/authorize'
        };

        if(config.apiSuffix) {
            this.urls.api += config.apiSuffix;
        }
    }
    return this;
};

Client.prototype.setTokens = function(tokens) {
    if(tokens.access_token) {
        this.access_token = tokens.access_token;
    }
    if(tokens.refresh_token) {
        this.refresh_token = tokens.refresh_token;
    }
    if(tokens.expiration_token) {
        this.expiration_token = tokens.expires_in;
    }
};

Client.prototype.setAccessToken = function(accessToken) {
    this.access_token = accessToken;
}

Client.prototype.getTokens = function() {
    return {
        access_token: this.access_token,
        expires_in: this.expiration_token,
        refresh_token: this.refresh_token
    };
};

Client.prototype.makeRequest = function(url, params, method, callback) {
    let headers = {};

    if(!Utils.isObject(params)) {
        if(typeof params === 'function') {
            callback = params;
            params = {};
            method = 'get';
        }
        else if (typeof params === 'string') {
            callback = method;
            method = params;
        }
    }
    if(typeof method === 'function') {
        callback = method;
        method = 'get';
    }

    if(params.access_token) {
        headers.authorization = 'Bearer ' + params.access_token;
    }
    var options = {
        uri: url
    };

    if(method === 'get') {
        options.qs = params;
    }
    else {
        options = Object.assign(options, {
            json: true,
            body: params
        });
    }
    request[method](options, (err, response) => {
        return Utils.handleCallbackOrPromise(callback, err, response)
    });
};

Client.prototype.makeOAuth2Request = function(endpoint, params, method, callback) {

    if(!Utils.isObject(params)) {
        if(typeof params === 'function') {
            callback = params;
            method = 'get';
        }
        else if (typeof params === 'string') {
            callback = method;
            method = params;
        }
        params = {};
    }
    if(typeof method === 'function') {
        callback = method;
        method = 'get';
    }

    params.access_token = this.access_token;
    this.getAccessToken((err) => {
        if(err) {
            // TODO if token is invalid try to refresh it
            if(err.status === 401) {
                this.refreshAccessToken((err) => {
                    if(err) return Utils.handleCallbackOrPromise(callback, err);
                    else return this.makeRequest(this.urls.api + endpoint, params, method, callback);
                });
            }
            else return Utils.handleCallbackOrPromise(callback, err);
        }
        return this.makeRequest(this.urls.api + endpoint, params, method, callback);
    });
};

Client.prototype.get = function(endpoint, params, callback) {
    return this.makeOAuth2Request(endpoint, params, 'get', callback);
};

Client.prototype.post = function(endpoint, params, callback) {
    return this.makeOAuth2Request(endpoint, params, 'post', callback);
}

function getTokensFromUserCredentials(cb) {
    if(!this.username || !this.password || !this.urls.token) {
        var err = new Error('Missing args to perform user credentials authentication');
        if(typeof cb === 'function') return cb(err);
        else return Promise.reject(err);
    }
    var params = {
        grant_type: 'password',
        client_id: this.client_id,
        client_secret: this.client_secret,
        username : this.username,
        password: this.password,
        scope: this.scopes
    };
    console.log(params)
    return this.makeRequest(this.urls.token, params,'post', (err, res) => {
        if(err) return Utils.handleCallbackOrPromise(cb, err);
        this.setTokens(res);
        return Utils.handleCallbackOrPromise(cb, null, res);
    });
};

function refreshAccessToken(cb) {
    if(!this.refresh_token || !this.urls.token) {
        var err = new Error('Missing args for refreshing tokens');
        if(typeof cb === 'function') return cb(err);
        else return Promise.reject(err);
    };

    var params = {
        grant_type: 'refresh_token',
        client_id: this.client_id,
        client_secret: this.client_secret,
        refresh_token : this.refresh_token
    };
    return this.makeRequest(this.urls.token, params, (err, res) => {
        if(err) return Utils.handleCallbackOrPromise(cb, err);
        this.setTokens(res);
        return Utils.handleCallbackOrPromise(cb, null, res);
    });
};

// TODO
function getTokensFromAuthorizationCode(cb) {
    if(!this.authorization_code) {
        var err = new Error("Missing args");
        return Utils.handleCallbackOrPromise(cb, err);
    }
};

Client.prototype.getAccessToken = function(callback) {

    if(this.access_token && this.expiration_token && this.expiration_token < Utils.getTime()) {
        return callback(null, this.access_token);
    }
    if(this.authorization_code) {
        return getTokensFromAuthorizationCode.call(this, callback);
    }
    if(this.refresh_token) {
        return refreshAccessToken.call(this, callback);
    }
    if(this.username && this.password) {
        return getTokensFromUserCredentials.call(this, callback);
    }
    var err = new Error('Unable to retrieve access token');
    if(typeof callback === 'function') return callback(err);
    else return Promise.reject(err);
}

module.exports = Client;
