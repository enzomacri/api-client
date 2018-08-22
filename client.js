'use strict';
const Utils = require('./helpers/utils');
const request = require('./request');
const ClientError = require('./errors').ClientError;
const HttpError = require('./errors').HttpError;
const ApiError = require('./errors').ApiError;

var Client = function(apiUrl, config) {

    if (Utils.isObject(apiUrl)) {
         config = apiUrl;
         apiUrl = null;
    }
    if (!apiUrl && !config.urls) {
        throw new ClientError('Missing Api URL');
    }
    config = config || {};
    this.client_id  = config.client_id;
    this.client_secret = config.client_secret;
    this.timeout = config.timeout || 10000

    if (config.access_token) this.access_token = config.access_token;
    if (config.refresh_token) this.refresh_token = config.refresh_token;
    if (config.expires_in) this.token_expiration = config.expires_in + Utils.getTime();

    if (config.authorization_code) this.authorization_code = config.authorization_code;
    if (config.redirect_uri) this.redirect_uri = config.redirect_uri;

    if (config.user_agent) {
        this.user_agent = config.user_agent;
    } else {
        this.user_agent = 'oauth-api-client';
    }

    if (config.username && config.password) {
        this.username = config.username;
        this.password = config.password;
    }

    // custom function to know whether we should refresh token on request error or not (default on 401 http error)
    if (config.shouldRefreshToken && typeof config.shouldRefreshToken === 'function') {
        this.shouldRefreshToken = config.shouldRefreshToken;
    } else {
        this.shouldRefreshToken = function(err) {
            return false;
        };
    }

    if (config.scope) {
        if (Array.isArray(config.scope)) {
            config.scope = config.scope.join(' ');
        }
        this.scope = config.scope;
    }

    this.urls = {
        api : apiUrl + '/',
        token: apiUrl + '/token',
        authorize: apiUrl + '/authorize'
    };

    if (config.urls) {
        this.urls = Object.assign(this.urls, config.urls);
    }

    if (Utils.isFunction(config.refreshCallback)) {
        this.refreshCb = config.refreshCallback;
    }

    return this;
};

Client.prototype.setTokens = function(tokens) {
    if (tokens.access_token) {
        this.access_token = tokens.access_token;
    }
    if (tokens.refresh_token) {
        this.refresh_token = tokens.refresh_token;
    }
    if (tokens.expires_in) {
        this.token_expiration = Utils.getTime() + tokens.expires_in;
    }
};

Client.prototype.setAccessToken = function(accessToken) {
    this.access_token = accessToken;
}

Client.prototype.getTokens = function() {
    const tokens = {
        access_token: this.access_token,
        refresh_token: this.refresh_token
    };
    if (this.token_expiration) {
        tokens.expires_in = this.token_expiration - Utils.getTime();
    }
    return tokens;
};

Client.prototype.makeRequest = function(url, params, options, callback) {
    var headers = {};
    var method = 'get';
    if (typeof params === 'function') {
        callback = params;
        params = {};
    }
    if (typeof options === 'function') {
        callback = options;
    }
    if (Utils.isObject(options)) {
        if (options.method) {
            method = options.method;
        }

        if (options.content_type) {
            headers['Content-Type'] = options.content_type;
        }
    }
    if (params.access_token) {
        headers.authorization = 'Bearer ' + params.access_token;
        delete(params.access_token);
    }

    headers['User-Agent'] = this.user_agent;
    request[method](url, params, headers, { timeout: this.timeout }, (err, response) => {
        if (err) {
            return callback(err);
        }
        if (response.body && (!Utils.isObject(response.body) || response.body instanceof Buffer)) {
            try {
                switch (response.headers['content-type']) {
                    case 'application/json':
                        response.body = JSON.parse(response.body);
                        break;
                    case 'application/text':
                        response.body = response.body.toString();
                        break;
                }
            } catch(err) {
               return callback(new ClientError('Unable to parse response'));
            }
        }

        if (response.body.error && response.body.error.message) {
            var error = new ApiError(response.body.error.message);
            if (response.body.error.code) {
                error.code = response.body.error.code
            }
            error.status = response.statusCode;
            return callback(error);
        }

        if (response.statusCode) {
            if (parseInt(response.statusCode/100) === 4) {
                var error = new HttpError('Invalid request');
                error.status = response.statusCode;
                return callback(error);
            }
            if (parseInt(response.statusCode/100) === 5) {
                var error = new HttpError('Internal error');
                error.status = response.statusCode;
                return callback(error);
            }
        }

        return callback(null, response);
    });
};

