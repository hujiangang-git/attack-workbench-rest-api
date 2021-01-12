const request = require('supertest');
const database = require('../../../lib/database-in-memory')
const expect = require('expect');
const _ = require('lodash');

const logger = require('../../../lib/logger');
logger.level = 'debug';

// modified and created properties will be set before calling REST API
// stix.id property will be created by REST API
const initialObjectData = {
    workspace: {
        domains: [ 'domain-1']
    },
    stix: {
        name: 'software-1',
        spec_version: '2.1',
        type: 'software',
        description: 'This is a software.',
        external_references: [
            { source_name: 'source-1', external_id: 's1' }
        ],
        object_marking_refs: [ 'marking-definition--fa42a846-8d90-4e51-bc29-71d5b4802168' ],
        created_by_ref: "identity--c78cb6e5-0c4b-4611-8297-d1b8b55e40b5"
    }
};

describe('Software API', function () {
    let app;

    before(async function() {
        // Initialize the express app
        app = await require('../../../index').initializeApp();

        // Establish the database connection
        // Use an in-memory database that we spin up for the test
        await database.initializeConnection();
    });

    it('GET /api/software returns an empty array of software', function (done) {
        request(app)
            .get('/api/software')
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get an empty array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(Array.isArray(software)).toBe(true);
                    expect(software.length).toBe(0);
                    done();
                }
            });
    });

    it('POST /api/software does not create an empty software', function (done) {
        const body = { };
        request(app)
            .post('/api/software')
            .send(body)
            .set('Accept', 'application/json')
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    done();
                }
            });
    });

    let software1;
    it('POST /api/software creates a software', function (done) {
        const timestamp = new Date().toISOString();
        initialObjectData.stix.created = timestamp;
        initialObjectData.stix.modified = timestamp;
        const body = initialObjectData;
        request(app)
            .post('/api/software')
            .send(body)
            .set('Accept', 'application/json')
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get the created software
                    software1 = res.body;
                    expect(software1).toBeDefined();
                    done();
                }
            });
    });

    it('GET /api/software returns the added software', function (done) {
        request(app)
            .get('/api/software')
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get one software in an array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(Array.isArray(software)).toBe(true);
                    expect(software.length).toBe(1);
                    done();
                }
            });
    });

    it('GET /api/software/:id should not return a software when the id cannot be found', function (done) {
        request(app)
            .get('/api/software/not-an-id')
            .set('Accept', 'application/json')
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    done(err);
                } else {
                    done();
                }
            });
    });

    it('GET /api/software/:id returns the added software', function (done) {
        request(app)
            .get('/api/software/' + software1.stix.id)
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get one software in an array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(Array.isArray(software)).toBe(true);
                    expect(software.length).toBe(1);

                    const softwr = software[0];
                    expect(softwr).toBeDefined();
                    expect(softwr.stix).toBeDefined();
                    expect(softwr.stix.id).toBe(software1.stix.id);
                    expect(softwr.stix.type).toBe(software1.stix.type);
                    expect(softwr.stix.name).toBe(software1.stix.name);
                    expect(softwr.stix.description).toBe(software1.stix.description);
                    expect(softwr.stix.spec_version).toBe(software1.stix.spec_version);
                    expect(softwr.stix.object_marking_refs).toEqual(expect.arrayContaining(software1.stix.object_marking_refs));
                    expect(softwr.stix.created_by_ref).toBe(software1.stix.created_by_ref);

                    done();
                }
            });
    });

    it('PUT /api/software updates a software', function (done) {
        const originalModified = software1.stix.modified;
        const timestamp = new Date().toISOString();
        software1.stix.modified = timestamp;
        software1.stix.description = 'This is an updated software.'
        const body = software1;
        request(app)
            .put('/api/software/' + software1.stix.id + '/modified/' + originalModified)
            .send(body)
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get the updated software
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(software.stix.id).toBe(software1.stix.id);
                    expect(software.stix.modified).toBe(software1.stix.modified);
                    done();
                }
            });
    });

    it('POST /api/software does not create a software with the same id and modified date', function (done) {
        const body = software1;
        request(app)
            .post('/api/software')
            .send(body)
            .set('Accept', 'application/json')
            .expect(409)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    done();
                }
            });
    });

    let software2;
    it('POST /api/software should create a new version of a software with a duplicate stix.id but different stix.modified date', function (done) {
        software2 = _.cloneDeep(software1);
        software2._id = undefined;
        software2.__t = undefined;
        software2.__v = undefined;
        const timestamp = new Date().toISOString();
        software2.stix.modified = timestamp;
        const body = software2;
        request(app)
            .post('/api/software')
            .send(body)
            .set('Accept', 'application/json')
            .expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get the created software
                    const software = res.body;
                    expect(software).toBeDefined();
                    done();
                }
            });
    });

    it('GET /api/software returns the latest added software', function (done) {
        request(app)
            .get('/api/software/' + software2.stix.id)
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get one software in an array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(Array.isArray(software)).toBe(true);
                    expect(software.length).toBe(1);
                    const softwre = software[0];
                    expect(softwre.stix.id).toBe(software2.stix.id);
                    expect(softwre.stix.modified).toBe(software2.stix.modified);
                    done();
                }
            });
    });

    it('GET /api/software returns all added software', function (done) {
        request(app)
            .get('/api/software/' + software1.stix.id + '?versions=all')
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get two software in an array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(Array.isArray(software)).toBe(true);
                    expect(software.length).toBe(2);
                    done();
                }
            });
    });

    it('GET /api/software/:id/modified/:modified returns the first added software', function (done) {
        request(app)
            .get('/api/software/' + software1.stix.id + '/modified/' + software1.stix.modified)
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get one software in an array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(software.stix).toBeDefined();
                    expect(software.stix.id).toBe(software1.stix.id);
                    expect(software.stix.modified).toBe(software1.stix.modified);
                    done();
                }
            });
    });

    it('GET /api/software/:id/modified/:modified returns the second added software', function (done) {
        request(app)
            .get('/api/software/' + software2.stix.id + '/modified/' + software2.stix.modified)
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get one software in an array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(software.stix).toBeDefined();
                    expect(software.stix.id).toBe(software2.stix.id);
                    expect(software.stix.modified).toBe(software2.stix.modified);
                    done();
                }
            });
    });

    it('DELETE /api/software deletes a software', function (done) {
        request(app)
            .delete('/api/software/' + software1.stix.id + '/modified/' + software1.stix.modified)
            .expect(204)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    done();
                }
            });
    });

    it('DELETE /api/software should delete the second software', function (done) {
        request(app)
            .delete('/api/software/' + software2.stix.id + '/modified/' + software2.stix.modified)
            .expect(204)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    done();
                }
            });
    });

    it('GET /api/software returns an empty array of software', function (done) {
        request(app)
            .get('/api/software')
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) {
                    done(err);
                }
                else {
                    // We expect to get an empty array
                    const software = res.body;
                    expect(software).toBeDefined();
                    expect(Array.isArray(software)).toBe(true);
                    expect(software.length).toBe(0);
                    done();
                }
            });
    });

    after(async function() {
        await database.closeConnection();
    });
});

