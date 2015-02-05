#!/usr/bin/env node
var async = require('async');
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

    var checksums = {};

    client.send({ host: host }, '/admin/stats', null, null, function(err, res1, res2) {
        var stats = JSON.parse(res2);

        checksums[stats.membership.checksum] = stats.membership.members;

        function printChecksumAndMembers() {
            Object.keys(checksums).forEach(function(checksum) {
                console.log('checksum ' + checksum);

                checksums[checksum].forEach(function(member) {
                    console.log(member.address + '\t' + member.status);
                });

                console.log();
            });
        }

        async.each(stats.membership.members, function eachMember(member, next) {
            client.send({ host: member.address }, '/admin/stats', null, null, function(err, res1, res2) {
                if (err) {
                    console.log('err: ' + err.message);
                    next();
                    return;
                }

                var stats = JSON.parse(res2);

                checksums[stats.membership.checksum] = stats.membership.members;

                next();
            });
        }, function done(err, results) {
            if (err) {
                console.log('err: ' + err.message);
                return;
            }

            printChecksumAndMembers();

            client.quit();
        });
    });
}

if (require.main === module) {
    main();
}