Client.prototype.makeOAuth2Request = function(endpoint, params, options, callback) {

    if (typeof params === 'function') {
        callback = params;
        params = {};
        options= {};
    }
    if (typeof options === 'function') {
        callback = options;
        options= {};
    }

    if (!params) {
        params = {}
    }

    this.getAccessToken((err) => {
        if (err) {
            return callback(err);
        }
        params.access_token = this.access_token;
        return this.makeRequest(this.urls.api + endpoint, params, options, (err, res) => {
            if (err) {
                if (err.status === 401 || this.shouldRefreshToken(err)) {
                    refreshAccessToken.call(this, (error) => {
                        if (error) {
                            return callback(error);
                        } else {
                            params.access_token = this.access_token;
                            return this.makeRequest(this.urls.api + endpoint, params, options, callback);
                        }
                    });
                } else {
                    return callback(err);
                }
            } else {
                return callback(null, res);
            }
        });
    });
};

Client.prototype.get = function(endpoint, params, callback) {
    return this.makeOAuth2Request(endpoint, params, {method: 'get'}, callback);
};

Client.prototype.post = function(endpoint, params, callback) {
    return this.makeOAuth2Request(endpoint, params, {method:'post'}, callback);
}

function getTokensFromUserCredentials(cb) {
    if (!this.username || !this.password || !this.urls.token) {
        var err = new ClientError('Missing args to perform user credentials authentication');
        return cb(err);
    }
    var params = {
        grant_type: 'password',
        client_id: this.client_id,
        client_secret: this.client_secret,
        username : this.username,
        password: this.password
    };
    if (this.scope) {
        params.scope = this.scope;
    }
    var config = {
        method : 'post',
        content_type :"application/x-www-form-urlencoded"
    };
    return this.makeRequest(this.urls.token, params, config, (err, res) => {
        if (err) return cb(err);
        this.setTokens(res.body);
        return cb(null, res.body);
    });
};

function refreshAccessToken(cb) {
    if (!this.refresh_token || !this.urls.token) {
        var err = new ClientError('Missing args for refreshing tokens');
        return cb(err);
    };

    var params = {
        grant_type: 'refresh_token',
        client_id: this.client_id,
        client_secret: this.client_secret,
        refresh_token : this.refresh_token
    };

    var config = {
        'content_type': "application/x-www-form-urlencoded",
        'method' : 'post'
    };
    return this.makeRequest(this.urls.token, params, config, (err, res) => {
        if (err) return cb(err);
        this.setTokens(res.body);
        if (Utils.isFunction(this.refreshCb)) {
            this.refreshCb(res.body);
        }
        return cb(null, res.body);
    });
};

function getTokensFromAuthorizationCode(cb) {
    if (!this.authorization_code || !this.redirect_uri) {
        var err = new ClientError("Missing args");
        return cb(err);
    }
    var params = {
        grant_type: 'authorization_code',
        client_id: this.client_id,
        client_secret: this.client_secret,
        code: this.authorization_code,
        redirect_uri: this.redirect_uri
    };

    if (this.scope) {
        params.scope = this.scope;
    }

    var config = {
        method: 'post',
        content_type: 'application/x-www-form-rulencoded'
    };

    return this.makeRequest(this.urls.token, params, config, (err, res) => {
        if (err) return cb(err);
        this.setTokens(res.body);
        return cb(null, res.body);
    });
};

Client.prototype.getAccessToken = function(callback) {
    if (this.access_token) {
        if (!this.token_expiration ||  this.token_expiration > Utils.getTime()) {
            return callback(null, this.getTokens());
        }
    }
    if (this.authorization_code) {
        return getTokensFromAuthorizationCode.call(this, callback);
    }
    if (this.refresh_token) {
        return refreshAccessToken.call(this, callback);
    }
    if (this.username && this.password) {
        return getTokensFromUserCredentials.call(this, callback);
    }
    var err = new ClientError('Unable to retrieve access token');
    if (typeof callback === 'function') return callback(err);
}

module.exports = Client;
