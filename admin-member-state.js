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
var CliTable = require('cli-table');
var program = require('commander');
var TChannel = require('tchannel');

var safeParse = require('./util.js').safeParse;

function colorStatus(status) {
    if (status === 'alive') {
        return CliColor.green(status);
    } else if (status === 'suspect') {
        return CliColor.yellow(status);
    } else {
        return CliColor.red(status);
    }
}

function newTable(head) {
    return new CliTable({
        chars: {
            'bottom': '' ,
            'bottom-mid': '' ,
            'bottom-left': '' ,
            'bottom-right': '' ,
            'left': '' ,
            'left-mid': '' ,
            'mid': '' ,
            'mid-mid': '' ,
            'middle': ' ',
            'right': '' ,
            'right-mid': '' ,
            'top': '' ,
            'top-mid': '' ,
            'top-left': '' ,
            'top-right': '' ,
        },
        head: head
    });
}

function sendAdminMemberGet(instanceAddress, memberAddress, changes, callback) {
    var client = new TChannel({
        host: '127.0.0.1',
        port: 31999
    });

    var body = JSON.stringify({
        member: memberAddress,
        changes: changes
    });

    client.send({
        host: instanceAddress
    }, '/admin/member', null, body, function onSend(err, res1, res2) {
        if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
        }

        callback(JSON.parse(res2));

        client.quit();
    });
}

function main() {
    program
        .description('Queries instance at `hostPort` for membership state. Available in ringpop 9.9.0+.')
        .usage('[options] <hostPort>')
        .option('-c, --changes <changes>', 'JSON array of updates to apply before fetching state.')
        .option('-m, --member <hostPort>', 'Address of member. If not provided, reports state of all members.')
        .option('-s, --sort <field>', 'Sort ascending by field. One of address, status, incarnationNumber.')
        .parse(process.argv);

    var hostPort = program.args[0];
    var addr = program.member;
    var changes = program.changes;

    if (!hostPort) {
        console.error('hostPort is required');
        process.exit(1);
    }

    if (changes) {
        changes = safeParse(changes);

        if (!changes) {
            console.error('changes must be valid JSON');
            process.exit(1);
        }
    }

    var table = newTable([
        'address',
        'status',
        'incarnation no.'
    ]);

    sendAdminMemberGet(hostPort, addr, changes, function onSend(states) {
        var sortedStates = states.sort(function sortBy(a, b) {
            if (program.sort === 'status') {
                return a.status.localeCompare(b.status);
            } else if (program.sort === 'incarnationNumber') {
                return a.incarnationNumber > b.incarnationNumber;
            } else {
                return a.address.localeCompare(b.address);
            }
        });

        for (var i = 0; i < sortedStates.length; i++) {
            var state = sortedStates[i];

            table.push([
                state.address,
                colorStatus(state.status),
                state.incarnationNumber
            ]);
        }

        console.log(table.toString());
    });
}

if (require.main === module) {
    main();
}
