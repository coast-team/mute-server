/*
 *  Copyright 2014 Matthieu Nicolas
 *
 *  This file is part of Mute-server.
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
var Utils = require('mute-utils');

var SocketIOAdapter = function (io, coordinator, infosUsersModule, delay) {
    var network = this;

    this.delay = delay || 0;
    this.connected = {};

    this.io = io;

    this.io.sockets.on('connection', function (socket) {

        if(socket.cnt !== null && socket.cnt !== undefined) {
            console.log('//////////////////////////////////////////////// On incrémente cnt');
            socket.cnt++;
        }
        else {
            console.log('//////////////////////////////////////////////// On ajoute les listeners');
            socket.cnt = 0;

            socket.on('joinDoc', function (data, callback) {
                var temp = [];
                Array.prototype.push.apply(temp, data.bufferLocalLogootSOp);
                socket.room = data.docID;
                socket.join(socket.room);
                network.join(socket, data);
                callback({ error: false, length: temp.length });
                setTimeout(function () {
                    network.io.in(socket.room).emit('broadcastOps', { logootSOperations: temp });
                }, network.delay + 750);
            });


            socket.on('sendOps', function (data, callback) {
                data.docID = socket.room;
                data.logootSOperations = data.logootSOperations.map(function (logootSOperation) {
                    logootSOperation.owner = socket.replicaNumber;
                    return logootSOperation;
                });
                setTimeout(function () {
                    socket.broadcast.to(socket.room).emit('broadcastOps', data);
                }, network.delay);
                network.emit('receiveOps', data);
                callback({ error: false, length: data.logootSOperations.length });
            });

            socket.on('sendLocalInfosUser', function (data) {
                socket.broadcast.to(socket.room).emit('broadcastCollaboratorCursorAndSelections', data);
                data.docID = socket.room;
                network.emit('receiveInfosUser', data);
            });

            socket.on('sendLocalUsername', function (data) {
                socket.broadcast.to(socket.room).emit('broadcastCollaboratorUsername', data);
                data.docID = socket.room;
                network.emit('receiveUsername', data);
            });

            socket.on('disconnect', function () {
                var i = 0;
                var key;

                // Remove the socket for this replica number
                if(network.connected[socket.room] !== null && network.connected[socket.room] !== undefined
                    && network.connected[socket.room][socket.replicaNumber] !== null
                    && network.connected[socket.room][socket.replicaNumber] !== undefined
                    && network.connected[socket.room][socket.replicaNumber][socket.id] !== null
                    && network.connected[socket.room][socket.replicaNumber][socket.id] !== undefined) {
                    delete network.connected[socket.room][socket.replicaNumber][socket.id];
                }
                if(socket.replicaNumber !== undefined && socket.replicaNumber !== null){
                    for(key in network.connected[socket.room][socket.replicaNumber]) {
                        i++;
                    }
                }
                // If the replica number references no socketID
                // Delete it
                if(i === 0 && socket.replicaNumber !== undefined && socket.replicaNumber !== null) {
                    network.emit('disconnect', { replicaNumber: socket.replicaNumber, docID: socket.room });
                    network.io.in(socket.room).emit('userLeft', { replicaNumber: socket.replicaNumber });
                    delete network.connected[socket.room][socket.replicaNumber];
                    console.log('Il reste que : ', network.connected);
                }
            });
        }

        console.log('socket.id: ', socket.id, ' socket.cnt: ', socket.cnt);
    });

    this.io.set('transports', ['polling']);

    this.coordinator = coordinator;

    this.coordinator.on('doc', function (args) {
        var infosUsers;
        var msg;

        if(network.connected[args.socket.room] === null || network.connected[args.socket.room] === undefined
					|| network.connected[args.socket.room][args.replicaNumber] === null
					|| network.connected[args.socket.room][args.replicaNumber] === undefined) {
			network.connected[args.socket.room][args.replicaNumber] = {};
		}
		network.connected[args.socket.room][args.replicaNumber][args.socket.id] = true;

		infosUsersModule.addUser(args.socket.room, args.replicaNumber, args.username);
		infosUsers = infosUsersModule.getInfosUsers(args.socket.room);

        msg = {
            "ropes": args.ropes,
            "history": args.history,
            "replicaNumber": args.replicaNumber,
            "bufferLogootSOp": args.bufferLogootSOp,
            "creationDate": args.creationDate,
            "lastModificationDate": args.lastModificationDate,
            "infosUsers": infosUsers
        };

        args.socket.replicaNumber = args.replicaNumber;
        args.socket.emit('sendDoc', msg);
        args.socket.broadcast.to(args.socket.room).emit('userJoin', { replicaNumber: args.socket.replicaNumber, username: infosUsers[args.socket.replicaNumber].username });
    });

    this.coordinator.on('infosUsers', function (data) {
        var msg = {
            infosUsers: data.infosUsers
        };
        network.io.in(data.docID).emit('sendInfosUsers', msg);
    });
};

SocketIOAdapter.prototype.__proto__ = events.EventEmitter.prototype;

SocketIOAdapter.prototype.join = function (socket, data) {
    data.socket = socket;
    if(this.connected[socket.room] === null || this.connected[socket.room] === undefined) {
        this.connected[socket.room] = {};
    }
    this.emit('getDoc', data);
};

SocketIOAdapter.prototype.setDelay = function (delay) {
    this.delay = delay;
};

module.exports = SocketIOAdapter;
