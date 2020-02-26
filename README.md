# Auth0 - email verification using email-otp

This is a simple SPA using Vue that is redirected to from
within an Auth0 (redirect-)rule.

For flow details, please see
https://tinyurl.com/r87n265

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
   
   The `client_id` of a regular webapp (or native app) that has access to the passwordless email connection. Enable only the `Passwordless OTP` grant type for this client.

2. **PWDLESS_CLIENT_SECRET**
   
   The `client_secret` for the above client.

3. **MGMT_API_CLIENT_ID**
   The `client_id` of M2M app with following scopes over Management API
   `read:users`, `update:users`, `create:users`, `delete:users`
   
4. **MGMT_API_CIENT_SECRET**
   
   The `client_secret` for the above client.

5. **ENTERPRISE_CONN_ID**

   The `id` of the enterprise connection

6. **DATABASE_CONN_NAME**

   The `name` of the database connection 
   - used while linking the enterprise user (secondary) with the database user (primary).

7. **OTP_COLLECTION_SPA_URL**
   
   The absolute url to `this` SPA application which collects email-OTP from the user

#### Flow Sequence ####
https://tinyurl.com/r87n265

The following excerpt from `rule` code sums up the approach

```
// check if we have returned using a /continue request
if (context.protocol === "redirect-callback") {
   let verifyOtpAction = context.request.body.verify;
   if (verifyOtpAction !== undefined) {
      console.info("verify user provided otp");
      verifyOtp(pwdlessClientId, pwdlessClientSecret, user.email, context.request.body.otp)
         .then(() => searchOrCreateUser(user.email, databaseConnName))
         .then(databaseUserId => setEmailVerified(`auth0|${databaseUserId}`))
         .then(() => searchUser(user.email, "email"))
         .then(pwdlessUserId => deleteUser(`email|${pwdlessUserId}`))
         .then(() => linkUsers(databaseUserId))
         .then(() => mainCallback(null, user, context))
         .catch(error => mainCallback(new UnauthorizedError(error)));
   }
} else {
   // start here
   console.info("send otp to user");
   sendOtp(pwdlessClientId, pwdlessClientSecret, user.email);
   console.info("redirect user to otp collection spa");
   collectOtp();
}
```
