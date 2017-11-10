'use strict';

const nock = require('nock');
const chai = require('chai')
    assert = chai.assert;
const oauthClient = require('../client');

    describe('testing OAuth2 authentication', function() {
        beforeEach(function(done) {
            nock.cleanAll();
            nock.disableNetConnect();
            done();
        });

        describe('testing User credentials authentication', function() {

            it('should throw an error if no username set', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    username: 'someone@somewhere.internet'
                }
                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken(function(err, res) {
                    assert.isNotNull(err);
                    assert.instanceOf(err, Error);
                    assert.equals('Missing args to perform user credentials authentication', err.message);
                    done();
                });
            });
            it('should throw an error if no pw set', function(done) {
                var config = {
                    client_id: 'client',
                    client_secret: 'ThisIsASecret',
                    password: '123456'
                }
                var client = new oauthClient('http://www.example.com', config);
                client.getAccessToken(function(err, res) {
                    assert.isNotNull(err);
                    assert.instanceOf(err, Error);
                    assert.equals('Missing args to perform user credentials authentication', err.message);
                    done();
                });

            });
            it('should make an url encoded request', function(done) {
                var scope = nock('http://www.example.com')
                    .matchHeader('Content-Type', 'application/x-www-form-urlencoded')
                    .post('/token', {
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
                    assert.isNotNull(res);
                    assert.equals('token', res.body.access_token);
                    assert.equals('refresh', res.body.refresh_token);
                    assert.equals(2, res.body.expires_in)
                    return done(err);
                });

            });
            it('should automatically retrieve tokens when trying to perform a request', function(done) {
            });
            it('should correctly serialize scope', function(done) {
            });
        });
        describe('testing Refreshing tokens', function() {
            it('should throw an error if no refresh token', function(done) {
            });
            it('should work fine if refresh token is provided', function(done) {
            });
        });
        describe('testing authorization code', function() {
            it('should work if a code is set', function() {
            });
        });
    });
