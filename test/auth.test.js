'use strict';

const nock = require('nock');
const chai = require('chai'),
    assert = chai.assert;
const oauthClient = require('../client');
const querystring = require('querystring');

    describe('testing OAuth2 authentication', function() {
        beforeEach(function(done) {
            nock.cleanAll();
            nock.disableNetConnect();
            done();
        });

        describe('testing User credentials authentication', function() {

            it('should throw an error if no pw set', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet'
                };
                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken(function(err, res) {
                    assert.isNotNull(err);
                    assert.instanceOf(err, Error);
                    assert.equal('Unable to retrieve access token', err.message);
                    done();
                });
            });
            it('should throw an error if no username set', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    password: '123456'
                };
                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken(function(err, res) {
                    assert.isNotNull(err);
                    assert.instanceOf(err, Error);
                    assert.equal('Unable to retrieve access token', err.message);
                    done();
                });

            });
            it('should make an url encoded request', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet',
                    password: '123456'
                };

                var scope = nock('http://www.example.com')
                    .matchHeader('content-type', 'application/x-www-form-urlencoded')
                    .post('/token', {
                        grant_type: 'password',
                        username: 'someone@somewhere.internet',
                        password: '123456',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret'
                    })
                    .reply(200, {
                        access_token: 'token',
                        refresh_token: 'refresh',
                        expires_in: 2
                    });

                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.isNotNull(res);
                    assert.equal('token', res.body.access_token);
                    assert.equal('refresh', res.body.refresh_token);
                    assert.equal(2, res.body.expires_in)
                    var tokens = client.getTokens();
                    assert.equal('token', tokens.access_token);
                    assert.equal(2, tokens.expires_in);
                    assert.equal('refresh', tokens.refresh_token);
                    return done(err);
                });
            });
            it('should automatically retrieve tokens when trying to perform a request', function(done) {
                var scope = nock('http://www.example.com')
                    .post('/token', {
                        grant_type: 'password',
                        username: 'someone@somewhere.internet',
                        password: '123456',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret'
                    })
                    .reply(200, {
                        access_token: 'token',
                        refresh_token: 'refresh',
                        expires_in: 2
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
                client.get('data', {}, (err ,res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.isNotNull(res);
                    assert.equal('ok', res.body.status);
                    return done(err);
                });
            });
            it('should correctly serialize scope', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet',
                    password: '123456',
                    scopes: ['test', 'read', 'write']
                };

                var scope = nock('http://www.example.com')
                    .matchHeader('content-type', 'application/x-www-form-urlencoded')
                    .post('/token', {
                        grant_type: 'password',
                        username: 'someone@somewhere.internet',
                        password: '123456',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret',
                        scope: 'test,read,write'
                    })
                    .reply(200, function (uri, requestBody) {
                        requestBody = querystring.parse(requestBody);
                        var response = {
                            access_token: 'token',
                            refresh_token: 'refresh',
                            expires_in: 2
                        };
                        if (requestBody.scope) {
                            response.scope = requestBody.scope;
                        }
                        return response;
                    });

                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken((err, res) => {
                    assert.isNull(err);
                    assert.isNotNull(res);
                    assert.equal('token', res.body.access_token);
                    assert.equal('refresh', res.body.refresh_token);
                    assert.equal(2, res.body.expires_in);
                    assert.equal('test,read,write', res.body.scope);
                    return done(err);
                });
            });
        });
        describe('testing Refreshing tokens', function() {
            it('should work fine if refresh_token is provided in config', function(done) {
               var scope = nock('http://www.example.com')
                    .matchHeader('content-type', 'application/x-www-form-urlencoded')
                    .post('/token', {
                        grant_type: 'refresh_token',
                        refresh_token: 'refresh',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret'
                    })
                    .reply(200, {
                        access_token: 'token2',
                        expires_in: 5
                    });

                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    refresh_token: 'refresh'
                };
                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken((err, res) => {
                    if(err) {
                        return done(err);
                    }

                    assert.isNotNull(res);
                    assert.equal('token2', res.body.access_token);
                    assert.equal(5, res.body.expires_in);
                    var tokens = client.getTokens();
                    assert.equal('token2', tokens.access_token);
                    assert.equal(5, tokens.expires_in);
                    assert.equal('refresh', tokens.refresh_token);
                    return done();
                });
            });
            it('should throw an error if no refresh_token found', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret'
                };
                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken((err, res) => {
                    assert.isNotNull(err);
                    assert.equal('Unable to retrieve access token', err.message);
                    return done();
                });
            });
            it('should work fine if access_token is expired and refresh_token is stored', function(done) {
                var scope = nock('http://www.example.com')
                    .matchHeader('content-type', 'application/x-www-form-urlencoded')
                    .post('/token', {
                        grant_type: 'refresh_token',
                        refresh_token: 'refresh',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret'
                    })
                    .reply(200, {
                        access_token: 'token2',
                        expires_in: 5
                    });

                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret'
                };

                var client = new oauthClient('http://www.example.com', config);
                client.setTokens({
                    access_token: 'token',
                    refresh_token: 'refresh',
                    expires_in: -5
                });
                client.getAccessToken((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.isNotNull(res);
                    assert.equal('token2', res.body.access_token);
                    assert.equal(5, res.body.expires_in);
                    var tokens = client.getTokens();
                    assert.equal('token2', tokens.access_token);
                    assert.equal(5, tokens.expires_in);
                    assert.equal('refresh', tokens.refresh_token);
                    return done();
                });
            });
            it('should use refresh_token rather than username & password if both are present', function(done) {
                var scope = nock('http://www.example.com')
                    .matchHeader('content-type', 'application/x-www-form-urlencoded')
                    .post('/token', {
                        grant_type: 'refresh_token',
                        refresh_token: 'refresh',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret'
                    })
                    .reply(200, {
                        access_token: 'token2',
                        expires_in: 5
                    });

                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet',
                    password: '123456'
                };

                var client = new oauthClient('http://www.example.com', config);
                client.setTokens({
                    access_token: 'token',
                    refresh_token: 'refresh',
                    expires_in: -5
                });
                client.getAccessToken((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.isNotNull(res);
                    assert.equal('token2', res.body.access_token);
                    assert.equal(5, res.body.expires_in);
                    var tokens = client.getTokens();
                    assert.equal('token2', tokens.access_token);
                    assert.equal(5, tokens.expires_in);
                    assert.equal('refresh', tokens.refresh_token);
                    return done();
                });

            });
            it('should automatically refresh token when making a request', function() {
               var scope = nock('http://www.example.com')
                    .post('/token', {
                        grant_type: 'refresh_token',
                        refresh_token: 'refresh',
                        client_id: 'client',
                        client_secret: 'ThisIsASecret'
                    })
                    .reply(200, {
                        access_token: 'token2',
                        expires_in: 5
                    })
                    .get('/data')
                    .reply(200, {'status':'ok'});

                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    refresh_token: 'refresh'
                };
                var client = new oauthClient('http://www.example.com', config);
                client.get('data', {}, (err, res) => {
                    if(err) {
                        return done(err);
                    }

                    assert.isNotNull(res);
                    assert.equal('ok', res.body.status);
                    var tokens = client.getTokens();
                    assert.equal('token2', tokens.access_token);
                    assert.equal(5, tokens.expires_in);
                    assert.equal('refresh', tokens.refresh_token);
                    return done();
                });
            });
        });
        describe('testing authorization code', function() {
            it('should work if a code is set', function(done) {
                return done();
            });
        });
    });
