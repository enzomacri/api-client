# node-api-client [![Build Status](https://travis-ci.org/enzomacri/api-client.svg?branch=master)](https://travis-ci.org/enzomacri/api-client)

Version > `2.x.x` is ES6 compliant and uses promises. Please see [ES6 Branch](https://github.com/enzomacri/api-client/tree/emacri-ft-es6)

# Usage

This module handles OAuth2 flow using credentials (username / password), authorization code and regular tokens (access_token, refresh_token) couple

## Client

Creating a client is straightforward, the constructor takes two arguments

```
const config = {
    // Put configuration here ...
}
/**
 * Create OAuth2 client
 * @param baseUrl (string)
 * @param config (object)
 */
const client = new Client('https://api.test.com', config)
```

### Options
Supported options

#### user_agent (string)

#### client_id (string)

#### client_secret (string)

#### urls (object)

Optional parameter

```
{
    api: 'https://api.test.com/',
    token: 'https://test.com/oauth2/token',
    authorize: 'https://test.com/oauth2/authorize'
}
```

Default value is:

```
{
    api: '{baseUrl}/',
    token: '{baseUrl}/token',
    authorize: '{baseUrl}/authorize'
}
```

where `baseUrl` is the first argument used in the constructor

#### timeout (integer)

Default value is 10s

#### access_token (string)

#### refresh_token (string)

#### expires_in (integer)

#### authorization_code (sring)

#### scope (string)

#### redirect_uri (string)

#### username (string)

#### password (string)

#### shouldRefreshToken (function)

Access token expiration is handled by the library, specific cases can be added by overriding this function.

### Client.getAccessToken

Calling `getAccessToken` will return valid tokens.

Works with authorization code, username / password flow and a refresh_token when the access_token is expired.

```
client.getAccessToken()
```

Output example:

```
{
    "access_token": ... (string),
    "refresh_token": ... (string),
    "expires_in": ... (integer)
}
```

### Client.get

```
client.get('v1/user', { ... })
```

### Client.post

```
client.post('v1/user', { ... })
```

## Errors

Error classes are exposed in `require('oauth-api-client/errors')`
