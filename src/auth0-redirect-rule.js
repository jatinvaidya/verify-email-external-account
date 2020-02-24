 function (user, context, mainCallback) {

     console.log("---------------- executing rules -----------------");
     // target this rule only for a specific end-user app and 
     // only if authenticated user's email is not verified
     if (context.clientID === configuration.END_USER_CLIENT_ID &&
         !user.email_verified) {

         // require
         const request = require('request');

         // rule environment variables
         const pwdlessClientId = configuration.PWDLESS_CLIENT_ID;
         const optCollectionSpaUrl = configuration.OTP_COLLECTION_SPA_URL;
         const mgmtApiClientId = configuration.MGMT_API_CLIENT_ID;
         const mgmtApiClientSecret = configuration.MGMT_API_CLIENT_SECRET;

         // global variables
         let databaseUserId;

         // send otp to user 
         // @return: pwdlessUserId
         let sendOtp = (clientId, email) => new Promise((resolve, reject) => {
             const url = `https://${auth0.domain}/passwordless/start`;
             const requestJson = {
                 "client_id": clientId,
                 "connection": "email",
                 "email": email,
                 "send": "code"
             };
             // callback for send otp
             let sendOtpCallback = (err, response, body) => {
                 console.log(`[sendOtp] response: ${JSON.stringify(response)}`);
                 if (err) {
                     console.error(`[sendOtp] rejecting promise: ${err}`);
                     reject(err);
                 } else {
                     if (response.statusCode === 200) {
                         let pwdlessUserId = body._id;
                         console.log(`[sendOtp] resolving promise with pwdlessUserId: ${pwdlessUserId}`);
                         resolve(pwdlessUserId);
                     } else {
                         console.error("[sendOtp] rejecting promise");
                         reject("[sendOtp] failed");
                     }
                 }
             };
             request.post({
                 url: url,
                 json: requestJson
             }, sendOtpCallback);
         });

         // trigger redirect to otp collection SPA
         let collectOtp = () => {
             context.redirect = {
                 url: optCollectionSpaUrl
             };
             return mainCallback(null, user, context);
         };

         // verify the otp
         // @return: nothing
         let verifyOtp = (clientId, email, otp) => {
             return new Promise((resolve, reject) => {
                 const requestJson = {
                     "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
                     "client_id": clientId,
                     "username": email,
                     "otp": otp,
                     "realm": "email"
                 };

                 // callback for otp verify
                 let verifyOtpCallback = (err, response, body) => {

                     if (err) {
                         // oauth token request failed for some reason
                         console.error(`[verifyOtp] rejecting promise: ${err}`);
                         reject("[verifyOtp] failed");
                     } else {
                         console.info(`[verifyOtp] response: ${JSON.stringify(response)}`);
                         if (response.statusCode === 200) {
                             console.log("[verifyOtp] resolving promise");
                             resolve();
                         } else {
                             console.error("[verifyOtp] rejecting promise");
                             reject("[verifyOtp] failed");
                         }
                     }
                 };

                 const url = `https://${auth0.domain}/oauth/token`;
                 request.post({
                     url: url,
                     json: requestJson
                 }, verifyOtpCallback);
             });
         };

         // delete a user
         // @return: nothing
         let deleteUser = (userId) => new Promise((resolve, reject) => {

             console.log(`[deleteUser] userId: ${userId}`);
             getMgmtApiAccessToken()
                 .then(mgmtApiAccessToken => {
                     var headers = {
                         'Authorization': 'Bearer ' + mgmtApiAccessToken,
                     };

                     // calback for delete user
                     let deleteUserCallback = (err, response, body) => {
                         console.log(`[deleteUser] response: ${JSON.stringify(response)}`);
                         if (err) {
                             console.error(`[deleteUser] rejecting promise: ${err}`);
                             reject(err);
                         } else {
                             if (response.statusCode === 204) {
                                 console.log("[deleteUser] resolving promise");
                                 resolve();
                             } else {
                                 console.error("[deleteUser] rejecting promise");
                                 reject("[deleteUser] failed");
                             }
                         }
                     };

                     console.log(`[deleteUser] deleting user: ${userId}`);
                     request.delete({
                         url: `https://${auth0.domain}/api/v2/users/${userId}`,
                         headers: headers,
                     }, deleteUserCallback);
                 });
         });

         // mark email as verified
         // @return: nothing
         let setEmailVerified = (userId) => new Promise((resolve, reject) => {
             console.log(`setting email_verified to true for userId: ${userId}`);
             databaseUserId = userId;
             const data = {
                 "email_verified": true
             };
             var headers = {
                 'Authorization': 'Bearer ' + auth0.accessToken,
             };

             // calback for setting email verified
             let setEmailVerifiedCallback = (err, response, body) => {
                 console.log(`[setEmailVerified] response: ${JSON.stringify(response)}`);
                 if (err) {
                     console.error(`[setEmailVerified] rejecting promise: ${err}`);
                     reject(err);
                 } else {
                     if (response.statusCode === 200) {
                         console.log("[setEmailVerified] resolving promise");
                         resolve();
                     } else {
                         console.error("[setEmailVerified] rejecting promise");
                         reject("[setEmailVerified] failed");
                     }
                 }
             };

             // execute request
             console.log("patching user");
             request.patch({
                 url: `https://${auth0.domain}/api/v2/users/${userId}`,
                 headers: headers,
                 json: data
             }, setEmailVerifiedCallback);
         });

         // https://{{auth0_domain}}/api/v2/users?q=email:jatin.vaidya@gmail.com AND identities.connection:email
         // search for a user by email and conn
         // @return: user_id
         let searchUser = (email, connection) => new Promise((resolve, reject) => {
             console.log(`searching user email:${email} and connection:${connection}`);
             var headers = {
                 'Authorization': 'Bearer ' + auth0.accessToken,
                 'accept': 'application/json'
             };
             // callback for search user
             let searchUserCallback = (err, response, body) => {
                 console.log(`[searchUser] response: ${JSON.stringify(response)}`);
                 if (err) {
                     console.error(`[searchUser] error: ${err}`);
                     reject(err);
                 } else {
                     if (response.statusCode === 200) {
                         try {
                             let userId = JSON.parse(body)[0].identities[0].user_id;
                             console.log(`[searchUser] resolving promise with userId: ${JSON.parse(body)[0].identities[0].user_id}`);
                             resolve(userId);
                         } catch (error) {
                             reject(error);
                         }
                     } else {
                         console.error("[searchUser] rejecting promise");
                         reject("[searchUser] failed");
                     }
                 }
             };
             // execute request
             let searchQuery = `email:${email}%20AND%20identities.connection:${connection}`;
             request.get({
                 url: `https://${auth0.domain}/api/v2/users?q=${searchQuery}`,
                 headers: headers
             }, searchUserCallback);
         });

         let createUser = (email, connection) => new Promise((resolve, reject) => {
             console.log(`[createUser] email: ${email} and connection: ${connection}`);
             getMgmtApiAccessToken()
                 .then(mgmtApiAccessToken => {
                     var headers = {
                         'Authorization': 'Bearer ' + mgmtApiAccessToken,
                     };
                     let data = {
                         "connection": `${connection}`,
                         "email": `${email}`,
                         "password": "Cde34rfv!23"
                     };
                     // calback for create user
                     let createUserCallback = (err, response, body) => {
                         console.log(`[createUser] response: ${JSON.stringify(response)}`);
                         if (err) {
                             console.error(`[createUser] rejecting promise: ${err}`);
                             reject(err);
                         } else {
                             if (response.statusCode === 201) {
                                 console.log("[createUser] resolving promise");
                                 resolve(`${body.user_id.split("|")[1]}`);
                             } else {
                                 console.error("[createUser] rejecting promise");
                                 reject("[createUser] failed");
                             }
                         }
                     };
                     request.post({
                         url: `https://${auth0.domain}/api/v2/users`,
                         headers: headers,
                         json: data
                     }, createUserCallback);
                 });
         });

         let linkUsers = (primaryUserId) => new Promise((resolve, reject) => {
             console.log(`[linkUser] primaryUserId: ${primaryUserId}`);
             console.log(`[linkUser] secondaryUserId: ${user.user_id}`);
             getMgmtApiAccessToken()
                 .then(mgmtApiAccessToken => {
                     var headers = {
                         'Authorization': 'Bearer ' + mgmtApiAccessToken,
                     };
                     let data = {
                         "provider": "oidc",
                         "connection_id": "con_eZqPvzgVbRaUA4b2",
                         "user_id": `${user.user_id}`
                     };
                     // calback for create user
                     let linkUsersCallback = (err, response, body) => {
                         console.log(`[linkUsers] response: ${JSON.stringify(response)}`);
                         if (err) {
                             console.error(`[linkUsers] rejecting promise: ${err}`);
                             reject(err);
                         } else {
                             if (response.statusCode === 201) {
                                 console.log("[linkUsers] resolving promise");
                                 resolve();
                             } else {
                                 console.error("[linkUsers] rejecting promise");
                                 reject("[linkUsers] failed");
                             }
                         }
                     };
                     request.post({
                         url: `https://${auth0.domain}/api/v2/users/${primaryUserId}/identities`,
                         headers: headers,
                         json: data
                     }, linkUsersCallback);

                 });
         });

         let searchOrCreateUser = (email, connection) => new Promise((resolve, reject) => {
             searchUser(email, connection)
                 .then(userId => resolve(userId))
                 .catch(() => createUser(email, connection)
                     .then(userId => resolve(userId)));
         });

         // get AT for mgmt api
         // @return: AT
         let getMgmtApiAccessToken = () => new Promise((resolve, reject) => {
             console.log("[getMgmtApiAccessToken] executing client_credentials grant");
             var options = {
                 method: 'POST',
                 url: `https://${auth0.domain}/oauth/token`,
                 headers: {
                     'content-type': 'application/x-www-form-urlencoded'
                 },
                 form: {
                     grant_type: 'client_credentials',
                     client_id: mgmtApiClientId,
                     client_secret: mgmtApiClientSecret,
                     audience: `https://${auth0.domain}/api/v2/`
                 }
             };
             let getMgmtApiAccessTokenCallback = (err, response, body) => {
                 console.log(`[getMgmtApiAccessToken] response: ${JSON.stringify(response)}`);
                 if (err) {
                     console.log(`[getMgmtApiAccessToken] error: ${err}`);
                     reject(err);
                 } else {
                     if (response.statusCode === 200) {
                         console.log(`[getMgmtApiAccessToken] resolving promise with access_token: ${JSON.parse(body).access_token}`);
                         resolve(JSON.parse(body).access_token);
                     } else {
                         console.error("[getMgmtApiAccessToken] rejecting promise");
                         reject("[getMgmtApiAccessToken] failed");
                     }
                 }
             };
             request(options, getMgmtApiAccessTokenCallback);
         });

         // check if we have returned using a /continue request
         if (context.protocol === "redirect-callback") {
             let verifyOtpAction = context.request.body.verify;
             if (verifyOtpAction !== undefined) {
                 console.info(`verify user provided otp: ${context.request.body.otp}`);
                 verifyOtp(pwdlessClientId, user.email, context.request.body.otp)
                     .then(() => searchOrCreateUser(user.email, "Username-Password-Authentication"))
                     .then(databaseUserId => setEmailVerified(`auth0|${databaseUserId}`))
                     .then(() => searchUser(user.email, "email"))
                     .then(pwdlessUserId => deleteUser(`email|${pwdlessUserId}`))
                     .then(() => linkUsers(databaseUserId))
                     .then(() => mainCallback(null, user, context))
                     .catch(error => mainCallback(new UnauthorizedError(error)));
             }
         } else {
             console.info("send otp to user");
             sendOtp(pwdlessClientId, user.email);
             console.info("redirect user to otp collection spa");
             collectOtp();
         }
     } else {
         // don't bother other type of requests
         console.info("don't bother this rule");
         return mainCallback(null, user, context);
     }
 }