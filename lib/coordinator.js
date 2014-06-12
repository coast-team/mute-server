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

var Utils = require('mute-utils');
var events = require('events');

var LogootSRopes = require('mute-structs').LogootSRopes;
var LogootSAdd = require('mute-structs').LogootSAdd;
var LogootSDel = require('mute-structs').LogootSDel;

var Coordinator = function () {
	this.models = {};
	this.network = null;
};

Coordinator.prototype.__proto__ = events.EventEmitter.prototype;

Coordinator.prototype.addDoc = function (docID) {
	var coordinator = this;

	this.models[docID] = {};
	this.models[docID].ropes = new LogootSRopes();
	this.models[docID].bufferLogootSOp = [];
	this.models[docID].flag = false;
	this.models[docID].replicaNumber = 0;
	this.models[docID].infosUsers = {};
	this.models[docID].infosUsersUpdated = false;
	this.models[docID].nbConnected = 0;
	this.models[docID].creationDate = new Date().toJSON();
	this.models[docID].lastModificationDate = new Date().toJSON();
	this.models[docID].lastConnexionDate = 'No connexion ever...';

	setInterval(function () {
		coordinator.cleanBufferLogootSOp(docID);
	}, 250);
};

Coordinator.prototype.deleteDoc = function (docID) {
	delete this.models[docID];
};

Coordinator.prototype.listDocs = function () {
	var list = [];
	
	for(docID in this.models) {
		list.push(docID);
	}
	return list;
};

Coordinator.prototype.getInfos = function (list) {
	var res;
	var set;
	var docID;
	var model;
	var i;

	res = {};
	set = this.models;
	if(list !== null && list !== undefined && typeof list.length === 'number') {
		set = {};
		for(i=0; i<list.length; i++) {
			set[list[i]] = true;
		}
	}
	for(docID in set) {
		model = this.models[docID];
		res[docID] = {};
		res[docID].creationDate = model.creationDate;
		res[docID].lastModificationDate = model.lastModificationDate;
		res[docID].lastConnexionDate = model.lastConnexionDate;
		res[docID].nbConnexions = model.replicaNumber;
		res[docID].nbConnected = model.nbConnected;
		res[docID].content = model.ropes.str;
	}

	return res;
};

Coordinator.prototype.setNetwork = function (network) {
	var coordinator = this;

	this.network = network;
	this.network.on('getDoc', function (args) {
		coordinator.join(args);
	});
	this.network.on('receiveOps', function(data) {
		Utils.pushAll(coordinator.models[data.docID].bufferLogootSOp, data.logootSOperations);
	});
	this.network.on('receiveInfosUser', function (data) {
		coordinator.updateInfosUser(data);
	});
	this.network.on('disconnect', function(data) {
		if(coordinator.models[data.docID]!==null && coordinator.models[data.docID]!==undefined
			&& typeof coordinator.models[data.docID].nbConnected === 'number') {
			coordinator.models[data.docID].nbConnected--;
			delete coordinator.models[data.docID].infosUsers[data.replicaNumber];
		}
	});

	setInterval(function () {
		var docID;
		for(docID in coordinator.models) {
			if(coordinator.models[docID].infosUsersUpdated === true) {
				coordinator.emit('infosUsers', { docID: docID, infosUsers: coordinator.models[docID].infosUsers });	
				coordinator.models[docID].infosUsersUpdated = false;
			}
		}
	}, 1000);
};

Coordinator.prototype.join = function (args) {
	var model = this.models[args.docID];
	if(args.replicaNumber === undefined || args.replicaNumber === null || args.replicaNumber === -1) {
		model.replicaNumber++;
		args.replicaNumber = model.replicaNumber;
	}
	model.nbConnected++;
	model.lastConnexionDate = new Date().toJSON();
	model.infosUsers[args.replicaNumber] = { 
		indexCursor: 0,
		selections: []
	};
	args.ropes = model.ropes;
	args.logootSOperations = model.bufferLogootSOp;
	args.creationDate = model.creationDate;
	this.emit('doc', args);
};

Coordinator.prototype.cleanBufferLogootSOp = function (docID) {
	var model = this.models[docID];
	if(model.flag != true) {
		model.flag = true;
		while(model.bufferLogootSOp.length > 0) {
			var message = model.bufferLogootSOp.shift();
	        var OK = true;
	        var lo;

	        if(message.id != null && message.l != null) {
	        	lo = new LogootSAdd(message.id, message.l);
	        }
	        else if(message.lid != null) {
	        	lo = new LogootSDel(message.lid);
	        }
	        else {
	        	OK = false;
	        }

	        if(OK) {
		        var tos = lo.execute(model.ropes);
		        for(var j=0; j<tos.length; j++)
		        {
		            var to = tos[j];
		            if(to['content'] != null && to['offset'] != null) {
		                //Il s'agit d'une insertion
		                model.ropes.str = Utils.insert(model.ropes.str, to['offset'], to['content']);
		            }
		            else if(to['length'] != null && (to['offset'] != null || to['offset'] == 0)) {
		                //Il s'agit d'une suppression
		                model.ropes.str = Utils.del(model.ropes.str, to['offset'], to['offset'] + to['length'] - 1);
		            }
		        }
		    }
		    console.log('------------------------------');
		    console.log(docID,': ', model.ropes.str);
		    model.lastModificationDate = new Date().toJSON();
		}
		model.flag = false;
	}
};

Coordinator.prototype.updateInfosUser = function (data) {
	var docID = data.docID;
	var replicaNumber = data.replicaNumber;
	var infosUser;
	
	if(docID !== null && docID !== undefined 
		&& replicaNumber !== null && docID !== undefined) {
		infosUser = this.models[docID].infosUsers[replicaNumber];
		this.models[docID].infosUsersUpdated = true;

		this.models[docID].infosUsers[replicaNumber] = {
			indexCursor: data.infosUser.indexCursor,
			selections: data.infosUser.selections
		};
	}
};

module.exports = Coordinator;
