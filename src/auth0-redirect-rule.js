function (user, context, mainCallback) {

    // target this rule only for a specific end-user app and 
    // only if authenticated user's email is not verified
    if (context.clientID === configuration.END_USER_CLIENT_ID &&
        !user.email_verified) {

        // request package
        const request = require('request');

        // send otp to user
        let sendOtp = (clientId, email) => {
            const requestJson = {
                "client_id": clientId,
                "connection": "email",
                "email": email,
                "send": "code"
            };

            // callback for send otp
            let sendOtpCallback = (err, response, body) => {
                if(err) console.error(`[sendOtp] error: ${err}`);
                console.log(`[sendOtp] response: ${JSON.stringify(response)}`);
            };

            const url = `https://${auth0.domain}/passwordless/start`;
            request.post({
                url: url,
                json: requestJson
            }, sendOtpCallback);
        };

        let collectOtp = () => {
            context.redirect = {
                url: optCollectionSpaUrl
            };
            return mainCallback(null, user, context);
        };

        // verify the otp
        let verifyOtp = (clientId, email, otp) => {
            const requestJson = {
                "grant_type": "http://auth0.com/oauth/grant-type/passwordless/otp",
                "client_id": clientId,
                "username": email,
                "otp": otp,
                "realm": "email"
            };

            // callback for otp verify
            let verifyOtpCallback = (err, response, body) => {
                if(err) {
                    // oauth token request failed for some reason
                    console.error(`[verifyOtp] error: ${err}`);
                    return mainCallback(new UnauthorizedError("otp verification failed"));
                } else {
                    console.info(`[verifyOtp] response: ${JSON.stringify(response)}`);
                    if (response.statusCode === 200) {
                        setEmailVerified(user);
                        return mainCallback(null, user, context);
                    } else {
                        console.error("[verifyOtp] error");
                        return mainCallback(new UnauthorizedError("otp verification failed"));
                    }
                }
            };

            const url = `https://${auth0.domain}/oauth/token`;
            request.post({
                url: url,
                json: requestJson
            }, verifyOtpCallback);
        };

        // mark email as verified
        let setEmailVerified = () => {
            console.log("setting email_verified to true");
            var headers = {
                'Authorization': 'Bearer ' + auth0.accessToken,
            };
            const data = {
                "email_verified": true
            };

            // calback for setting email verified
            let setEmailVerifiedCallback = (err, response, body) => {
                console.log(`[setEmailVerified] response: ${JSON.stringify(response)}`);
                if(err) console.error(`[setEmailVerified] error: ${err}`);
                else {
                    // this isn't working - id_token does not show ...
                    // ... the updated value for email_verified claim
                    // bug or wad? if wad, whats the workaround?
                    console.log("setting email_verified claim as true in id_token");
                    context.idToken.email_verified = true;
                    user.email_verified = true;
                }
            };

            // execute request
            request.patch({
                url: `https://${auth0.domain}/api/v2/users/${user.user_id}`,
                headers: headers,
                json: data
            }, setEmailVerifiedCallback);
        };

        // rule environment variables
        const pwdlessClientId = configuration.PWDLESS_CLIENT_ID;
        const optCollectionSpaUrl = configuration.OTP_COLLECTION_SPA_URL;

        // check if we have returned using a /continue request
        if (context.protocol === "redirect-callback") {
            let verifyOtpAction = context.request.body.verify;
            if(verifyOtpAction !== undefined) {
                console.info(`verify user provided otp: ${context.request.body.otp}`);
                verifyOtp(pwdlessClientId, user.email, context.request.body.otp);
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