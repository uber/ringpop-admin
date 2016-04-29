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

var fs = require('fs');

var _ = require('underscore');
var async = require('async');
var AdminClient = require('./admin-client.js');
var Partition = require('./partition.js');
var Stats = require('./stats.js');
var format = require('util').format;
var startsWith = require('./util.js').startsWith;

var discover = require('./discover').discover;

function Cluster(opts) {
    opts = opts || {
        dumpTo: 'ringpop-admin-stats.dump'
    };

    this.useTChannelV1 = opts.useTChannelV1;
    this.discoveryUri = opts.discoveryUri;
    this.adminClient = new AdminClient({
        useTChannelV1: this.useTChannelV1
    });
    this.fetchLimit = opts.fetchLimit || 50;

    this.partitions = {};
    this.lastDownloadTime = null;
    this.lastFetchTime = null;
    this.dumpTo = opts.dumpTo;
    this.connectionErrorCount = 0;
}

Cluster.prototype.getPartitionAt = function getPartitionAt(index) {
    return this.getPartitions()[index];
};

Cluster.prototype.getPartitions = function getPartitions() {
    var self = this;

    return Object.keys(this.partitions).map(function mapCluster(membershipChecksum) {
        return self.partitions[membershipChecksum];
    });
};

Cluster.prototype.getClusterAt = function getClusterAt() {
    var partitions = this.getPartitions();

    partitions.sort(function sortBy(a, b) {
        if (a.membershipChecksum < b.membershipChecksum) {
            return -1;
        } else if (a.membershipChecksum > b.membershipChecksum) {
            return 1;
        } else {
            return 0;
        }
    });

    return partitions[0];
};

Cluster.prototype.getClusterChecksums = function getClusterChecksums() {
    return Object.keys(this.partitions);
};

Cluster.prototype.getPartitionCount = function getPartitionCount() {
    return Object.keys(this.partitions).length;
};

Cluster.prototype.getSeedList = function getSeedList(callback) {
    // use the discover library to fetch the seedlist
    discover(this.discoveryUri, callback);
};

Cluster.prototype.printConnectionErrorMsg = function printConnectionErrorMsg() {
    var count = this.connectionErrorCount;
    if (count > 0) {
        console.error('Failed to connect to %d nodes.', count);
    }
};

Cluster.prototype.fetchStats = function fetchStats(callback) {
    var self = this;

    // Reset with every fetch
    this.partitions = {};
    this.lastFetchTime = new Date().toISOString();
    var downloadTime = Date.now();
    this.connectionErrorCount = 0;

    var foundMembers = {};
    var allStats = [];
    var fetchQueue = async.queue(mapMember, 5);

    fetchQueue.drain = function () {
        onComplete(null, allStats);
    };

    this.getSeedList(function (err, seeds) {
        if (err) {
            callback(err);
            return;
        }
        queueMembers(seeds);
    });

    return;

    function mapMember(memberAddr, next) {
        self.adminClient.stats(memberAddr, function(err, stats) {
            var statsObj = new Stats();
            statsObj.address = memberAddr;

            if (err) {
                next(err, statsObj);
                return;
            }

            if (!stats) {
                callback(new Error('stats could not be gathered'));
                return;
            }

            if (!stats.membership) {
                callback(new Error('stats did not contain membership'));
                return;
            }

            if (!stats.membership.members) {
                callback(new Error('membership did not contain members'));
                return;
            }

            statsObj.membershipChecksum = stats.membership.checksum;
            statsObj.members = stats.membership.members;
            statsObj.node = memberAddr;

            // queue this members for query
            queueMembers(
                stats.membership.members.map(
                    function getAddressFromMember(member) {
                        return member.address;
                    }
                )
            );

            next(null, statsObj);
        });
    }

    function onComplete(err, allStats) {
        if (allStats.length === 0) {
            var addr = self.discoveryUri;
            var msg = format('Failed to connect to ringpop listening on %s.', addr);

            // Check if user tries to connect to localhost or 127.0.0.1.
            if (typeof addr === 'string' &&
                (startsWith(addr, 'localhost') || startsWith(addr, '127.0.0.1'))) {
                msg += ' Ringpop ordinarily does not listen on the loopback interface. Try a different IP address.';
            }

            callback(new Error(msg));
            return;
        }
        self.lastDownloadTime = Date.now() - downloadTime;
        self.allStats = allStats;
        self.allStats.forEach(function eachStats(stats) {
            self.parseStats(stats);
        });

        callback();
    }

    function queueMembers(membersAddr) {
        membersAddr.forEach(function (memberAddr) {
            if (memberAddr in foundMembers) {
                return;
            }

            foundMembers[memberAddr] = true;
            fetchQueue.push(memberAddr, function onStatsFetched(err, stats) {
                if (err) {
                    self.connectionErrorCount++;
                    return;
                }

                allStats.push(stats);
            });
        });
    }
};

Cluster.prototype.lookup = function lookup(key, callback) {
    var self = this;

    this.getSeedList(function (err, seeds) {
        if (err) {
            callback(err);
            return;
        }
        self.adminClient.lookup(seeds[0], key, callback);
    });
};

Cluster.prototype.reap = function reap(callback) {
    var self = this;

    this.getSeedList(function (err, seeds) {
        if (err) {
            callback(err);
            return;
        }
        self.adminClient.reap(seeds[0], callback);
    });
};

Cluster.prototype.heal = function heal(callback) {
    var self = this;

    this.getSeedList(function (err, seeds) {
        if (err) {
            callback(err);
            return;
        }
        self.adminClient.heal(seeds[0], callback);
    });
};

Cluster.prototype.parseStats = function parseStats(stats) {
    if (!stats.membershipChecksum) {
        return;
    }

    var cluster = this.partitions[stats.membershipChecksum];

    if (!cluster) {
        cluster = new Partition();
        cluster.membershipChecksum = stats.membershipChecksum;
        cluster.membership = stats.members;

        var membersByStatus = _.groupBy(stats.members, 'status');
        cluster.aliveCount = _.size(membersByStatus.alive);
        cluster.suspectCount = _.size(membersByStatus.suspect);
        cluster.faultyCount = _.size(membersByStatus.faulty);

        this.partitions[cluster.membershipChecksum] = cluster;
    }

    cluster.nodeCount++;
    cluster.addNode(stats.node);
};

Cluster.prototype.reuse = function reuse(opts, callback) {
    var self = this;
    var results = [];

    this.adminClient.stats(opts.coordinator, function onStats(err, stats) {
        if (err) {
            callback(err);
            return;
        }

        var members = stats.membership.members;
        async.eachLimit(members, opts.limit, iterator, onDone);
    });

    function iterator(member, callback) {
        self.adminClient.reuse(member.address, {
            memberAddr: opts.member
        }, function onReuse(err) {
            results.push({
                member: member.address,
                err: err
            });
            callback();
        });
    }

    function onDone() {
        callback(null, results);
    }
};

Cluster.prototype.dumpStats = function dumpStats() {
    fs.appendFile(
        this.dumpTo,
        JSON.stringify({
            timestamp: Date.now(),
            clusters: this.partitions
        }) + '\n',
        function() {} // NOOP, no way to display it right now.
    );
};

module.exports = Cluster;
