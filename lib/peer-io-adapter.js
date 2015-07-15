var PeerIOAdapter = function(io){
    peerIOAdapter = this;
    this.docs = {};
    this.io = io;
    this.io.sockets.on('connection', function(socket){
        socket.on('newPeer', function(infoPeer){
            var infoPeerIds = {};
            infoPeerIds.peers = peerIOAdapter.getAllPeerIDS(infoPeer.docID);
            console.log("InfoPeerIds : ");
            console.log(infoPeerIds);
            console.log(peerIOAdapter.docs);
            peerIOAdapter.addPeer(this.id, infoPeer.docID, infoPeer.peerID);
            infoPeerIds.replicaNumber = peerIOAdapter.getReplicaNumber(infoPeer.docID);
            this.emit('infoPeerIDs', infoPeerIds);
            console.log("Peer added to the doc " + infoPeer.docID);
        });
        socket.on('disconnect', function(socket){
            console.log(">>>> Peer deconnection : ");
            peerIOAdapter.removePeer(this.id);
            console.log(peerIOAdapter.docs);
        });
    });
};

PeerIOAdapter.prototype.docAlreadyExists = function(docID){
    for(var id in this.docs){
        if(id === docID){
            return true;
        }
    }
    return false;
};

PeerIOAdapter.prototype.addPeer = function(id, docID, peerID){
    if(!this.docAlreadyExists(docID)){
        this.docs[docID] = new Doc(docID);
    }
    this.docs[docID].appendPeer(id, peerID);

};

PeerIOAdapter.prototype.addDoc = function(docID){
    console.log("Doc added !");
    if(!this.docAlreadyExists(docID)){
        this.docs[docID] = new Doc(docID);
    }
};

PeerIOAdapter.prototype.getAllPeerIDS = function(docID){
    var tab = [];
    if(this.docAlreadyExists(docID)){
        for(var key  in this.docs[docID].peers){
            tab.push(this.docs[docID].peers[key]);
        }
    }
    console.log(tab);
    return tab;
};

PeerIOAdapter.prototype.removePeer = function(id){
    for(var key in this.docs){
        this.docs[key].removePeer(id);
    }
};

PeerIOAdapter.prototype.getReplicaNumber = function(docID){
    return this.docs[docID].replicaNumber;
};

var Doc = function(docID){
    this.docID = docID;
    this.replicaNumber = 0;
    this.peers = {};
};

Doc.prototype.appendPeer = function(id, peerID){
    console.log(peerID);
    this. replicaNumber ++;
    this.peers[id] = (peerID);
};

Doc.prototype.removePeer = function(id){
    console.log("Remove peer");
    for(var key in this.peers){
        if(key == id){
            delete this.peers[key];
            break;
        }
    }
};



module.exports = PeerIOAdapter;