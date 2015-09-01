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

var ClusterManager = require('./lib/cluster-manager.js');
var ClusterNode = require('./lib/cluster-node.js');
var program = require('commander');

function main() {
    program
        .description('List members or hsots')
        .option('-h --hosts', 'List hosts')
        .option('-m --members', 'List members')
        .option('--tchannel-v1')
        .usage('[options] <hostport>');
    program.parse(process.argv);

    var coord = program.args[0];

    if (!coord) {
        console.error('Error: hostport is required');
        process.exit(1);
    }

    var tchannelVersion = program.tchannelV1 ? 'v1' : 'v2';
    var clusterManager = new ClusterManager(tchannelVersion);
    var coordNode = new ClusterNode(coord);
    clusterManager.fetchStats(coordNode, function onStats(err) {
        if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
        }

        if (clusterManager.getPartitionCount() > 1) {
            console.error('Error: cluster is partitioned');
            process.exit(1);
        }

        var cluster = clusterManager.getClusterAt(0);

        if (program.members) {
            printSorted(cluster.getMemberAddrs());
            process.exit();
        }

        if (program.hosts) {
            printSorted(cluster.getHostAddrs());
            process.exit();
        }
    });

    function printSorted(things) {
        things.sort().forEach(function each(thing) {
            console.log(thing);
        });
    }
}

if (require.main === module) {
    main();
}

