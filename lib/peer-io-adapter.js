var PeerIOAdapter = function(io) {
  peerIOAdapter = this;
  this.docs = {};
  this.io = io;
  this.mode = "fully-meshed";
  this.io.sockets.on('connection', function(socket) {
    socket.on('newPeer', function(infoPeer) {
      var wcId;
      var doc;
      if (!this.docExists(infoPeer.docId)) {
        doc = peerIOAdapter.docs[infoPeer.docId] = new Doc(infoPeer.docId);
      } else {
        doc = peerIOAdapter.docs[infoPeer.docId];
      }
      var responce = { replicaNumber: this.replicaNumber };
      if (doc.hasOwnProperty('wcId')) {
        responce.action = 'join';
        responce.key = doc.wcId;
        this.socket.emit('newPeerResponce', responce);
      } else {
        doc.wcId = infoPeer.wcId;
        responce.action = 'open';
        this.socket.emit('newPeerResponce', responce);
      }
    });
  });
};

PeerIOAdapter.prototype.docExists = function(docId) {
  for (var id in this.docs) {
    if (id === docId) { return true; }
  }
  return false;
};

PeerIOAdapter.prototype.addDoc = function(docId){
  if(!this.docExists(docId)){
    this.docs[docId] = new Doc(docId);
  }
};

var Doc = function(docId){
  this.docId = docId;
  this.replicaNumber = 0;
};

module.exports = PeerIOAdapter;
