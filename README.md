# email-verify-otp

## Project setup
```
npm install
```
### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```
### Auth0

On Auth0 tenant setup a `rule` with code from `src/auth0-redirect-rule.js`

#### Rule Envronment Variables ####

1. **PWDLESS_CLIENT_ID**
   
   This must be the `client_id` of a native app (or regular web app) that has access to the passwordless email connection.

2. **END_USER_CLIENT_ID**
   
   This must be the `client_id` of the end-user application

3. **OTP_COLLECTION_SPA_URL**
   
   This must be the absolute url to `this` SPA application

#### Flow Sequence ####
https://tinyurl.com/texp2hn

