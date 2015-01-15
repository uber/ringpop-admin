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

var async = require('async');
var Cluster = require('./cluster.js');
var ClusterNode = require('./cluster-node.js');
var Stats = require('./stats.js');

function ClusterManager(tchannelVersion, opts) {
    opts = opts || { dumpTo: 'ringpop-admin-stats.dump' };
    this.tchannelVersion = tchannelVersion;

    this.clusters = {};
    this.lastDownloadTime = null;
    this.lastFetchTime = null;
    this.dumpTo = opts.dumpTo;
}

ClusterManager.prototype.getPartitionAt = function getPartitionAt(index) {
    return this.getPartitions()[index];
};

ClusterManager.prototype.getPartitions = function getPartitions() {
    var self = this;

    return Object.keys(this.clusters).map(function mapCluster(membershipChecksum) {
        return self.clusters[membershipChecksum];
    });
};

ClusterManager.prototype.getClusterAt = function getClusterAt(index) {
    var clusters = this.getPartitions();

    clusters.sort(function sortBy(a, b) {
        if (a.membershipChecksum < b.membershipChecksum) {
            return -1;
        } else if (a.membershipChecksum > b.membershipChecksum) {
            return 1;
        } else {
            return 0;
        }
    });

    return clusters[0];
};

ClusterManager.prototype.getClusterChecksums = function getClusterChecksums() {
    return Object.keys(this.clusters);
};

ClusterManager.prototype.getPartitionCount = function getPartitionCount() {
    return Object.keys(this.clusters).length;
};

ClusterManager.prototype.fetchStats = function fetchStats(coordinatorNode, callback) {
    var self = this;

    // Reset with every fetch
    this.clusters = {};

    this.lastFetchTime = new Date().toISOString();
    var downloadTime = Date.now();

    coordinatorNode.sendAdminStats(this.tchannelVersion, function onSend(err, stats) {
        if (err) {
            callback(err);
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

        async.mapLimit(stats.membership.members, 10, mapMember, onComplete);

        function mapMember(member, next) {
            var node = new ClusterNode(member.address);
            node.sendAdminStats(self.tchannelVersion, function(err, stats) {
                var statsObj = new Stats();
                statsObj.address = member.address;

                if (err) {
                    next(null, statsObj);
                    return;
                }

                statsObj.membershipChecksum = stats.membership.checksum;
                statsObj.members = stats.membership.members;

                next(null, statsObj);
            });
        }

        function onComplete(err, statsCollection) {
            self.lastDownloadTime = Date.now() - downloadTime;

            statsCollection.forEach(function eachStats(stats) {
                self.parseStats(stats);
            });

            callback();
        }
    });
};

ClusterManager.prototype.parseStats = function parseStats(stats) {
    if (!stats.membershipChecksum) {
        return;
    }

    var cluster = this.clusters[stats.membershipChecksum];

    if (!cluster) {
        cluster = new Cluster();
        cluster.membershipChecksum = stats.membershipChecksum;
        cluster.membership = stats.members;

        this.clusters[cluster.membershipChecksum] = cluster;
    }

    cluster.nodeCount++;
    cluster.addNode(stats.node);
};

ClusterManager.prototype.dumpStats = function dumpStats(stats) {
    fs.appendFile(
        this.dumpTo,
        JSON.stringify({
            timestamp: Date.now(),
            clusters: this.clusters
        }) + '\n',
        function(err) {} // NOOP, no way to display it right now.
    );
};

module.exports = ClusterManager;
