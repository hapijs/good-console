// Load modules

var Squeeze = require('good-squeeze').Squeeze;
var Hoek = require('hoek');
var Moment = require('moment');
var SafeStringify = require('json-stringify-safe');
var Through = require('through2');

// Declare internals

var internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS',
        utc: true
    }
};

module.exports = internals.GoodConsole = function (events, config) {

    if (!(this instanceof internals.GoodConsole)) {
        return new internals.GoodConsole(events, config);
    }
    config = config || {};
    this._settings = Hoek.applyToDefaults(internals.defaults, config);
    this._filter = new Squeeze(events);
};


internals.GoodConsole.prototype.init = function (stream, emitter, callback) {

    var self = this;

    if (!stream._readableState.objectMode) {
        return callback(new Error('stream must be in object mode'));
    }

    stream.pipe(this._filter).pipe(Through.obj(function goodConsoleTransform (data, enc, next) {

        var eventName = data.event;
        var tags = [];

        /*eslint-disable */
        if (Array.isArray(data.tags)) {
            tags = data.tags.concat([]);
        } else if (data.tags != null) {
            tags = [data.tags];
        }
        /*eslint-enable */

        tags.unshift(eventName);

        if (eventName === 'response') {
            this.push(self._formatResponse(data, tags));
            return next();
        }

        var eventPrintData = {
            timestamp: data.timestamp || Date.now(),
            tags: tags,
            data: undefined
        };

        if (eventName === 'ops') {
            eventPrintData.data = Hoek.format('memory: %sMb, uptime (seconds): %s, load: %s',
                Math.round(data.proc.mem.rss / (1024 * 1024)),
                data.proc.uptime,
                data.os.load);

            this.push(self._printEvent(eventPrintData));
            return next();
        }

        if (eventName === 'error') {
            eventPrintData.data = 'message: ' + data.error.message + ' stack: ' + data.error.stack;

            this.push(self._printEvent(eventPrintData));
            return next();
        }

        if (eventName === 'request' || eventName === 'log') {
            eventPrintData.data = 'data: ' + (typeof data.data === 'object' ? SafeStringify(data.data) : data.data);

            this.push(self._printEvent(eventPrintData));
            return next();
        }

        // Event that is unknown to good-console, try a defualt.
        if (data.data) {
            eventPrintData.data = 'data: ' + (typeof data.data === 'object' ? SafeStringify(data.data) : data.data);
        }
        else {
            eventPrintData.data = 'data: (none)';
        }

        this.push(self._printEvent(eventPrintData));
        return next();
    })).pipe(process.stdout);

    callback();
};


internals.GoodConsole.prototype._printEvent = function (event) {

    var m = Moment(parseInt(event.timestamp, 10));
    if (!this._settings.utc) { m.local(); }

    var timestring = m.format(this._settings.format);
    var data = event.data;
    var output = timestring + ', [' + event.tags.toString() + '], ' + data;

    return output + '\n';
};


internals.GoodConsole.prototype._formatResponse = function (event, tags) {

    var query = event.query ? JSON.stringify(event.query) : '';
    var responsePayload = '';
    var statusCode = '';

    if (typeof event.responsePayload === 'object' && event.responsePayload) {
        responsePayload = 'response payload: ' + SafeStringify(event.responsePayload);
    }

    var methodColors = {
        get: 32,
        delete: 31,
        put: 36,
        post: 33
    };
    var color = methodColors[event.method] || 34;
    var method = '\x1b[1;' + color + 'm' + event.method + '\x1b[0m';

    if (event.statusCode) {
        color = 32;
        if (event.statusCode >= 500) {
            color = 31;
        } else if (event.statusCode >= 400) {
            color = 33;
        } else if (event.statusCode >= 300) {
            color = 36;
        }
        statusCode = '\x1b[' + color + 'm' + event.statusCode + '\x1b[0m';
    }

    return this._printEvent({
        timestamp: event.timestamp,
        tags: tags,
        //instance, method, path, query, statusCode, responseTime, responsePayload
        data: Hoek.format('%s: %s %s %s %s (%sms) %s', event.instance, method, event.path, query, statusCode, event.responseTime, responsePayload)
    });
};
