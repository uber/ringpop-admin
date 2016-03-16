// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';

var safeParse = require('./util.js').safeParse;
var TChannelV1;
var TChannelV2 = require('tchannel');

var tchannelV1;
var tchannelV2;

function AdminClient(opts) {
    this.useTChannelV1 = opts.useTChannelV1;
}

AdminClient.prototype.destroy = function destroy() {
    if (tchannelV1) {
        tchannelV1.quit();
    }

    if (tchannelV2) {
        tchannelV2.quit();
    }
};

AdminClient.prototype.join = function join(host, callback) {
    this.request(host, '/admin/member/join', null, null, callback);
};

AdminClient.prototype.leave = function leave(host, callback) {
    this.request(host, '/admin/member/leave', null, null, callback);
};

AdminClient.prototype.reap = function reap(host, callback) {
    this.request(host, '/admin/reap', null, null, callback);
};

AdminClient.prototype.lookup = function lookup(host, key, callback) {
    this.request(host, '/admin/lookup', null, JSON.stringify({
        key: key
    }), callback);
};

AdminClient.prototype.reuse = function stats(host, body, callback) {
    this.request(host, '/admin/member/reuse', null, JSON.stringify(body),
        callback);
};

AdminClient.prototype.stats = function stats(host, callback) {
    this.request(host, '/admin/stats', null, null, callback);
};

/* jshint maxparams: 5 */
AdminClient.prototype.request = function request(host, endpoint, head, body, callback) {
    if (this.useTChannelV1) {
        try {
            TChannelV1 = require('tchannelv1');
        } catch (e) {
            var newError = new Error(e.message);
            newError.message += '\nSuggestion: Run `npm run tchannel-v1` and try again.';
            callback(newError);
            return;
        }

        this.requestV1(host, endpoint, null, body, callback);
    } else {
        this.requestV2(host, endpoint, null, body, callback);
    }
};

/* jshint maxparams: 5 */
AdminClient.prototype.requestV1 = function requestV1(host, endpoint, head, body, callback) {
    if (!tchannelV1) {
        tchannelV1 = new TChannelV1({
            host: '127.0.0.1',
            port: 31999
        });
    }

    tchannelV1.send({
        host: host
    }, endpoint, head, body, function onSend(err, res1, res2) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, JSON.parse(res2));
    });
};

/* jshint maxparams: 5 */
AdminClient.prototype.requestV2 = function requestV2(host, endpoint, head, body, callback) {
    if (!tchannelV2) {
        var tchannel = new TChannelV2();
        tchannelV2 = tchannel.makeSubChannel({
            serviceName: 'ringpop'
        });
    }

    tchannelV2.waitForIdentified({
        host: host
    }, function onIdentified(err) {
        if (err) {
            callback(err);
            return;
        }

        tchannelV2.request({
            host: host,
            hasNoParent: true,
            retryLimit: 1,
            trace: false,
            timeout: 10000,
            headers: {
                'as': 'raw',
                'cn': 'ringpop'
            },
            serviceName: 'ringpop'
        }).send(endpoint, head, body, function onSend(err, res, arg2, arg3) {
            if (err) {
                console.error('Error: ' + err.message);
                process.exit(1);
            }

            callback(null, safeParse(arg3));
        });
    });

};

module.exports = AdminClient;
