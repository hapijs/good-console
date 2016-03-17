'use strict';
// Load modules
const Stream = require('stream');

const Code = require('code');
const Hoek = require('hoek');
const Lab = require('lab');
const Moment = require('moment');
const StandIn = require('stand-in');
const GoodConsole = require('..');


// Declare internals

const internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS'
    }
};
internals.ops = {
    event: 'ops',
    timestamp: 1411583264547,
    os: {
        load: [1.650390625, 1.6162109375, 1.65234375],
        mem: { total: 17179869184, free: 8190681088 },
        uptime: 704891
    },
    proc: {
        uptime: 6,
        mem: {
            rss: 30019584,
            heapTotal: 18635008,
            heapUsed: 9989304
        },
        delay: 0.03084501624107361
    },
    load: { requests: {}, concurrents: {}, responseTimes: {} },
    pid: 64291
};
internals.response = {
    event: 'response',
    method: 'post',
    statusCode: 200,
    timestamp: Date.now(),
    instance: 'localhost',
    path: '/data',
    responseTime: 150,
    query: {
        name: 'adam'
    },
    responsePayload: {
        foo: 'bar',
        value: 1
    }
};
internals.request = {
    event: 'request',
    timestamp: 1411583264547,
    tags: ['user', 'info'],
    data: 'you made a request',
    pid: 64291,
    id: '1419005623332:new-host.local:48767:i3vrb3z7:10000',
    method: 'get',
    path: '/'
};
internals.wreck = {
    event: 'wreck',
    timestamp: 1446738313624,
    timeSpent: 29,
    pid: 25316,
    request: {
        method: 'GET',
        path: '/test',
        url: 'http://localhost/test',
        protocol: 'http:',
        host: 'localhost'
    },
    response: {
        statusCode: 200,
        statusMessage: 'OK'
    }
};
internals.wreckError = {
    event: 'wreck',
    timestamp: 1446740440479,
    timeSpent: 7,
    pid: 28215,
    error: {
        message: 'test error',
        stack: 'test stack'
    },
    request: {
        method: 'GET',
        path: '/test',
        url: 'http://localhost/test',
        protocol: 'http:',
        host: 'localhost',
        headers: {
            host: 'localhost'
        }
    },
    response: {
        statusCode: undefined,
        statusMessage: undefined,
        headers: undefined
    }
};


internals.readStream = function (done) {

    const result = new Stream.Readable({ objectMode: true });
    result._read = Hoek.ignore;

    if (typeof done === 'function') {
        result.once('end', done);
    }

    return result;
};

// Test shortcuts

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.describe;
const it = lab.it;

