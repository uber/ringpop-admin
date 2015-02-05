#!/usr/bin/env node
var program = require('commander');

function main() {
    program
        .version(require('./package.json').version)
        .command('join <node>', 'causes node to join the cluster')
        .command('leave <node>', 'causes node to leave the cluster')
        .command('status <node>', 'query status of a node')
        .parse(process.argv);
}

if (require.main === module) {
    main();
}
