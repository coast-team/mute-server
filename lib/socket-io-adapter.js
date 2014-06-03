/*
 *	Copyright 2014 Matthieu Nicolas
 *
 *	This file is part of Mute-server.
 *
 *  Mute-server is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Mute-server is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Mute-server.  If not, see <http://www.gnu.org/licenses/>.
 */

var events = require('events');

var SocketIOAdapter = function (server, coordinator) {
	var network = this;

	var io = require('socket.io').listen(server);

	io.sockets.on('connection', function (socket) {
	  	// TODO: Récupérer l'evenement qui permet de changer de salle


	  	socket.on('joinDoc', function (data) {
			socket.room = data.docID;
			socket.join(data.docID);
			network.join(socket);
	  	});

	  	socket.on('sendOps', function (data, callback) {
	  		data.docID = socket.room;
			socket.broadcast.to(socket.room).emit('broadcastOps', data);
			network.emit('receiveOps', data);
			callback({ error: false, length: data.logootSOperations.length});
	  	});

		socket.on('disconnect', function () {
			network.emit('disconnect', { docID: socket.room });
		});
	});

	io.set('transports', ['xhr-polling']);

	this.coordinator = coordinator;
	this.coordinator.on('doc', function (args) {
		var message = {
			"ropes": args.ropes,
			"replicaNumber": args.replicaNumber,
			"logootSOperations": args.logootSOperations,
			"creationDate": args.creationDate
		};
		args.socket.emit('sendDoc', message);
	});
};

SocketIOAdapter.prototype.__proto__ = events.EventEmitter.prototype;

SocketIOAdapter.prototype.join = function(socket) {
	var args = {
		"socket": socket,
		"docID": socket.room,
	};
	this.emit('getDoc', args);
}

module.exports = SocketIOAdapter;