describe('GoodConsole', () => {

    it('returns a new object without "new"', { plan: 1 }, (done) => {

        const reporter = GoodConsole({ log: '*' });
        expect(reporter._settings).to.exist();

        done();
    });

    it('returns a new object with "new"', { plan: 1 }, (done) => {

        const reporter = new GoodConsole({ log: '*' });
        expect(reporter._settings).to.exist();

        done();
    });

    it('throws an error if the incomming stream is not in objectMode', { plan: 3 }, (done) => {

        const reporter = GoodConsole({ log: '*' });
        expect(reporter._settings).to.exist();

        const stream = new Stream.Readable();

        reporter.init(stream, null, (err) => {

            expect(err).to.exist();
            expect(err.message).to.equal('stream must be in object mode');
            done();
        });
    });

    describe('_report()', () => {

        describe('printResponse()', () => {

            it('logs to the console for "response" events', { plan: 2 }, (done) => {

                const reporter = GoodConsole({ response: '*' });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);

                StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {
                        stand.restore();
                        expect(string).to.equal(timeString + ', [response], localhost: [1;33mpost[0m /data {"name":"adam"} [32m200[0m (150ms) response payload: {"foo":"bar","value":1}\n');
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                internals.response.timestamp = now;

                const s = internals.readStream(done);

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();

                    s.push(internals.response);
                    s.push(null);
                });
            });

            it('logs to the console for "response" events without a query', { plan: 2 }, (done) => {

                const reporter = new GoodConsole({ response: '*' });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);
                const event = Hoek.clone(internals.response);

                delete event.query;

                StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {
                        stand.restore();
                        expect(string).to.equal(timeString + ', [response], localhost: [1;33mpost[0m /data  [32m200[0m (150ms) response payload: {"foo":"bar","value":1}\n');
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                event.timestamp = now;

                const s = internals.readStream(done);

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();
                    s.push(event);
                    s.push(null);
                });
            });

            it('logs to the console for "response" events without a responsePayload', { plan: 2 }, (done) => {

                const reporter = new GoodConsole({ response: '*' });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);
                const event = Hoek.clone(internals.response);

                delete event.responsePayload;

                StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {
                        stand.restore();
                        expect(string).to.equal(timeString + ', [response], localhost: [1;33mpost[0m /data {"name":"adam"} [32m200[0m (150ms) \n');
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                event.timestamp = now;

                const s = internals.readStream(done);

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();
                    s.push(event);
                    s.push(null);
                });
            });

            it('provides a default color for response methods', { plan: 2 }, (done) => {

                const reporter = new GoodConsole({ response: '*' });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);
                const event = Hoek.clone(internals.response);

                StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {
                        stand.restore();
                        expect(string).to.equal(timeString + ', [response], localhost: [1;34mhead[0m /data {"name":"adam"} [32m200[0m (150ms) response payload: {"foo":"bar","value":1}\n');
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                event.timestamp = now;
                event.method = 'head';

                const s = internals.readStream(done);

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();
                    s.push(event);
                    s.push(null);
                });
            });

            it('prints request events with no colors when \'color\' config is set to false', { plan: 2 }, (done) => {

                const reporter = new GoodConsole({ response: '*' }, { color: false });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);
                const event = Hoek.clone(internals.response);

                StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {
                        stand.restore();
                        expect(string).to.equal(timeString + ', [response], localhost: head /data {"name":"adam"} 200 (150ms) response payload: {"foo":"bar","value":1}\n');
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                event.timestamp = now;
                event.method = 'head';

                const s = internals.readStream(done);

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();
                    s.push(event);
                    s.push(null);
                });
            });

            it('does not log a status code if there is not one attached', { plan: 2 }, (done) => {

                const reporter = new GoodConsole({ response: '*' });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);
                const event = Hoek.clone(internals.response);

                StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {
                        stand.restore();
                        expect(string).to.equal(timeString + ', [response], localhost: [1;33mpost[0m /data {"name":"adam"}  (150ms) response payload: {"foo":"bar","value":1}\n');
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                event.timestamp = now;
                delete event.statusCode;

                const s = internals.readStream(done);

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();
                    s.push(event);
                    s.push(null);
                });

            });

            it('uses different colors for different status codes', { plan: 6 }, (done) => {

                let counter = 1;
                const reporter = new GoodConsole({ response: '*' });
                const now = Date.now();
                const timeString = Moment(now).format(internals.defaults.format);
                const colors = {
                    1: 32,
                    2: 32,
                    3: 36,
                    4: 33,
                    5: 31
                };

                const write = StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                    if (string.indexOf(timeString) === 0) {

                        const expected = Hoek.format('%s, [response], localhost: [1;33mpost[0m /data  [%sm%s[0m (150ms) \n', timeString, colors[counter], counter * 100);
                        expect(string).to.equal(expected);

                        counter++;
                    }
                    else {
                        stand.original(string, enc, callback);
                    }
                });

                const s = internals.readStream(() => {

                    write.restore();
                    done();
                });

                reporter.init(s, null, (err) => {

                    expect(err).to.not.exist();

                    for (let i = 1; i < 6; ++i) {
                        const event = Hoek.clone(internals.response);
                        event.statusCode = i * 100;
                        event.timestamp = now;

                        delete event.query;
                        delete event.responsePayload;

                        s.push(event);
                    }
                    s.push(null);
                });
            });
        });

        it('prints ops events', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ ops: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);
            const event = Hoek.clone(internals.ops);

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [ops], memory: 29Mb, uptime (seconds): 6, load: 1.650390625,1.6162109375,1.65234375\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            event.timestamp = now;

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('prints error events', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ error: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);
            const event = {
                event: 'error',
                error: {
                    message: 'test message',
                    stack: 'fake stack for testing'
                }
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [error], message: test message stack: fake stack for testing\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            event.timestamp = now;

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('prints request events with string data', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ request: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [request,user,info], data: you made a request\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            internals.request.timestamp = now;

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(internals.request);
                s.push(null);
            });
        });

        it('prints request events with object data', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ request: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [request,user,info], data: {"message":"you made a request to a resource"}\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            internals.request.timestamp = now;
            internals.request.data = { message: 'you made a request to a resource' };

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(internals.request);
                s.push(null);
            });
        });

        it('logs to the console for "wreck" events', { plan: 2 }, (done) => {

            const reporter = GoodConsole({ wreck: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [wreck], \u001b[1;32mget\u001b[0m: http://localhost/test \u001b[32m200\u001b[0m OK (29ms)\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            internals.wreck.timestamp = now;

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();

                s.push(internals.wreck);
                s.push(null);
            });
        });

        it('logs to the console for "wreck" events that contain errors', { plan: 2 }, (done) => {

            const reporter = GoodConsole({ wreck: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [wreck], \u001b[1;32mget\u001b[0m: http://localhost/test (7ms) error: test error stack: test stack\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            internals.wreckError.timestamp = now;

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();

                s.push(internals.wreckError);
                s.push(null);
            });
        });

        it('prints a generic message for unknown event types with "data" as an object', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);
            const event = {
                event: 'test',
                data: {
                    reason: 'for testing'
                },
                tags: ['user'],
                timestamp: now
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [test,user], data: {"reason":"for testing"}\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('prints a generic message for unknown event types with "data" as a string', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);
            const event = {
                event: 'test',
                data: 'for testing',
                tags: ['user'],
                timestamp: now
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [test,user], data: for testing\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('prints a generic message for unknown event types with no "data" attribute', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);
            const event = {
                event: 'test',
                tags: 'user',
                timestamp: now
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [test,user], data: (none)\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('prints log events with string data', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ log: '*' }, { format: 'DD-YY -- ZZ', utc: false });
            const now = Date.now();
            const timeString = Moment(now).format('DD-YY -- ZZ');

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [log,info], data: this is a log\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push({
                    event: 'log',
                    timestamp: now,
                    tags: ['info'],
                    data: 'this is a log'
                });
                s.push(null);
            });
        });

        it('prints log events with object data', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ log: '*' });
            const now = Date.now();
            const timeString = Moment(now).format(internals.defaults.format);

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [log,info,high], data: {"message":"this is a log"}\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            internals.request.timestamp = now;

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push({
                    event: 'log',
                    timestamp: now,
                    tags: ['info', 'high'],
                    data: {
                        message: 'this is a log'
                    }
                });
                s.push(null);
            });
        });

        it('formats the timestamp based on the supplied option', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' }, { format: 'YYYY' });
            const now = Date.now();
            const timeString = Moment(now).format('YYYY');
            const event = {
                event: 'test',
                data: {
                    reason: 'for testing'
                },
                tags: ['user'],
                timestamp: now
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [test,user], data: {"reason":"for testing"}\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('formats the timestamp based on the supplied option non-utc mode', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' }, { format: 'YYYY - ZZ', utc: false });
            const now = Date.now();
            const timeString = Moment(now).format('YYYY - ZZ');
            const event = {
                event: 'test',
                data: {
                    reason: 'for testing'
                },
                tags: ['user'],
                timestamp: now
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [test,user], data: {"reason":"for testing"}\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('formats the timestamp even if it\'s a string', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' }, { format: 'YYYY - ZZ' });
            const now = Date.now();
            const timeString = Moment(now).format('YYYY - ZZ');
            const event = {
                event: 'test',
                data: {
                    reason: 'for testing'
                },
                tags: ['user'],
                timestamp: now + ''
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf(timeString) === 0) {
                    stand.restore();
                    expect(string).to.equal(timeString + ', [test,user], data: {"reason":"for testing"}\n');
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });

        it('uses the current time if the event does not have a timestamp property', { plan: 2 }, (done) => {

            const reporter = new GoodConsole({ test: '*' });
            const event = {
                event: 'test',
                data: {
                    reason: 'for testing'
                },
                tags: ['user', '!!!']
            };

            StandIn.replace(process.stdout, 'write', (stand, string, enc, callback) => {

                if (string.indexOf('!!!') >= 0) {
                    stand.restore();
                    expect(/\[test,user,!!!], data: {"reason":"for testing"}/.test(string)).to.be.true();
                }
                else {
                    stand.original(string, enc, callback);
                }
            });

            const s = internals.readStream(done);

            reporter.init(s, null, (err) => {

                expect(err).to.not.exist();
                s.push(event);
                s.push(null);
            });
        });
    });
});
