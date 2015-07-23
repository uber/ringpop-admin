var TChannelV1;
var TChannelV2 = require('tchannel');

var tchannelV1;
var tchannelV2;

function ClusterNode(address) {
    this.address = address;
}

ClusterNode.prototype.destroy = function destroy() {
    if (tchannelV1) {
        tchannelV1.quit();
    }

    if (tchannelV2) {
        tchannelV2.quit();
    }
};

ClusterNode.prototype.sendAdminStats = function sendAdminStats(version, callback) {
    if (version === 'v1') {
        try {
            TChannelV1 = require('tchannelv1');
        } catch (e) {
            var newError = new Error(e.message);
            newError.message += '\nSuggestion: Run `npm run tchannelv1` and try again.';
            callback(newError);
            return;
        }

        sendAdminStatsV1(this.address, callback);
    } else {
        sendAdminStatsV2(this.address, callback);
    }
};

function sendAdminStatsV1(node, callback) {
    if (!tchannelV1) {
        tchannelV1 = new TChannelV1({
            host: '127.0.0.1',
            port: 31999
        });
    }

    tchannelV1.send({
        host: node
    }, '/admin/stats', null, null, function onSend(err, res1, res2) {
        if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
        }

        callback(null, JSON.parse(res2));
    });
}

function sendAdminStatsV2(node, callback) {
    if (!tchannelV2) {
        var tchannel = new TChannelV2({
            host: '127.0.0.1',
            port: 31999
        });

        tchannelV2 = tchannel.makeSubChannel({
            serviceName: 'ringpop'
        });
    }

    tchannelV2.waitForIdentified({
        host: node
    }, function onIdentified(err) {
        if (err) {
            callback(err);
            return;
        }

        tchannelV2.request({
            host: node,
            hasNoParent: true,
            retryLimit: 1,
            trace: false,
            headers: {
                'as': 'raw',
                'cn': 'ringpop'
            },
            serviceName: 'ringpop'
        }).send('/admin/stats', null, null, function onSend(err, res, arg2, arg3) {
            if (err) {
                console.error('Error: ' + err.message);
                process.exit(1);
            }

            callback(null, JSON.parse(arg3));
        });
    });
}

module.exports = ClusterNode;
