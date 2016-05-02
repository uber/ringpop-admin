#!/usr/bin/env node

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

var ClusterManager = require('./lib/cluster.js');
var assertNoError = require('./lib/util.js').assertNoError;
var program = require('commander');

function safeParseInt(number, defaultValue) {
    number = parseInt(number, 10);
    if (isNaN(number)) {
        return defaultValue;
    } else {
        return number;
    }
}

function main() {
    program
        .description('Start a partition heal coordinated by the target node')
        .option('--tchannel-v1')
        .option('--quiet')
        .option('--tries <tries>', 'Number of times to try the heal', safeParseInt, 10)
        .usage('[options] <discoveryUri>');
    program.parse(process.argv);

    var discoveryUri = program.args[0];

    if (!discoveryUri) {
        console.error('Error: discoveryUri is required');
        process.exit(1);
    }

    var clusterManager = new ClusterManager({
        useTChannelV1: program.tchannelV1,
        discoveryUri: discoveryUri
    });

    var log = console.log;
    if (program.quiet) {
        // noop while in quiet mode
        log = function () {};
    }

    function executeHeal(tries) {
        if (tries <= 0) {
            log('unable to heal partitions after multiple retries');
            process.exit(2);
        }

        clusterManager.heal(function onHeal(err, resp) {
            if (err) {
                assertNoError(err);
                // return even though assertNoError will exit on error
                return;
            }

            if (!resp) {
                console.error('did not receive a response during heal.');
                process.exit(3);
            }

            var targets = resp.targets || [];
            if (targets.length === 0) {
                log('No (reachable) partitions left');
                // graceful exit
                return process.exit(0);
            }

            log('Executed heal to', targets.length, 'targets');
            targets.forEach(function (target) {
                log(' - ' + target);
            });

            setTimeout(executeHeal, 1000, tries - 1);
            return;
        });
    }

    executeHeal(program.tries);

}

if (require.main === module) {
    main();
}
