# good-console

Console broadcasting for Good process monitor

[![Build Status](https://travis-ci.org/hapijs/good-console.svg?branch=master)](http://travis-ci.org/hapijs/good-console)![Current Version](https://img.shields.io/npm/v/good-console.svg)

Lead Maintainer: [Adam Bretz](https://github.com/arb)

## Usage

`good-console` is a [good-reporter](https://github.com/hapijs/good-reporter) implementation to write [hapi](http://hapijs.com/) server events to the console.

All log messages are preceded with a timestamp, which default format is `YYMMDD/HHmmss.SSS`. You can also set a custom format according to [Moment.js' date formatting rules](http://momentjs.com/docs/#/displaying/format/).

Example configuration for hapi:
```js
var options = {
    reporters: [{
        reporter: require('good-console'),
        args:[
            { log: '*', request: '*'},
            // ISO 8601 date format
            { format: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]' }
        ]
    }]
};
```
