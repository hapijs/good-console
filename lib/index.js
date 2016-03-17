'use strict';

const Squeeze = require('good-squeeze').Squeeze;
const Hoek = require('hoek');
const Moment = require('moment');
const SafeStringify = require('json-stringify-safe');
const Stream = require('stream').Transform;

const internals = {
  defaults: {
    format: 'YYMMDD/HHmmss.SSS',
    utc: true,
    color: true
  }
};

class GoodConsole extends Stream {
  constructor (config) {

    super({objectMode: true});

    this.settings = {
      format: 'YYMMDD/HHmmss.SSS',
      utc: true,
      color: true
    };  
    this._filter = new Squeeze(config);
  }

  _transform (data, enc, next) {

    let eventName = data.event;
    // let tags = [];
    //
    // if (Array.isArray(data.tags)) {
    //   tags = adta.tags.concat([]);
    // } else if (data.tags != null) {
    //   tags = [data.tags];
    // }
    //
    // tags.unshift(eventName);

    if (eventName === 'error') {
      return next(null, this._formatError(data));
    }

    if (eventName === 'ops') {
      return next(null, this._formatOps(data));
    }

    if (eventName === 'response') {
      return next(null, this._formatResponse(data));
    }

    if (!data.data) {
      data.data = '(none)';
    }

    return next(null, this.formatDefault(data));
  }

  _formatOutput (event) {

    let timestamp = Moment(parseInt(event.timestamp, 10)).format(this.settings.format);

    if (!this.settings.utc) {
      timestamp.local();
    }

    const output = `${timestamp}, ${event.data}`;

    return output; 
  }

  _formatMethod (method) {

    const methodColors = {
      get: 32,
      delete: 31,
      put: 36,
      post: 33
    };

    let color;
    let formattedMethod = method.toLowerCase();
    if (this.settings.color) {
      color = methodColors[method.toLowerCase()] || 34;
      formattedMethod = `\x1b[1;${color}m${formattedMethod}\x1b[0m`;
    }

    return formattedMethod;
  }

  _formatStatusCode (statusCode) {
    
    let color;
    if (statusCode && this.settings.color) {
      color = 32;
      if (statusCode >= 500) {
        color = 31; 
      } else if (statusCode >= 400) {
        color = 33;
      } else if (statusCode >= 300) {
        color = 36;
      }

      return `\x1b[${color}m${statusCode}\x1b[0m`;
    }

    return statusCode;
  }

  _formatResponse (event) {

    const query = event.query ? JSON.stringify(event.query) : '';
    const method = this._formatMethod(event.method);
    const statusCode = this._formatStatusCode(event.statusCode) || '';

    // event, timestamp, id, instance, labels, method, path, query, responseTime, 
    // statusCode, pid, httpVersion, source, remoteAddress, userAgent, referer, log
    // method, pid, error
    const output = `${event.instance}: ${method} ${event.path} ${query} ${statusCode} (${event.responseTime}ms)`;

    const response = {
      timestamp: event.timestamp,
      data: output
    };

    return this._formatOutput(response);
  }

  _formatOps (event) {

    const memory = Math.round(event.proc.mem.rss / (1024 * 1024));
    const output = `memory: ${memory}Mb, uptime (seconds): ${event.proc.uptime}, load: ${event.os.load}`

    const ops = {
      timestamp: event.timestamp,
      data: output
    };

    return this._formatOutput(ops);
  }

  _formatError (event) {

    const output = `message: ${event.error.message} stack: ${data.error.stack}`;

    const error = {
      timestamp: event.timestamp,
      data: output
    };

    return this._formatOutput(error);
  }

  _formatDefault (event) {

    const data = typeof event.data === 'object' ? SafeStringify(event.data) : event.data;
    const output = `data: ${data}`;

    const defaults = {
      timestamp: event.timestamp || Moment().unix(),
      data: output 
    };

    return this._formatOutput(defaults);
  }

}

module.exports = GoodConsole;
