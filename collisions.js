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

    hashFunction = detectChecksumMethod(membership.members, membership.checksum).hashFunction;

    membership.members.forEach(function eachMember(member) {
        var address = member.address;
        checkMemberCollision(address);

        for (var i = 0; i < replicaPoints; i++) {
            checkReplicaCollision(address, i);
        }
    });

    return {
        memberCollisionTable: memberCollisionTable,
        replicaCollisionTable: replicaCollisionTable
    };
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

        var tables = detectCollisions(stats.membership, command.replicaPoints);

        var exitCode = 0;
        if (tables.memberCollisionTable.length > 0) {
            exitCode = 1;
            console.log('membership collisions:', tables.memberCollisionTable.length);
            console.log(tables.memberCollisionTable.toString());
        } else {
            console.log('no membership collisions!');
        }
        console.log('\n');

        if (tables.replicaCollisionTable.length > 0) {
            exitCode = 1;
            console.log('replica collisions: ', tables.replicaCollisionTable.length);
            console.log(tables.replicaCollisionTable.toString());
        } else {
            console.log('no replica collisions!');
        }
        console.log('\n');

        process.exit(exitCode);
    });
}

if (require.main === module) {
    main();
}
