var TChannel = require('tchannel');

function sendAdminStats(instanceAddress, callback) {
    var client = new TChannel({
        host: '127.0.0.1',
        port: 31999
    });

    client.send({
        host: instanceAddress
    }, '/admin/stats', null, null, function onSend(err, res1, res2) {
        if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
        }

        callback(JSON.parse(res2));

        client.quit();
    });
}

module.exports = sendAdminStats;
