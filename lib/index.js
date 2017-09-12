'use strict';

// Load Modules

const Hoek = require('hoek');
const Moment = require('moment');
const Stream = require('stream');
const SafeStringify = require('json-stringify-safe');

const internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS',
        utc: true,
        color: true,
        requestTails: []
    }
};

internals.utility = {

    setupTags(eventName, eventTags) {

        let tags = [];

        if (Array.isArray(eventTags)) {
            tags = eventTags.concat([]);
        }
        else if (eventTags) {
            tags = [eventTags];
        }

        tags.unshift(eventName);

        return tags;
    },

    formatOutput(event, settings) {

        let timestamp = Moment(parseInt(event.timestamp, 10));

        if (settings.utc) {
            timestamp = timestamp.utc();
        }

        timestamp = timestamp.format(settings.format);

        event.tags = event.tags.toString();
        const tags = ` [${event.tags}] `;

        // add event id information if available, typically for 'request' events
        const id = event.id ? ` (${event.id})` : '';

        const output = `${timestamp},${id}${tags}${event.data}`;

        return output + `\n`;
    },

    formatMethod(method, settings) {

        const methodColors = {
            get: 32,
            delete: 31,
            put: 36,
            post: 33
        };

        let formattedMethod = method.toLowerCase();
        if (settings.color) {
            const color = methodColors[method.toLowerCase()] || 34;
            formattedMethod = `\x1b[1;${color}m${formattedMethod}\x1b[0m`;
        }

        return formattedMethod;
    },

    formatStatusCode(statusCode, settings) {

        let color;
        if (statusCode && settings.color) {
            color = 32;
            if (statusCode >= 500) {
                color = 31;
            }
            else if (statusCode >= 400) {
                color = 33;
            }
            else if (statusCode >= 300) {
                color = 36;
            }

            return `\x1b[${color}m${statusCode}\x1b[0m`;
        }

        return statusCode;
    },

    formatRequest(event, tags, settings) {

        const dataObject = typeof event.data === 'object' ? event.data : { message: event.data };
        const data = SafeStringify(Object.assign({ request: event.request }, dataObject));

        const request = {
            timestamp: event.timestamp,
            tags,
            data
        };

        return internals.utility.formatOutput(request, settings);
    },

    formatTailEvents(tailLog, settings) {

        const formatTailEntry = (entry) => internals.utility.formatRequest(entry, internals.utility.setupTags('request', entry.tags), settings);

        const allowAny = settings.requestTails === '*';

        const hasRequestedTag = (entry) => {

            const requestedTagsSet = new Set(settings.requestTails);
            for (const elem of entry.tags) {
                if (requestedTagsSet.has(elem)) {
                    return true;
                };
            }
            return false;
        };

        const onlyRequestedTags = (entry) => allowAny || hasRequestedTag(entry);

        return tailLog.filter(onlyRequestedTags).map(formatTailEntry);
    },


    formatResponse(event, tags, settings) {

        const query = event.query ? JSON.stringify(event.query) : '';
        const method = internals.utility.formatMethod(event.method, settings);
        const statusCode = internals.utility.formatStatusCode(event.statusCode, settings) || '';

        // event, timestamp, id, instance, labels, method, path, query, responseTime,
        // statusCode, pid, httpVersion, source, remoteAddress, userAgent, referer, log
        // method, pid, error
        const responseOutput = `${event.instance}: ${method} ${event.path} ${query} ${statusCode} (${event.responseTime}ms)`;

        const response = {
            timestamp: event.timestamp,
            tags,
            data: responseOutput
        };

        const formattedResponse = internals.utility.formatOutput(response, settings);

        if (Array.isArray(settings.requestTails) && settings.requestTails.length === 0) {
            return formattedResponse;
        };

        const tails = internals.utility.formatTailEvents(event.log, settings);
        const output = [].concat(tails).concat([formattedResponse]);

        return output.join('');
    },

    formatOps(event, tags, settings) {

        const memory = Math.round(event.proc.mem.rss / (1024 * 1024));
        const output = `memory: ${memory}Mb, uptime (seconds): ${event.proc.uptime}, load: [${event.os.load}]`;

        const ops = {
            timestamp: event.timestamp,
            tags,
            data: output
        };

        return internals.utility.formatOutput(ops, settings);
    },

    formatError(event, tags, settings) {

        const output = `message: ${event.error.message}, stack: ${event.error.stack}`;

        const error = {
            timestamp: event.timestamp,
            tags,
            data: output
        };

        return internals.utility.formatOutput(error, settings);
    },

    formatDefault(event, tags, settings) {

        const data = typeof event.data === 'object' ? SafeStringify(event.data) : event.data;
        const output = `data: ${data}`;

        const defaults = {
            timestamp: event.timestamp,
            id: event.id,
            tags,
            data: output
        };

        return internals.utility.formatOutput(defaults, settings);
    }
};

class GoodConsole extends Stream.Transform {
    constructor(config) {

        super({ objectMode: true });

        config = config || {};
        this._settings = Hoek.applyToDefaults(internals.defaults, config);
    }

    _transform(data, enc, next) {

        const eventName = data.event;
        const tags = internals.utility.setupTags(eventName, data.tags);

        if (eventName === 'error') {
            return next(null, internals.utility.formatError(data, tags, this._settings));
        }

        if (eventName === 'ops') {
            return next(null, internals.utility.formatOps(data, tags, this._settings));
        }

        if (eventName === 'response') {
            return next(null, internals.utility.formatResponse(data, tags, this._settings));
        }

        if (data.data instanceof Error) {
            const error = data.data;

            return next(null, internals.utility.formatError(Object.assign(data, { error }), tags, this._settings));
        }

        if (!data.data) {
            data.data = '(none)';
        }

        return next(null, internals.utility.formatDefault(data, tags, this._settings));
    }
}

module.exports = GoodConsole;
