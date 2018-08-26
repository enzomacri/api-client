'use strict';

const nock = require('nock');
const chai = require('chai'),
    assert = chai.assert;
const oauthClient = require('../client');
const ClientError = require('../errors').ClientError;
const ApiError = require('../errors').ApiError;
const HttpError = require('../errors').HttpError;

describe('testing Oauth2 API Client', function() {
    beforeEach(function(done) {
        nock.cleanAll();
        nock.disableNetConnect();
        done();
    });

    describe('testing making simple request', function() {
        it('should add user agent', function(done) {
            var scope = nock('http://www.example.com')
                .matchHeader('user-agent', 'agent')
                .get('/data')
                .reply(200, {'status': 'ok'});

            var client = new oauthClient('http://www.example.com', {user_agent: 'agent'});
            client.makeRequest('http://www.example.com/data', {}, {}, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        })
        it('should move access_token from params to Authentication header', function(done) {
            var scope = nock('http://www.example.com')
                .matchHeader('authorization', 'Bearer token')
                .get('/data')
                .reply(200, {'status': 'ok'});
            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {access_token: 'token'}, {}, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });

        it('should handle stringified json in response', function(done) {
            var scope = nock('http://www.example.com')
                .defaultReplyHeaders({
                    'Content-Type': 'application/json'
                })
                .get('/data')
                .reply(200, JSON.stringify({status: 'ok'}));
            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {}, {}, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should handle invalid stringified json in response', function(done) {
            var scope = nock('http://www.example.com')
                .defaultReplyHeaders({
                    'Content-Type': 'application/json'
                })
                .get('/data')
                .reply(200, "{'status', 'ok'}");
            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {}, {}, (err, res) => {
                assert.isNotNull(err);
                assert.equal(err.getType(), 'ClientError');
                assert.instanceOf(err, ClientError);
                assert.equal(err.message, 'Unable to parse response');
                return done();
            });
        });
        it('should handle http error in response', function(done) {
            var scope = nock('http://www.example.com')
                .get('/data')
                .reply(400)

            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {}, {}, (err, res) => {
                assert.isNotNull(err);
                assert.instanceOf(err, HttpError);
                assert.equal(err.getType(), 'HttpError');
                assert.equal(err.message, 'Invalid request');
                return done();
            });
        });
        it('should handle applicative error in response', function(done) {
            var scope = nock('http://www.example.com')
                .get('/data')
                .reply(400, {error: { code: 0, message: 'this is an error'}});

            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {}, {}, (err, res) => {
                assert.isNotNull(err);
                assert.equal(err.getType(), 'ApiError');
                assert.equal(err.getCode(), 0);
                assert.instanceOf(err, ApiError);
                assert.equal(err.message, 'this is an error');
                return done();
            });
        });

        it('should handle if callback is passed instead of params', function(done) {
            var scope = nock('http://www.example.com')
                .get('/data')
                .reply(200, {'status': 'ok'});
            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should handle if callback is passed instead of options', function(done) {
            var scope = nock('http://www.example.com')
                .get('/data')
                .reply(200, {'status': 'ok'});
            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {}, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should handle if method is overriden in options', function(done) {
            var scope = nock('http://www.example.com')
                .post('/data')
                .reply(200, {'status': 'ok'});
            var client = new oauthClient('http://www.example.com');
            client.makeRequest('http://www.example.com/data', {}, {'method': 'post'}, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should be able to override content-type header', function(done) {
            var scope = nock('http://www.example.com')
                .matchHeader('content-type', 'application/x-www-form-urlencoded')
                .post('/data')
                .reply(200, {'status': 'ok'});
            var client = new oauthClient('http://www.example.com');
            var options = {
                method: 'post',
                content_type: 'application/x-www-form-urlencoded'
            };
            client.makeRequest('http://www.example.com/data', {}, options, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
    });

    describe('testing making OAuth2 request', function() {
        it('should work if callback is passed instead of params', function(done) {
            var scope = nock('http://www.example.com')
                .post('/token', {
                    grant_type: 'password',
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet',
                    password: '123456'
                })
                .reply(200, {
                    access_token: 'token',
                    expires_in: '100',
                    refresh_token: 'refresh'
                })
                .get('/data')
                .reply(200, {'status': 'ok'});

            var config = {
                client_id: 'client',
                client_secret: 'ThisIsASecret',
                username: 'someone@somewhere.internet',
                password: '123456'
            };
            var client = new oauthClient('http://www.example.com', config);

            client.makeOAuth2Request('data', (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should work if callback is passed instead of options', function(done) {
            var scope = nock('http://www.example.com')
                .post('/token', {
                    grant_type: 'password',
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet',
                    password: '123456'
                })
                .reply(200, {
                    access_token: 'token',
                    expires_in: '100',
                    refresh_token: 'refresh'
                })
                .get('/data')
                .reply(200, {'status': 'ok'});

            var config = {
                client_id: 'client',
                client_secret: 'ThisIsASecret',
                username: 'someone@somewhere.internet',
                password: '123456'
            };
            var client = new oauthClient('http://www.example.com', config);

            client.makeOAuth2Request('data', {}, (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });

        });
        it('should retrieve access token first', function(done) {
            var auth = nock('http://www.example.com')
                .post('/token', {
                    grant_type: 'refresh_token',
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    refresh_token: 'refresh'
                })
                .reply(200, {
                    access_token: 'token',
                    expires_in: 100
                });

            var config = {
                client_id: 'client',
                client_secret: 'ThisIsASecret',
                refresh_token: 'refresh'
            };
            var client = new oauthClient('http://www.example.com', config);

            var req = nock('http://www.example.com')
                .get('/data')
                .reply(200, {'status': 'ok'});

            client.makeOAuth2Request('data', (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isTrue(auth.isDone());
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should add access token in params', function(done) {
            var scope = nock('http://www.example.com')
                .matchHeader('Authorization', 'Bearer token')
                .get('/data')
                .reply(200, {'status': 'ok'});
            var config = {
                client_id: 'client',
                client_secret: 'client_secret',
                access_token: 'token'
            };
            var client = new oauthClient('http://www.example.com', config);
            client.makeOAuth2Request('data', (err, res) => {
                if (err) {
                    return done(err);
                }
                assert.isNotNull(res);
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should try once to refresh access token when getting a 401 error', function(done) {
            var scope = nock('http://www.example.com')
                .get('/data')
                .reply(401, {error: {message: 'test', code: 1}});

            var auth = nock('http://www.example.com')
                .matchHeader('content-type', 'application/x-www-form-urlencoded')
                .post('/token', {
                    grant_type: 'refresh_token',
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    refresh_token: 'refresh'
                })
                .reply(200, {
                    access_token: 'newToken',
                    expires_in: 5,
                });

            var success = nock('http://www.example.com')
                .matchHeader('authorization', 'Bearer newToken')
                .get('/data')
                .reply(200, {status:'ok'})

            var config = {
                client_id: 'client',
                client_secret: 'ThisIsASecret',
                access_token: 'tata',
                refresh_token: 'refresh'
            };
            var client = new oauthClient('http://www.example.com', config);
            client.makeOAuth2Request('data', (err , res) => {
                if (err) {
                    return done(err);
                }
                assert.isTrue(auth.isDone());
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
        it('should try to refresh when matching custom condition', function(done) {
            var scope = nock('http://www.example.com')
                .get('/data')
                .reply(403, {error: {message: 'test', code: 1}});

            var auth = nock('http://www.example.com')
                .matchHeader('content-type', 'application/x-www-form-urlencoded')
                .post('/token', {
                    grant_type: 'refresh_token',
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    refresh_token: 'refresh'
                })
                .reply(200, {
                    access_token: 'newToken',
                    expires_in: 5,
                });

            var success = nock('http://www.example.com')
                .matchHeader('authorization', 'Bearer newToken')
                .get('/data')
                .reply(200, {status:'ok'})

            var config = {
                client_id: 'client',
                client_secret: 'ThisIsASecret',
                access_token: 'tata',
                refresh_token: 'refresh',
                shouldRefreshToken: function(err) {
                    if (err.status === 403) {
                        return true;
                    }
                    return false;
                }
            };
            var client = new oauthClient('http://www.example.com', config);
            client.makeOAuth2Request('data', (err , res) => {
                if (err) {
                    return done(err);
                }
                assert.isTrue(auth.isDone());
                assert.equal(res.body.status, 'ok');
                return done();
            });
        });
    });
    describe('testing overriding default url', function() {
        it('should take the urls given in config', function(done) {
            var scope = nock('http://www.example.com')
                .post('/retrievetoken')
                .reply(200, {
                    access_token: 'token',
                    expires_in: 2,
                    refresh_token: 'refresh'
                })
                .get('/data')
                .reply(200, {status : 'ok'});

            var config = {
                client_id: 'client',
                client_secret: 'secret',
                username: 'toto',
                password: '123456',
                urls: {
                    token: 'http://www.example.com/retrievetoken'
                }
            };

            var client = new oauthClient('http://www.example.com', config);
            client.makeOAuth2Request('data', (err, res) => {
                if (err) return done(err);
                assert.isTrue(scope.isDone())
                assert.equal(res.body.status, 'ok');
                return done();
            });

        });
    });
    describe('Testing refresh callback', function() {
        it('should call the provided function when refreshing tokens', function(done) {
            var scope = nock('http://www.example.com')
                .post('/token')
                .reply(200, {
                    access_token: 'token',
                    expires_in: 3,
                    refresh_token: 'refresh'
                });
            var refreshCb = function(tokens) {
                assert.equal(tokens.access_token, 'token');
                assert.equal(tokens.expires_in, 3);
                assert.equal(tokens.refresh_token, 'refresh');
                done();
            };
            var config = {
                client_id: 'client',
                client_secret: 'client_secret',
                refresh_token: 'refresh',
                refreshCallback: refreshCb
            };

            var client = new oauthClient('http://www.example.com', config);
            client.getAccessToken((err, res) => {
            });

        });
    });
    describe('Testing missing API URL', function() {
        it('should throw an error', function() {
            var config = {
                client_id: 'client',
                client_secret: 'secret',
                username: 'toto',
                password: 'pwd'
            };

            assert.throws(function() { new oauthClient(config) }, Error, 'Missing Api URL');
        });
    });
});
