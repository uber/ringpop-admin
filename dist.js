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
var AdminClient = require('./lib/admin-client.js');
var createTable = require('./lib/table.js').create;
var HashRing = require('ringpop/lib/ring/index.js');
var program = require('commander');
var fs = require('fs');
var farmhash = require('farmhash');

function main() {
    program
        .description('Distribution of keyspace')
        .option('--tchannel-v1')
        .option('--sevnup <vnode>', 'numer of vnodes used by sevnup', 0, parseInt)
        .option('--file <filename>', 'name of file to read for keys to calculate distribution for. It will be tried to parse as a JSON array, if it fails it will use newline seperated fileformat.')
        .option('--hash <hashfunction>', 'hash function to use for the hashring, defaults to farmhash.fingerprint32', 'fingerprint32')
        .usage('[options] <hostport>')
        .parse(process.argv);

    var hostPort = program.args[0];

    if (!hostPort) {
        console.error('Error: hostport is required');
        process.exit(1);
    }

    var hasher;
    switch(program.hash) {
        case 'fingerprint32':
            hasher = farmhash.fingerprint32;
            break;
        case 'hash32':
            hasher = farmhash.hash32v1;
            break;
        default:
            console.error('unknown hashfunction:', program.hash);
            process.exit(1);
    }

    var node = new AdminClient({
        useTChannelV1: program.tchannelV1
    });
    node.stats(hostPort, function onSend(err, stats) {
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

        var hashRing = new HashRing({
            hashFunc: hasher
        });

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

        var maxOwnageKeys;
        var maxOwnersKeys = [];
        var minOwnageKeys;
        var minOwnersKeys = [];

        var keys = [];
        if (program.sevnup) {
            // add keys for sevnup
            for (var j = 0; j<program.sevnup; j++) {
                keys.push('' + j);
            }
        }

        if (program.file) {
            var data = fs.readFileSync(program.file);

            try {
                data = JSON.parse(data);
            } catch (e) {
                data = data.toString().trim().split('\n');
            }
            data.forEach(function addKeysFromFile(key) {
                keys.push(key);
            });
        }

        var keysPerMember = {};
        keys.forEach(function (key) {
            var member = hashRing.lookup(key);
            if (!keysPerMember[member]) {
                keysPerMember[member] = 0;
            }
            keysPerMember[member]++;
        });

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

            var keysOwned = keysPerMember[member.address] || 0;
            var percentageOwnedKeys = keysOwned / keys.length * 100;

            if (maxOwnageKeys === undefined || percentageOwnedKeys > maxOwnageKeys) {
                maxOwnageKeys = percentageOwnedKeys;
                maxOwnersKeys = [];
                maxOwnersKeys.push(member.address);
            }

            if (minOwnageKeys === undefined || percentageOwnedKeys < minOwnageKeys) {
                minOwnageKeys = percentageOwnedKeys;
                minOwnersKeys = [];
                minOwnersKeys.push(member.address);
            }

            rows.push({
                address: member.address,
                percentage: percentageOwned,
                keysOwned: keysOwned,
                keyPercentage: percentageOwnedKeys
            });
        });

        var headers = [
            'address',
            'percentage'
        ];
        if (keys.length) {
            headers.push('keys');
            headers.push('keys percentage');
        }
        var table = createTable(headers);

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

            var values = [
                addressVal,
                percentageVal
            ];

            if (keys.length) {
                var color;
                if (row.keyPercentage === maxOwnageKeys) {
                    color = CliColor.green;
                } else if (row.keyPercentage === minOwnageKeys) {
                    color = CliColor.yellow;
                } else {
                    color = function noColor(s) {
                        return s;
                    };
                }
                values.push(color(row.keysOwned));
                values.push(color(formatPercent(row.keyPercentage)));
            }

            table.push(values);
        });

        console.log(table.toString());
        process.exit();
    });
}

function formatPercent(percent) {
    return (Math.round(percent * 100) / 100) + '%';
}

if (require.main === module) {
    main();
}
