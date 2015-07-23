function Cluster() {
    this.membershipChecksum = null;
    this.membership = null;
    this.nodes = [];
    this.nodeCount = 0;
}

Cluster.prototype.addNode = function addNode(node) {
    this.nodes.push(node);
};

Cluster.prototype.getNodeCount = function getNodeCount() {
    return this.nodes.length;
};

Cluster.prototype.getSortedMembers = function getSortedMembers() {
    var membersCopy = this.membership.slice(0);

    membersCopy.sort();

    return membersCopy;
};

module.exports = Cluster;
