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

var program = require('commander');

function main() {
    program
        .description('Command-line tools for Ringpop')
        .version(require('./package.json').version)
        .command('checksums', 'Prints membership checksums')
        .command('dist', 'Distribution of keyspace')
        .command('dump', 'Dump membership information to disk')
        .command('count', 'Counts members')
        .command('leave', 'Makes node leave the cluster')
        .command('list', 'List member information')
        .command('lookup', 'Lookup a key in the ring')
        .command('join', 'Makes node (re)join the cluster')
        .command('status', 'Status of members in ring')
        .command('partitions', 'Show partition information of a ring')
        .command('top', 'General membership information')
        .command('reap', 'Remove the faulty nodes from this nodes membership')
        .command('heal', 'Start a partition heal coordinated by the target node')
        .on('--help', function onHelp() {
            console.log('  Discovery:');
            console.log('');
            console.log('    Most of the commands can discover the ring via');
            console.log('    a discoverUri like this: \'ringpop://127.0.0.1:3000\'.');
            console.log('    If no protocol is specified \'ringpop://\' will be');
            console.log('    used.');
            console.log('');
            console.log('    Supported protocols are:');
            console.log('');
            console.log('     - ringpop://');
            console.log('       Discover the ring by connecting to a host of');
            console.log('       the ring.');
            console.log('');
            console.log('       Example: ringpop://127.0.0.1:3000');
            console.log('');
            console.log('     - file://');
            console.log('       Discover the ring by reading a json file');
            console.log('       containing an array of host:port combinations');
            console.log('');
            console.log('       Example: file:///absolute/path/to/file');
            console.log('       Example: file://./relative/path');
            console.log('       File content: ["127.0.0.1:3000"]');
            console.log('');
            console.log('     - hyperbahn://');
            console.log('       Discover the ring by querying hyperbahn for');
            console.log('       the members of a service. When no hyperbahn');
            console.log('       ip and port are given 127.0.0.1:21300 will be');
            console.log('       used.');
            console.log('');
            console.log('       Example: hyperbahn:///ringpop');
            console.log('       Example: hyperbahn://hyperbahn-ip:port/ringpop');
            console.log('');
        })
        .parse(process.argv);
}

if (require.main === module) {
    main();
}
