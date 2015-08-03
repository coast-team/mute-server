var events = require('events');

var InfosUsersModule = function () {
	this.infosUsers = {};
	this.network = null;
};

InfosUsersModule.prototype.setNetwork = function (network) {
	var infosUsersModule = this;

	this.network = network;

	network.on('disconnect', function (data) {
		var docID = data.docID;
		var replicaNumber = data.replicaNumber;
		
		infosUsersModule.removeUser(docID, replicaNumber);
	});

	network.on('receiveInfosUser', function (data) {
		var docID = data.docID;
		var replicaNumber = data.replicaNumber;
		var cursorIndex = data.infosUser.cursorIndex;
		var selections = data.infosUser.selections;

		infosUsersModule.updateInfosUser(docID, replicaNumber, cursorIndex, selections);
	});

	network.on('receiveUsername', function (data) {
		var docID = data.docID;
		var replicaNumber = data.replicaNumber;
		var username = data.username;

		infosUsersModule.updateUsername(docID, replicaNumber, username);
	});
}

InfosUsersModule.prototype.addUser = function (docID, replicaNumber, username) {
	var username;
	if(this.infosUsers[docID] === null || this.infosUsers[docID] === undefined) {
		this.infosUsers[docID] = {};
	}
	if(username === null || username === undefined) {
		username = 'User ' + replicaNumber
	};
	this.infosUsers[docID][replicaNumber] = {
		cursorIndex: 0,
		selections: [],
		username: username
	};
};

InfosUsersModule.prototype.removeUser = function (docID, replicaNumber) {
	if(replicaNumber !== null && replicaNumber !== undefined){
		delete this.infosUsers[docID][replicaNumber];
	}
};

InfosUsersModule.prototype.getInfosUsers = function (docID) {
	return this.infosUsers[docID];
};

InfosUsersModule.prototype.updateInfosUser  = function (docID, replicaNumber, cursorIndex, selections) {
	if(this.infosUsers[docID] !== null 
		&& this.infosUsers[docID] !== undefined
		&& this.infosUsers[docID][replicaNumber] !== null 
		&& this.infosUsers[docID][replicaNumber] !== undefined) {
		this.infosUsers[docID][replicaNumber].cursorIndex = cursorIndex;
		this.infosUsers[docID][replicaNumber].selections = selections;
	}

};

InfosUsersModule.prototype.updateUsername = function (docID, replicaNumber, username) {	
	if(this.infosUsers[docID] !== null 
		&& this.infosUsers[docID] !== undefined
		&& this.infosUsers[docID][replicaNumber] !== null 
		&& this.infosUsers[docID][replicaNumber] !== undefined) {
		this.infosUsers[docID][replicaNumber].username = username;
	}
};

module.exports = InfosUsersModule;