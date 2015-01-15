#!/usr/bin/env node
var program = require('commander');
var TChannel = require('tchannel');

function main() {
    program.parse(process.argv);

    var host = program.args[0];

    if (!host) {
        console.error('host is required');
        process.exit(1);
    }

    var client = new TChannel({
        host: '127.0.0.1',
        port: 31999
    });

    client.send({ host: host }, '/admin/join', null, null, function(err, res1, res2) {
        if (err) {
            console.log('Error: ' + err.message);
        } else {
            console.log(res2.toString());
        }

        client.quit();
    });
}

if (require.main === module) {
    main();
}
