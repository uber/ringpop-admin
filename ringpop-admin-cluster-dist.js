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

var CliColor = require('cli-color');
var ClusterNode = require('./lib/cluster-node.js');
var createTable = require('./lib/table.js');
var HashRing = require('ringpop/lib/ring.js');
var program = require('commander');
var safeParse = require('./lib/util.js').safeParse;

function main() {
    program
        .description('Shows distribution of keyspace per nodes')
        .usage('[options] <hostPort>')
        .parse(process.argv);

    var hostPort = program.args[0];

    if (!hostPort) {
        console.error('hostPort is required');
        process.exit(1);
    }

    var table = createTable([
        'address',
        'percentage'
    ]);

    var node = new ClusterNode(hostPort);
    node.sendAdminStats(hostPort, function onSend(stats) {
        var members = stats.membership.members;

        members = members.sort(function sort(a, b) {
            if (a.address < b.address) {
                return -1;
            } else if (a.address > b.address) {
                return 1;
            } else {
                return 0;
            }
        });

        var hashRing = new HashRing();

        for (var i = 0; i < members.length; i++) {
            var member = members[i];

            hashRing.addServer(member.address);
        }

        var hashCode = 0;
        var ownership = {};

        while (hashCode < 4294967295) {
            var iter = hashRing.rbtree.upperBound(hashCode);

            if (iter.val() === null) {
                break;
            }

            if (!ownership[iter.str()]) {
                ownership[iter.str()] = 0;
            }

            ownership[iter.str()] += iter.val() - hashCode;

            hashCode = iter.val() + 1;
        }

        var keyspaceSize = hashCode - 1;
        var maxOwnage = 0;
        var maxOwners = [];
        var minOwnage = 101;
        var minOwners = [];

        var rows = [];

        members.forEach(function eachMember(member) {
            var address = member.address;

            var percentageOwned = 0;

            if (ownership[address]) {
                percentageOwned = (ownership[address] * 100) / keyspaceSize;
            }

            if (percentageOwned > maxOwnage) {
                maxOwners = [];
                maxOwners.push(member.address);
                maxOwnage = percentageOwned;
            }

            if (percentageOwned < minOwnage) {
                minOwners = [];
                minOwners.push(member.address);
                minOwnage = percentageOwned;
            }

            rows.push({
                address: member.address,
                percentage: percentageOwned
            });
        });

        rows.forEach(function eachRow(row) {
            var addressVal = row.address;
            var percentageVal;

            if (addressVal === hostPort) {
                addressVal = CliColor.magenta(addressVal);
            }

            if (row.percentage === maxOwnage) {
                percentageVal = CliColor.green(formatPercent(row.percentage));
            } else if (row.percentage === minOwnage) {
                percentageVal = CliColor.yellow(formatPercent(row.percentage));
            } else {
                percentageVal = formatPercent(row.percentage);
            }

            table.push([
                addressVal,
                percentageVal
            ]);
        });

        console.log(table.toString());
    });
}

function formatPercent(percent) {
    return (Math.round(percent * 100) / 100) + '%';
}

if (require.main === module) {
    main();
}
