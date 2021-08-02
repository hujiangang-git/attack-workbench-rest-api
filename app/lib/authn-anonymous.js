'use strict';

const AnonymousUuidStrategy = require('passport-anonym-uuid');
const systemConfigurationService = require('../services/system-configuration-service');

/**
 * This function takes the user session object and returns the value (the userSessionKey) that will be
 * stored in the express session for this user
 */
exports.serializeUser = function(userSession, done) {
    const userSessionKey = {
        strategy: 'anonymId',
        sessionId: userSession.anonymousUuid
    }
    done(null, userSessionKey);
};

/**
 * This function takes the userSessionKey (the value stored in the express session for this user) and
 * returns the user session object
 */
exports.deserializeUser = function(userSessionKey, done) {
    if (userSessionKey.strategy === 'anonymId') {
        makeUserSession(userSessionKey.sessionId)
            .then(userSession => done(null, userSession))
            .catch(err => done(err));
    }
    else {
        throw new Error('Cannot deserialize userSessionKey, wrong strategy');
    }
};

exports.getStrategy = function() {
    return new AnonymousUuidStrategy(verifyCallback);
}

/**
 * This function is called by the strategy after the user has authenticated using the anonymous strategy
 * It creates and returns the user session for this user
 */
function verifyCallback(req, uuid, done) {
    // The anonymous strategy creates a new uuid for each login
    makeUserSession(uuid)
        .then(userSession => done(null, userSession))
        .catch(err => done(err));
}

async function makeUserSession(uuid) {
    const anonymousUserAccount = await systemConfigurationService.retrieveAnonymousUserAccount();

    const userAccountData = (({ email, name, status, role }) => ({ email, name, status, role }))(anonymousUserAccount);
    const userSession = {
        userAccountId: anonymousUserAccount.id,
        ...userAccountData,
        registered: true,
        anonymousUuid: uuid
    };

    return userSession;
}
