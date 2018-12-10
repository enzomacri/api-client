'use strict';
const Utils = require('./helpers/utils');
const Request = require('./request');
const {ClientError, HttpError, ApiError} = require('./errors');

class Client {
    constructor(baseUrl, config) {
        if (Utils.isObject(baseUrl)) {
            config = baseUrl;
            baseUrl = null;
        }

        if (!baseUrl && !config.urls) {
            throw new ClientError('Missing Api URL');
        }

        config = config || {};
        this.client_id = config.client_id;
        this.client_secret = config.client_secret;
        this.timeout = config.timeout || 10000;

        if (config.access_token) {
            this.access_token = config.access_token;
        }

        if (config.refresh_token) {
            this.refresh_token = config.refresh_token;
        }

        if (config.expires_in) {
            this.token_expiration = config.expires_in + Utils.getTime();
        }

        if (config.authorization_code) {
            this.authorization_code = config.authorization_code;
        }

        if (config.redirect_uri) {
            this.redirect_uri = config.redirect_uri;
        }

        this.user_agent = config.user_agent || 'node-oauth-api-client';

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
            api : baseUrl + '/',
            token: baseUrl + '/token',
            authorize: baseUrl + '/authorize'
        };

        if (config.urls) {
            this.urls = Object.assign(this.urls, config.urls);
        }

        if (Utils.isFunction(config.refreshCallback)) {
            this.refreshCb = config.refreshCallback;
        }
    }

    setTokens(tokens) {
        if (tokens.access_token) {
            this.access_token = tokens.access_token;
        }
        if (tokens.refresh_token) {
            this.refresh_token = tokens.refresh_token;
        }

        if (tokens.expires_in) {
            this.token_expiration = Utils.getTime() + tokens.expires_in;
        }
    }

    setAccessToken(accessToken) {
        this.access_token = accessToken;
    }

    getTokens() {
        const tokens = {
            access_token : this.access_token,
            refresh_token: this.refresh_token
        }

        if (this.token_expiration) {
            tokens.expires_in = this.token_expiration - Utils.getTime();
        }

        return tokens;
    }

    makeRequest(url, params, options) {
        const headers = {};
        let method = 'get';
        if (Utils.isObject(options)) {
            if (options.method) {
                method = options.method;
            }

            if (options.content_type) {
                headers['Content-Type'] = options.content_type;
            }

            if (options.authorization) {
                headers.authorization = 'Bearer ' + this.access_token;
            }
        }

        headers['User-Agent'] = this.user_agent;

        return new Request(url)
            .setHeaders(headers)
            .setMethod(method)
            .setParams(params)
            .setTimeout(this.timeout)
            .perform()
            .then(response => {
                if (response.body
                    && (!Utils.isObject(response.body)
                        || response.body instanceof Buffer)
                ) {
                    try {
                        switch (response.headers['content-type']) {
                            case 'application/json':
                            case 'text/javascript':
                                 response.body = JSON.parse(response.body);
                                break;
                            case 'application/text':
                                response.body = response.body.toString();
                                break;
                        }
                    } catch (err) {
                        return Promise.reject(new ClientError('Unable to parse response'));
                    }
                }
                const error = this.constructor.parseError(response)
                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve(response);
            })
    }

    static parseError(response) {
        if (response.body.error && response.body.error.message) {
            const error = new ApiError(response.body.error.message);
            if (response.body.error.code !== 'undefined') {
                error.code = response.body.error.code;
            }
            error.status = response.statusCode;
            return error;
        }

        if (response.statusCode) {
            if (parseInt(response.statusCode/100) === 4) {
                const error = new HttpError('Invalid request');
                error.status = response.statusCode;
                return error;
            }
            if (parseInt(response.statusCode/100) === 5) {
                const error = new HttpError('Internal error');
                error.status = response.statusCode;
                return error;
            }
        }
        return null;
    }

    makeOAuth2Request(endpoint, params, options) {
        return this.getAccessToken()
            .then(() => {
                if (!options) {
                    options = {};
                }
                options.authorization = this.access_token;
                return this.makeRequest(this.urls.api + endpoint, params, options);
            })
            .catch(err => {
                if (err.status === 401 || this.shouldRefreshToken(err)) {
                    return refreshAccessToken.call(this)
                        .then(() => {
                            options.authorization = this.access_token;
                            return this.makeRequest(this.urls.api + endpoint, params, options);
                        })
                }
                return Promise.reject(err);
            })
    }

    get(endpoint, params) {
        return this.makeOAuth2Request(endpoint, params, {method:'get'});
    }

    post(endpoint, params) {
        return this.makeOAuth2Request(endpoint, params, {method:'post'});
    }

    getAccessToken() {
        if (this.access_token) {
            if (!this.token_expiration || this.token_expiration > Utils.getTime()) {
                return Promise.resolve(this.getTokens());
            }
        }
        if (this.authorization_code) {
            return getTokensFromAuthorizationCode.call(this);
        }
        if  (this.refresh_token) {
            return refreshAccessToken.call(this);
        }

        if (this.username && this.password) {
            return getTokensFromUserCredentials.call(this);
        }

        const err = new ClientError('Unable to retrieve access token');
        return Promise.reject(err);
    }
}

function getTokensFromUserCredentials() {
    if (!this.username || !this.password || !this.urls.token) {
        const err = new ClientError('Missing args to perform user credentials authentication');
        return Promise.reject(err);
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
    return this.makeRequest(this.urls.token, params, config)
        .then(res => {
            this.setTokens(res.body);
            return Promise.resolve(res.body);
        })
};

function refreshAccessToken() {
    if (!this.refresh_token || !this.urls.token) {
        const err = new ClientError('Missing args for refreshing tokens');
        return Promise.reject(err);
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
    return this.makeRequest(this.urls.token, params, config)
        .then(res => {
            this.setTokens(res.body);
            if (Utils.isFunction(this.refreshCb)) {
                this.refreshCb(res.body);
            }
            return res.body;
        })
};

function getTokensFromAuthorizationCode(cb) {
    if (!this.authorization_code || !this.redirect_uri) {
        const err = new ClientError("Missing args");
        return Promise.reject(err);
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

    return this.makeRequest(this.urls.token, params, config)
        .then(res => {
            this.setTokens(res.body);
            return res.body;
        })
};

module.exports = Client;
