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

var commands = require('./commands.js');
var program = require('commander');

function assertPositionArg(program, pos, arg) {
    if (program.args[pos]) return;
    console.error('Error: ' + arg + ' is required');
    process.exit(1);
}

function parseReuseCommand() {
    program
        .description('Undoes damping of member')
        .option('-m, --member <memberAddr>, Address of member to reuse')
        .option('-l, --limit <limit>, Parallelism limit')
        .option('--tchannel-v1')
        .usage('[options] <discoveryUri>');
    program.parse(process.argv);
    assertPositionArg(program, 0, 'discoveryUri');

    return new commands.ReuseCommand(
        program.tchannelV1,
        program.args[0],
        program.member,
        program.limit || 25
    );
}

function parseStatusCommand() {
    program
        .description('Status of members in ring')
        .option('-q, --quiet', 'Do not print headers')
        .option('--tchannel-v1')
        .usage('[options] <discoveryUri>');
    program.parse(process.argv);
    assertPositionArg(program, 0, 'discoveryUri');

    return new commands.StatusCommand(
        program.tchannelV1,
        program.args[0],
        program.quiet);
}

function parsePartitionCommand() {
    program
        .description('Show partition information of a ring')
        .option('--tchannel-v1')
        .option('-w, --wait <seconds>', 'Wait between updates')
        .option('-q, --quiet', 'Don\'t print headers')
        .usage('[options] <discoveryUri>');
    program.parse(process.argv);
    assertPositionArg(program, 0, 'discoveryUri');

    return new commands.PartitionCommand(
        program.tchannelV1,
        program.args[0],
        program.wait,
        program.quiet
    );
}

function parseCollisionCommand() {
    program.description('Show collision information of a ring')
        .option('--tchannel-v1')
        .option('--replica-points [replica-points]', 'The number of replica points.', 100)
        .usage('[options] <discoveryUri>');
    program.parse(process.argv);
    assertPositionArg(program, 0, 'discoveryUri');

    return new commands.CollisionCommand(
        program.tchannelV1,
        program.args[0],
        program.replicaPoints
    );
}

module.exports = {
    parseCollisionCommand: parseCollisionCommand,
    parsePartitionCommand: parsePartitionCommand,
    parseReuseCommand: parseReuseCommand,
    parseStatusCommand: parseStatusCommand
};
