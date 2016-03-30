'use strict';

const Stream = require('stream');

class Writer extends Stream.Writable {
    constructor() {

        super({ objectMode: true });
        this.data = [];
    }
    _write(chunk, end, callback) {

        this.data.push(chunk);
        callback(null);
    }
}

class Reader extends Stream.Transform {
    constructor() {

        super({ objectMode: true });
    }
    _transform(value, encoding, callback) {

        callback(null, value);
    }
}

module.exports = { Writer, Reader };
