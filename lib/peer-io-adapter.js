var PeerIOAdapter = function(io){
    peerIOAdapter = this;
    this.docs = {};
    this.io = io;
    this.mode = "fully-meshed";
    this.io.sockets.on('connection', function(socket){
        socket.on('newPeer', function(infoPeer){
            var peers = peerIOAdapter.getPeerIDS(infoPeer.docID);

            peerIOAdapter.addPeer(this, infoPeer.docID, infoPeer.peerID);
            console.log(peers);
            peerIOAdapter.docs[infoPeer.docID].peers[this.id].send(peers);
            console.log("Peer added to the doc " + infoPeer.docID);
        });
        socket.on('disconnect', function(socket){
            console.log('>>>> Peer deconnection : ');
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

PeerIOAdapter.prototype.addPeer = function(socket, docID, peerID){
    if(!this.docAlreadyExists(docID)){
        this.docs[docID] = new Doc(docID);
    }
    this.docs[docID].appendPeer(socket, peerID);

};

PeerIOAdapter.prototype.addDoc = function(docID){
    console.log('Doc added !');
    if(!this.docAlreadyExists(docID)){
        this.docs[docID] = new Doc(docID);
    }
};

PeerIOAdapter.prototype.getAllPeerIDS = function(docID){
    var tab = [];
    if(this.docAlreadyExists(docID)){
        for(var key  in this.docs[docID].peers){
            tab.push(this.docs[docID].peers[key].peerId);
        }
    }
    console.log(tab);
    return tab;
};

PeerIOAdapter.prototype.getPeerIDS = function(docID){
    if(this.mode === "fully-meshed"){
        return this.getAllPeerIDS(docID);
    }else{
        console.log('ERROR');
        return [];
    }
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

Doc.prototype.appendPeer = function(socket, peerID){
    console.log(peerID);
    this.replicaNumber ++;
    this.peers[socket.id] = new Peer(peerID, socket, this.replicaNumber);
};

Doc.prototype.removePeer = function(id){
    console.log('Remove peer');
    for(var key in this.peers){
        if(key === id){
            delete this.peers[key];
            break;
        }
    }
};

var Peer = function(peerId, socket, replicaNumber){
    this.peerId = peerId;
    this.socket = socket;
    this.replicaNumber = replicaNumber;
};

Peer.prototype.send = function(peers){
    var infoPeerIds = {};
    infoPeerIds.peers = peers;
    infoPeerIds.replicaNumber = this.replicaNumber;
    this.socket.emit('infoPeerIDs', infoPeerIds);
};



module.exports = PeerIOAdapter;
