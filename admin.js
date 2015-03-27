#!/usr/bin/env node
var program = require('commander');

function main() {
    program
        .description('Command-line tools for ringpop')
        .version(require('./package.json').version)
        .command('cluster-state', 'Query state of cluster. See cluster-state --help for more details.')
        .command('join <node>', 'causes node to join the cluster')
        .command('leave <node>', 'causes node to leave the cluster')
        .command('member-state', 'Query state of member. See member-state --help for more details.')
        .parse(process.argv);
}

if (require.main === module) {
    main();
}
