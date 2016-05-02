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

var createTable = require('./lib/table.js').create;
var ClusterManager = require('./lib/cluster.js');
var parsePartitionCommand = require('./parser.js').parsePartitionCommand;

function main() {
    var command = parsePartitionCommand();
    var clusterManager = new ClusterManager({
        useTChannelV1: command.useTChannelV1,
        discoveryUri: command.discoveryUri
    });

    if (command.wait) {
        printStats(command, clusterManager);
        setInterval(function onTimeout() {
            printStats(command, clusterManager, false);
        }, command.wait * 1000);
    } else {
        printStats(command, clusterManager, true);
    }
}

function getTime() {
    var date = new Date();
    var hour = date.getHours(); hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes(); min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds(); sec = (sec < 10 ? "0" : "") + sec;
    var msec = date.getMilliseconds();
    msec = (msec < 10? "00" : msec < 100? "0" : "") + msec;
    return hour + ":" + min + ":" + sec + "." + msec;
}

function printStats(command, clusterManager, exit) {
    clusterManager.fetchStats(function onStats(err) {
        if (err) {
            console.error('Error: ' + err.message);
            if (exit) {
                process.exit(1);
            }
        }

        var partitions = clusterManager.getPartitions();

        var headers = [];
        if (!command.quiet) {
            headers = [
                getTime(),
                'Checksum',
                '# Nodes',
                '# Alive',
                '# Suspect',
                '# Faulty',
                'Sample Host'
            ];
        }

        var table = createTable(headers);
        partitions.forEach(function each(partition) {
            table.push([
                "",
                partition.membershipChecksum,
                partition.nodeCount,
                partition.aliveCount,
                partition.suspectCount,
                partition.faultyCount,
                String(partition.nodes[0])
            ]);
        });
        console.log(table.toString());

        clusterManager.printConnectionErrorMsg();
        if (exit) {
            process.exit();
        }
    });
}

if (require.main === module) {
    main();
}
