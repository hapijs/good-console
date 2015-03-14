// Load modules

var GoodSqueeze = require('good-squeeze');
var Hoek = require('hoek');
var Moment = require('moment');
var SafeStringify = require('json-stringify-safe');
var Through = require('through2');

// Declare internals

var internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS',
        utc: true,
        logHeaderPayloadWhenProvided: false,
        logRequestPayloadWhenProvided: false
    }
};

module.exports = internals.GoodConsole = function (events, options) {

    if (!(this instanceof internals.GoodConsole)) {
        return new internals.GoodConsole(events, options);
    }
    options = options || {};
    this._settings = Hoek.applyToDefaults(internals.defaults, options);
    this._filter = new GoodSqueeze(events);
};


internals.GoodConsole.prototype.init = function (stream, emitter, callback) {

    var self = this;

    if (!stream._readableState.objectMode) {
        return callback(new Error('stream must be in object mode'));
    }

    stream.pipe(this._filter).pipe(Through.obj(function goodConsoleTransform(data, enc, next) {

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

    var m = Moment.utc(event.timestamp);
    if (!this._settings.utc) { m.local(); }

    var timestring = m.format(this._settings.format);
    var data = event.data;
    var output = timestring + ', [' + event.tags.toString() + '], ' + data;

    return output;
};


internals.GoodConsole.prototype._formatResponse = function (event, tags) {

    // resultant output
    var output = [];

    // method
    var methodColors = {
        get: 32,
        delete: 31,
        put: 36,
        post: 33
    };
    var color = methodColors[event.method] || 34;
    var method = '\x1b[1;' + color + 'm' + event.method + '\x1b[0m';
    output.push(method);

    // url path
    output.push(event.path);

    // url query
    var query = event.query ? JSON.stringify(event.query) : null;
    if (query) {
      output.push(query);
    }

    // request payload
    if (this._settings.logRequestPayloadWhenProvided &&                   // option to include request payload enabled
      typeof event.requestPayload === 'object' && event.requestPayload) { // request payload actually provided by Hapi

      var requestPayload = 'request_payload:' + SafeStringify(event.requestPayload);
      output.push(requestPayload);
    }

    // status code
    if (event.statusCode) {
        color = 32;
        if (event.statusCode >= 500) {
            color = 31;
        } else if (event.statusCode >= 400) {
            color = 33;
        } else if (event.statusCode >= 300) {
            color = 36;
        }
        var statusCode = '\x1b[' + color + 'm' + event.statusCode + '\x1b[0m';
        output.push(statusCode);
    }

    // response time
    output.push(Hoek.format('(%sms)', event.responseTime));

    // headers
    if (this._settings.logHeaderPayloadWhenProvided &&      // option to include header payload enabled
      typeof event.headers === 'object' && event.headers) { // header payload actually provided by Hapi
      var headerPayload = 'headers:' + SafeStringify(event.headers);
      output.push(headerPayload);
    }

    // response payload
    if (typeof event.responsePayload === 'object' && event.responsePayload) {
      var responsePayload = 'response_payload:' + SafeStringify(event.responsePayload);
      output.push(responsePayload);
    }

    return this._printEvent({
        timestamp: event.timestamp,
        tags: tags,
        // instance, method, path, query, requestPayload, statusCode, responseTime, headers, responsePayload
        data: Hoek.format('%s: %s', event.instance, output.join(' '))
    });
};
