#!/usr/bin/env node
var async = require('async');
var program = require('commander');
var TChannel = require('tchannel');

function safeParse(thing) {
    try {
        return JSON.parse(thing);
    } catch (e) {
        return null;
    }
}

function main() {
    program
        .usage('[options] <hostPort>')
        .parse(process.argv);

    var address = program.args[0];

    if (!address) {
        console.error('hostPort is required');
        process.exit(1);
    }

    var client = new TChannel({
        host: '127.0.0.1',
        port: 31999
    });

    console.log('sending /admin/stats request to ' + address);

    function printAndExit(msg) {
        console.log(msg);
        process.exit(1);
    }

    var originChecksum;
    var originNode = address;

    client.send({ host: address }, '/admin/stats', null, null, function(err, res1, res2) {
        if (err) {
            console.log('an error occurred: ' + err.message + '. exiting...');
            process.exit(1);
        }

        var stats = safeParse(res2);

        if (!stats) {
            printAndExit('stats could not be gathered. exiting...');
        }

        if (!stats.membership) {
            printAndExit('membership could not be gathered. exiting...');
        }

        if (!Array.isArray(stats.membership.members)) {
            printAndExit('no members found. exiting...');
        }

        originChecksum = stats.membership.checksum;

        console.log('gathered initial ' + stats.membership.members.length + ' members with checksum ' + stats.membership.checksum + ' from ' + address);

        function gatherStats(member, callback) {
            client.send({ host: member.address }, '/admin/stats', null, null, function(err, res1, res2) {
                if (err) {
                    callback(err);
                    return;
                }

                var stats = safeParse(res2);

                if (!stats) {
                    callback(new Error('stats could not be gathered'));
                    return;
                }

                if (!stats.membership) {
                    callback(new Error('membership could not be gathered'));
                    return;
                }

                if (!Array.isArray(stats.membership.members)) {
                    callback(new Error('no members found'));
                    return;
                }

                //console.log('gathered ' + stats.membership.members.length + ' members with checksum ' + stats.membership.checksum + ' from ' + member.address);

                callback(null, stats);
            });
        }

        function mapMember(member, next) {
            gatherStats(member, function(err, stats) {
                if (err) {
                    next(null, {
                        checksum: 'error'
                    });
                    return;
                }

                next(null, {
                    node: member.address,
                    checksum: stats.membership.checksum,
                    members: stats.membership.members
                });
            });
        }

        function onComplete(err, results) {
            var checksums = {};

            results.forEach(function forEachResult(result) {
                checksums[result.checksum] = checksums[result.checksum] || [];
                checksums[result.checksum].push(result.node);
            });

            var keys = Object.keys(checksums);
            var numKeys = keys.length;

            if (numKeys === 1) {
                console.log('1 cluster has formed for all ' + checksums[keys[0]].length + ' members');
            } else {
                console.log(numKeys + ' clusters have formed for all members');

                var inThe;
                for (var i = 0; i < numKeys; ++i) {
                    if (i === 0) {
                        inThe = 'first';
                    } else if (i === 1) {
                        inThe = 'second';
                    } else if (i === 2) {
                        inThe = 'third';
                    } else if (i === 3) {
                        inThe = 'fourth';
                    } else {
                        inThe = 'next';
                    }

                    console.log(checksums[keys[i]] + ' members in the ' + inThe);
                }
            }

            client.quit();
        }

        async.mapLimit(stats.membership.members, 10, mapMember, onComplete);
    });
}

if (require.main === module) {
    main();
}
