var NETFLUX_NB_OPEN_DOOR = 5
var openDoorCounter = 0

var PeerIOAdapter = function(io) {
  peerIOAdapter = this;
  this.docs = {};
  this.io = io;
  this.mode = "fully-meshed";
  this.io.sockets.on('connection', function (socket) {
    socket.on('newPeer', function(infoPeer) {
      var doc;
      // Create DOC if not exist
      if (!peerIOAdapter.docExists(infoPeer.docId)) {
        doc = peerIOAdapter.docs[infoPeer.docId] = new Doc(infoPeer.docId);
        peerIOAdapter.docs[infoPeer.docId] = doc;
      } else {
        doc = peerIOAdapter.docs[infoPeer.docId];
      }
      // Update replicaNumber
      doc.replicaNumber++;
      // Associate socket with DOC
      doc.addSocket(socket);
      socket.on('disconnect', function () {
        doc.removeSocket(socket)
        if (socket.key !== null) {
          doc.openDoorCounter--
          doc.keys.splice(doc.keys.indexOf(socket.key), 1);
        }
      });
      var response = { replicaNumber: doc.replicaNumber };
      if (doc.openDoorCounter === 0) {
        socket.key = infoPeer.key;
        response.action = 'open';
        doc.keys.push(infoPeer.key);
        doc.openDoorCounter++
        console.log('First peer open: ' + infoPeer.key);
      } else {
        response.action = 'join';
        response.keys = doc.keys;
        socket.key = null;
        console.log('Another peer ' + infoPeer.key + ' is joining ' + doc.keys + '. Counter = ' + doc.openDoorCounter);
        if (doc.openDoorCounter < NETFLUX_NB_OPEN_DOOR) {
          response.shouldOpen = true;
          doc.openDoorCounter++
          setTimeout(function () {
            if (socket.key === null) {
              doc.openDoorCounter--
              console.log('Peer ' + infoPeer.key + ' could not open. The counter now is =  ' + doc.openDoorCounter)
            }
          }, 5000);
        } else {
          response.shouldOpen = false;
        }
      }
        socket.emit('newPeerResponse', response);
     });

     socket.on('key', function (data) {
       console.log('Peer sent the key: ' + data.key)
       peerIOAdapter.docs[data.docId].keys.push(data.key);
       socket.key = data.key;
     });

  });
};

PeerIOAdapter.prototype.docExists = function (docId) {
  for (var id in this.docs) {
    if (id === docId) { return true; }
  }
  return false;
};

PeerIOAdapter.prototype.addDoc = function (docId){
  if(!this.docExists(docId)){
    this.docs[docId] = new Doc(docId);
  }
};

var Doc = function(docId){
  this.docId = docId;
  this.openDoorCounter = 0;
  this.replicaNumber = 0;
  this.keys = [];
  this.sockets = [];
};

Doc.prototype.addSocket = function (socket) {
  var doesNotExist = true;
  for (var i in this.sockets) {
    if (socket.id === this.sockets[i].id) {
      doesNotExist = false
    }
  }
  if (doesNotExist) {
    this.sockets.push(socket)
  }
}

Doc.prototype.removeSocket = function (socket) {
  var index = -1
  for (var i in this.sockets) {
    if (socket.id === this.sockets[i].id) {
      index = i;
      break;
    }
  }
  if (index !== -1) {
    this.sockets.splice(index, 1)
  }
};

module.exports = PeerIOAdapter;
