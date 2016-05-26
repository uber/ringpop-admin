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

var AdminClient = require('./lib/admin-client');
var createTable = require('./lib/table.js').create;
var detectChecksumMethod = require('./lib/hash-method.js');
var discover = require('./lib/discover').discover;
var parseCollisionCommand = require('./parser.js').parseCollisionCommand;

function main() {
    var command = parseCollisionCommand();

    discover(command.discoveryUri, function onDiscover(err, seeds) {
        if (err) {
            console.error('Failed to discover hosts: ', err);
            process.exit(1);
            return;
        }

        printCollisions(command, seeds[0]);
    });
}

function detectCollisions(membership, replicaPoints) {
    var hashFunction = null;
    var replicaHashes = {};

    var replicaCollisionTable = createTable(['hash', 'address', '# replica', 'collision', '# replica']);

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

    hashFunction = detectChecksumMethod(membership.members, membership.checksum).hashFunction;

    membership.members.forEach(function eachMember(member) {
        var address = member.address;

        for (var i = 0; i < replicaPoints; i++) {
            checkReplicaCollision(address, i);
        }
    });

    return replicaCollisionTable;
}

function printCollisions(command, host) {
    var adminClient = new AdminClient({
        useTChannelV1: command.useTChannelV1
    });

    adminClient.stats(host, function onStats(err, stats) {
        if (err) {
            console.error('Failed to fetch stats: ', err);
            process.exit(1);
        }

        var replicaCollisionTable = detectCollisions(stats.membership, command.replicaPoints);

        if (replicaCollisionTable.length > 0) {
            console.log('replica collisions: ', replicaCollisionTable.length);
            console.log(replicaCollisionTable.toString());
            process.exit(1);
        } else {
            console.log('no replica collisions!');
            process.exit(0);
        }
    });
}

if (require.main === module) {
    main();
}
