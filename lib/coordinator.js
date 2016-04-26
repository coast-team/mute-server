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
/*global require, model, setInterval, console */
"use strict";

var Utils = require('mute-utils');
var events = require('events');
var LogootSRopes = require('mute-structs').LogootSRopes;
var LogootSAdd = require('mute-structs').LogootSAdd;
var LogootSDel = require('mute-structs').LogootSDel;

var Coordinator = function (mongoose) {
    this.models = {};
    this.network = null;
    this.Model = mongoose.model('Model', mongoose.Schema({
        docID: String,
        ropes: {},
        replicaNumber: Number,
        creationDate: Date,
        lastModificationDate: Date,
        lastConnexionDate: Date,
        history: []
    }));
};

Coordinator.prototype.__proto__ = events.EventEmitter.prototype;

Coordinator.prototype.addDoc = function (docID) {
    var coordinator = this;

    // Model's data
    var m = new this.Model();
    m.docID = docID;
    m.replicaNumber = 0;
    m.ropes = new LogootSRopes(m.replicaNumber);
    m.creationDate = new Date();
    m.lastModificationDate = new Date();
    m.lastConnexionDate = new Date();
    m.history = [];
    this.models[docID] = m;

    // Add the model to the DB
    this.models[docID].markModified('ropes');
    this.models[docID].markModified('history');
    // Save 1
    this.models[docID].save(function (err, model) {
                if (err) {
                    return console.error(err, model);
                }
                console.log('Save 1: successful creation!');
            });

    // Add the execution time's variables
    this.models[docID].bufferLogootSOp = [];
    this.models[docID].flag = false;
    this.models[docID].nbConnected = 0;

    setInterval(function () {
        coordinator.cleanBufferLogootSOp(docID);
    }, 1000);
};

Coordinator.prototype.deleteDoc = function (docID) {
    this.Model.remove({ docID: docID }, function (err) {
        if (err) {
            console.error(err);
        }
        delete this.models[docID];
    });
};

Coordinator.prototype.getInfos = function (list) {
    // TODO: return all the documents' infos stored in the DB
    /*
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
    */
};

Coordinator.prototype.setNetwork = function (network) {
    var coordinator = this;

    this.network = network;
    this.network.on('getDoc', function (args) {
        coordinator.join(args);
    });
    this.network.on('receiveOps', function(data) {
        Array.prototype.push.apply(coordinator.models[data.docID].bufferLogootSOp, data.logootSOperations);
    });

    this.network.on('disconnect', function(data) {
        if(coordinator.models[data.docID]!==null && coordinator.models[data.docID]!==undefined
            && typeof coordinator.models[data.docID].nbConnected === 'number') {
            coordinator.models[data.docID].nbConnected--;
        }
    });
};

Coordinator.prototype.join = function (args) {
    console.log("JOIN !!!!!! ><");
    console.log(args);
    var coordinator = this;
    var temp;

    // Check if we have NOT already access the document
    if(this.models[args.docID] === null || this.models[args.docID] === undefined) {
        // Fetch it from the DB
        this.Model.findOne({ docID: new RegExp('^'+args.docID+'$') }, function (err, model) {
            if (err) {
                console.error(err);
                return;
            }
            // Add it to the data structure
            coordinator.models[args.docID] = model;
            temp = new LogootSRopes(model.replicaNumber);
            temp.copyFromJSON(model.ropes);
            model.ropes = temp;
            model.bufferLogootSOp = [];
            model.flag = false;
            model.nbConnected = 0;

            setInterval(function () {
                coordinator.cleanBufferLogootSOp(args.docID);
            }, 250);

            coordinator.join(args);
        });
    }
    else {
        // Retrieve the model
        var model = this.models[args.docID];

        // Check if the user has already a replica number
        if(args.replicaNumber === undefined || args.replicaNumber === null || args.replicaNumber === -1) {
            model.replicaNumber++;
            args.replicaNumber = model.replicaNumber;
        }

        // Update the current data
        model.lastConnexionDate = new Date();
        model.nbConnected++;

        temp = [];
        Array.prototype.push.apply(temp, model.bufferLogootSOp);
        Array.prototype.push.apply(model.bufferLogootSOp, args.bufferLocalLogootSOp);
        args.bufferLogootSOp = temp;
        args.bufferLocalLogootSOp = [];

        // Update the DB
        model.save(function (err, a1Model) {
            if (err) {
                return console.error(err, a1Model);
            }
            console.log('Save 2: successful update!');
        });

        // Send the object's data to the user
        args.ropes = model.ropes;
        args.history = model.history;

        args.lastModificationDate = model.lastModificationDate;
        args.creationDate = model.creationDate;
        this.emit('doc', args);
    }
};

Coordinator.prototype.cleanBufferLogootSOp = function (docID) {
    var model = this.models[docID];
    var length = model.bufferLogootSOp.length;
    var message;
    var OK;
    var lo;
    var tos;
    var to;
    var j;
    var temp;

    if(model.flag !== true) {
        // Not already in this function
        model.flag = true;
        while(model.bufferLogootSOp.length > 0) {
            message = model.bufferLogootSOp.shift();
            OK = true;
            // Have to identify which type of operation is buffered
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
                tos = lo.execute(model.ropes);
                for(j=0; j<tos.length; j++)
                {
                    to = tos[j];
                    temp = to;
                    if(to.content != null && to.offset != null) {
                        //Il s'agit d'une insertion
                        model.ropes.str = Utils.insert(model.ropes.str, to.offset, to.content);
                    }
                    else if(to.length != null && (to.offset != null || to.offset == 0)) {
                        //Il s'agit d'une suppression
                        to.deletion = model.ropes.str.substr(to.offset, to.length);
                        model.ropes.str = Utils.del(model.ropes.str, to['offset'], to['offset'] + to['length'] - 1);
                    }
                    model.history.push(to);
                }
            }
            console.log('------------------------------');
            console.log(docID,': ', model.ropes.str);
            length++;
        }
        // Update the item stored in the DB
        if(length > 0) {
            model.lastModificationDate = new Date();
            model.markModified('ropes');
            model.markModified('history');
            // Save 3
            model.save(function (err, model) {
                if (err) {
                    return console.error(err);
                }
                console.log('Save 3: successful update!');
            });
        }
        model.flag = false;
    }
};

module.exports = Coordinator;
