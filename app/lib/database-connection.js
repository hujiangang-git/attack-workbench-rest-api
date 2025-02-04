'use strict';

exports.initializeConnection = async function() {
    const logger = require('./logger');
    const config = require('../config/config');

    if (!config.database.url) {
        logger.error('The URL for the MongoDB database must be set in the DATABASE_URL environment variable. Terminating app.');

        // Terminate the app
        process.exit(1);
    }

    const mongoose = require('mongoose');

    // Configure mongoose to use ES6 promises
    mongoose.Promise = global.Promise;

    // Tell mongoose to use the native mongoDB findOneAndUpdate() function
    mongoose.set('useFindAndModify', false);

    // Tell mongoose to use createIndex() instead of ensureIndex()
    mongoose.set('useCreateIndex', true);

    // Bootstrap db connection
    logger.info('Mongoose attempting to connect to ' + config.database.url);
    try {
        await mongoose.connect(config.database.url, { useNewUrlParser: true, useUnifiedTopology: true });
    } catch (error) {
        handleError(error);
    }
    logger.info('Mongoose connected to ' + config.database.url);

//    mongoose.connection.on('disconnected', function () {
//        logger.info('Mongoose disconnected from ' + config.database.url);
//    });

    function handleError(error) {
        logger.error('Mongoose connection error: ' + error);
        logger.error('Database (mongoose) connection is required. Terminating app.');

        // Terminate the app
        process.exit(1);
    }
}
