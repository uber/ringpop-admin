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
var parseCollisionCommand = require('./parser.js').parseCollisionCommand;
var detectChecksumMethod = require('./lib/hash-method.js');

function main() {
    var command = parseCollisionCommand();
    var clusterManager = new ClusterManager({
        useTChannelV1: command.useTChannelV1,
        discoveryUri: command.discoveryUri
    });

    printCollisions(command, clusterManager);
}

function printCollisions(command, clusterManager) {
    clusterManager.fetchStats(function onStats(err) {
        if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
        }

        var partitions = clusterManager.getPartitions();

        var hashFunction = null;
        var memberHashes = {};
        var replicaHashes = {};

        var memberCollisionTable = createTable(['hash', 'address', 'collision']);
        var replicaCollisionTable = createTable(['hash', 'address', '# replica', 'collision', '# replica']);

        function checkMemberCollision(address) {
            var hash = '' + hashFunction(address);
            if (!memberHashes[hash]) {
                memberHashes[hash] = address;
            } else if (memberHashes[hash] !== address) {
                //collision!
                memberCollisionTable.push([hash, address, memberHashes[hash]]);
            }
        }

        function checkReplicaCollision(address, replica) {
            var replicaName = address + replica;
            var hash = '' + hashFunction(replicaName);
            if (!replicaHashes[hash]) {
                replicaHashes[hash] = {address: address, replica: replica};
            } else if (replicaHashes[hash].address !== address) {
                //collision!
                replicaCollisionTable.push([hash, address, replica, replicaHashes[hash].address, replicaHashes[hash].replica]);
            }
        }

        partitions.forEach(function eachPartition(partition) {
            if (!hashFunction) {
                hashFunction = detectChecksumMethod(partition.membership, partition.membershipChecksum).hashFunction;
            }

            partition.membership.forEach(function eachMember(member) {
                var address = member.address;
                checkMemberCollision(address);

                for (var i = 0; i < command.replicaPoints; i++) {
                    checkReplicaCollision(address, i);
                }
            });
        });
        var exitCode = 0;
        if (memberCollisionTable.length > 0) {
            exitCode = 1;
            console.log('membership collisions:', memberCollisionTable.length);
            console.log(memberCollisionTable.toString());
        }   else {
            console.log('no membership collisions!');
        }
        console.log('\n');

        if (replicaCollisionTable.length > 0) {
            exitCode = 1;
            console.log('replica collisions: ', replicaCollisionTable.length);
            console.log(replicaCollisionTable.toString());
        }   else {
            console.log('no replica collisions!');
        }
        console.log('\n');

        clusterManager.printConnectionErrorMsg();
        process.exit(exitCode);
    });
}

if (require.main === module) {
    main();
}
