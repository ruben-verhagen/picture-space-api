

var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Async = require('async');

var validator = require('validator');
var tmp = require('tmp');
var fs = require("fs");
var mongoose = require('mongoose');
var User = mongoose.model('users');
var Report = mongoose.model('reports');
var VoteRouter = require('./vote');

// Establish connection to db
var db = new Db('filedb', new Server('localhost', 27017, {auto_reconnect: true}), {safe: false});

db.open(function(err, db) {
    if (err) throw err;
    console.log('File db connected.');
});

exports.upload = function(req, res) {

    var fileName = req.body.fileName;
    var fileContent = req.body.fileContent;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var caption = req.body.caption;
    var votes = req.body.votes;
    var daysToExpire = req.body.daysToExpire;
    var user_id = req.body.user_id;
    var user_age = req.body.user_age;
    var user_gender = req.body.user_gender;
    var user_interestId = req.body.user_interestId;

    if (typeof fileName === 'undefined' || fileName === '' ||
        typeof fileContent === 'undefined' || fileContent === '' ||
        typeof latitude === 'undefined' || latitude === '' ||
        typeof longitude === 'undefined' || longitude === '' ||
        typeof caption === 'undefined' || caption === '' ||
        typeof votes === 'undefined' || votes === '' ||
        typeof daysToExpire === 'undefined' || daysToExpire === ''
        ) {
        res.json({'success': false, 'error': 'Required fields are missing.'});
        return;
    }

    if(!validator.isFloat(latitude) || !validator.isFloat(longitude)) {
        res.json({'success': false, 'error': 'Langitude/longitude should be numbers.'});
        return;
    }

    if (!votes) votes = 0;
    if(!validator.isInt(votes)) {
        res.json({'success': false, 'error': 'Votes should be a number.'});
        return;
    }

    if (!daysToExpire) daysToExpire = 0;
    if(!validator.isInt(daysToExpire)) {
        res.json({'success': false, 'error': 'Days to expire should be a number.'});
        return;
    }

    var fileId = new ObjectID();
    var moment = require('moment');
    var expiryDate = moment().add(daysToExpire, 'day').format();

    // Create a new instance of the gridstore
    var gridStore = new GridStore(db, fileId, fileName, 'w', {
        "content_type": "image/png",
        "metadata":{
            "latitude": latitude,
            "longitude": longitude,
            "caption": caption,
            "user_id": user_id,
            "user_age": user_age,
            "user_gender": user_gender,
            "user_interestId": user_interestId,
            "votes": votes,
            "expiryDate": expiryDate,
            "daysToExpire": daysToExpire,
            "votes_got": 0,
            "votes_score": 0
        }}
    );

    // Open the file
    gridStore.open(function(err, gridStore) {

        // Write some data to the file
        gridStore.write(fileContent, function(err, gridStore) {
            if (err) {
                res.json({'success': false, 'error': 'Server error found.'});
                return;
            }

            // Close (Flushes the data to MongoDB)
            gridStore.close(function(err, result) {
                if (err) {
                    res.json({'success': false, 'error': 'Server error found.'});
                    return;
                }

                // Verify that the file exists
                GridStore.exist(db, fileId, function(err, fileExists) {
                    if (err || !fileExists) {
                        res.json({'success': false, 'error': 'Server file not found.'});
                        return;
                    }
                    res.json({'success': true, 'fileId': fileId});

                    //db.close();
                    return;
                });
            });
        });
    });
};

exports.list = function(req, res) {
    db.collection('fs.files')
        .find({ 'metadata.user_id' : req.body.user_id})
        .toArray(function(err, files) {
            if (err) throw err;
            res.json({'success': true, 'files': files});
            var results = [];
        });
};

exports.get = function(req, res) {

    if (!req.body.fileId) {
        res.json({'success': false, 'error': 'Please specify file id.'});
        return;
    }
    var fileId = ObjectID(req.body.fileId);

    db.collection('fs.files').findOne({_id: fileId}, function(err, file) {
        if (err) {
            //db.close();
            throw err;
        }

        if (!file) {
            res.json({'success': false, error: 'File not found.'});
        } else {
            res.json({'success': true, 'file': file});
        }
    });
};

exports.voteup = function(fileId, rating, callback) {

    fileId = ObjectID(fileId);

    db.collection('fs.files').findOne({_id: fileId}, function(err, file) {
        if (err || !file) {
            res.json({'success': false, error: 'File not found'});
            return;
        }

        var fileData = file;
        delete fileData._id;

        var votes_got = 0;
        if (fileData.metadata.votes_got)
            votes_got = validator.toInt(fileData.metadata.votes_got);
        fileData.metadata.votes_got = votes_got + 1;
        var votes_score = 0;
        if (fileData.metadata.votes_score)
            votes_score = validator.toInt(fileData.metadata.votes_score);
        fileData.metadata.votes_score = votes_score + rating;
        db.collection('fs.files').update({_id: fileId}, fileData, {}, function(err) {
            if (err)
                callback(err, null);
            else {
                callback(err, fileData);
            }

        });
    });

}

exports.download = function(req, res) {

    var fileId = false;
    if (req.body.fileId) {
        fileId = ObjectID(req.body.fileId);
    }
    if (req.params.fileId) {
        fileId = ObjectID(req.params.fileId);
    }

    if (!fileId) {
        res.statusCode = 404;
        res.send('Can\'t find that file, sorry!');
        return;
    }

    db.collection('fs.files').findOne({_id: fileId}, function(err, file) {
        if (err) throw err;
        if (!file) {
            //db.close();
            res.statusCode = 404;
            res.send('Cant find that file, sorry!');
        } else {
            var gridStore2  = new GridStore(db, file._id, 'r');
            gridStore2.open(function(err, gs){
                GridStore.read(db, file._id, function(err, fileData) {
                    tmp.tmpName(function _tempNameGenerated(err, filePath) {
                        if (err) throw err;

                        fs.writeFile(filePath, new Buffer(fileData, 'base64').toString('ascii'), 'base64', function(err) {
                            if (err) {
                                res.statusCode = 404;
                                res.send('Cant find that file, sorry!');
                                return;
                            }
                            require("fs").readFile(filePath, function(error, content) {
                                if (error) {
                                    res.statusCode = 404;
                                    res.send('Cant find that file, sorry!');
                                }
                                else {
                                    res.writeHead(200, { 'Content-Type': 'image/png' });
                                    res.end(content, 'utf-8');
                                }
                                fs.unlink(filePath);

                            });
                        });
                    });
                });
            });
        }
    });
};

exports.delete = function(req, res) {

    if (!req.body.fileId) {
        res.json({'success': false, 'error': 'Please specify file id.'});
        return;
    }
    var fileId = ObjectID(req.body.fileId);

    db.collection('fs.files').findOne({$and: [{_id: fileId}, {'metadata.user_id' : req.body.user_id}]}, function(err, file) {
        if (err || !file) {
            res.json({'success': false, error: 'File not found'});
            //db.close();
            return;
        }
        GridStore.unlink(db, file._id, function(err, result) {
            if(err) res.json({'success': false, 'error': 'Error found.'});
            else res.json({'success': true});
        });
    });
};

exports.set = function(req, res) {
    if (!req.body.fileId) {
        res.json({'success': false, 'error': 'Please specify file id.'});
        return;
    }

    var fileName = req.body.fileName;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var caption = req.body.caption;
    var votes = req.body.votes;
    var daysToExpire = req.body.daysToExpire;

    if((latitude && !validator.isFloat(latitude)) || (longitude && !validator.isFloat(longitude))) {
        res.json({'success': false, 'error': 'Langitude/longitude should be numbers.'});
        return;
    }
    if(votes && !validator.isInt(votes)) {
        res.json({'success': false, 'error': 'Votes should be an integer.'});
        return;
    }
    if(daysToExpire && !validator.isInt(daysToExpire)) {
        res.json({'success': false, 'error': 'Days to expire should be an integer.'});
        return;
    }

    var fileId = ObjectID(req.body.fileId);
    db.collection('fs.files').findOne({
        $and: [{_id: fileId}, {'metadata.user_id' : req.body.user_id}]}, function(err, file) {
        if (err || !file) {
            res.json({'success': false, error: 'File not found'});
            //db.close();
            return;
        }

        var fileData = file;
        delete fileData._id;
        if(typeof caption !== 'undefined') fileData.metadata.caption = caption;
        if(typeof latitude !== 'undefined') fileData.metadata.latitude = latitude;
        if(typeof longitude !== 'undefined') fileData.metadata.longitude = longitude;
        if(typeof votes !== 'undefined') fileData.metadata.votes = votes;
        if(typeof daysToExpire !== 'undefined') {
            var moment = require('moment');
            var expiryDate = moment().add(daysToExpire, 'day').format();
            fileData.metadata.expiryDate = expiryDate;
        }
        db.collection('fs.files').update({_id: fileId}, fileData, {}, function(err) {
            if (err)
                res.json({'success': false, error: 'Error found.'});
            else {
                fileData._id = fileId
                res.json({'success': true, 'file': fileData});
            }
        });
    });
};

function calcDistance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var radlon1 = Math.PI * lon1/180;
    var radlon2 = Math.PI * lon2/180;
    var theta = lon1-lon2;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist;
}

exports.search = function(req, res) {
    //var fileName = req.body.fileName;
    var gender = req.body.gender;
    var maxAge = req.body.maxAge;
    var minAge = req.body.minAge;
    var maxDistance = req.body.maxDistance;
    var minDistance = req.body.minDistance;
    if (typeof maxDistance === 'undefined' || maxDistance === '') maxDistance = 1000;
    if (typeof minDistance === 'undefined' || minDistance === '') minDistance = 0;

    var maxVotes = req.body.maxVotes;
    var minVotes = req.body.minVotes;
    if (typeof maxVotes === 'undefined' || maxVotes === '') maxVotes = -1;
    if (typeof minVotes === 'undefined' || minVotes === '') minVotes = 0;

    var lat = req.body.latitude;
    var lng = req.body.longitude;

    var fromDate = req.body.dateFrom;
    var toDate = req.body.dateTo;
    var limit = req.body.limit;
    var skip = req.body.skip;
    var sort = req.body.sort;

    var query = '';
    if (req.body.query) {
        query = req.body.query;
    }
    if (!limit) limit = 20;
    if (!skip) skip = 0;

    db.collection('fs.files')
        .find({ "metadata.caption" : {$regex : ".*" + query +".*"}} /*, {"sort": [["metadata.votes", -1]]} */)
        .toArray(function(err, files) {
            if (err)
                res.json({'success': false, error: 'Error found.'});
            else {

                var results = [];
                Async.each(files, function(file, callback){

                    // exclude own pictures
                    if (file.metadata.user_id.toString() == req.body.user_id) { callback(); return; }

                    // exclude enough voted pictures
                    if (file.metadata.votes_got >= file.metadata.votes) { callback(); return; }

                    // check #votes range
                    if (file.metadata.votes_got < minVotes || (maxVotes != -1 && file.metadata.votes_got > maxVotes)) { callback(); return; }

                    // exclude expired pictures
                    var moment = require('moment');
                    if (moment(file.metadata.expiryDate).isBefore(moment())) { callback(); return; }

                    // check users interests
                    //if (file.metadata.user_interestId == 1 && req.body.user_gender.toLowerCase() !== "male") { callback(); return; }
                    //if (file.metadata.user_interestId == 2 && req.body.user_gender.toLowerCase() !== "female") { callback(); return; }
                    if (gender && gender.toLowerCase() != 'all' && gender.toLowerCase() != file.metadata.user_gender.toLowerCase()) { callback(); return; }
                    if (file.metadata.user_age < minAge || file.metadata.user_age > maxAge) { callback(); return; }

                    // check distance
                    var distance = calcDistance(file.metadata.latitude, file.metadata.longitude, lat, lng, 'M');
                    if (!isNaN(distance) && (distance < minDistance || distance > maxDistance)) { callback();  return; }

                    // exclude already voted pictures
                    VoteRouter.voteCheck(file._id, req.body.user_id, function(voted) {
                        if (!voted) {
                            results.push(file);
                        }
                        callback();
                    });
                }, function(err){
                    // if any of the file processing produced an error, err would equal that error
                    if( err ) {
                        // One of the iterations produced an error.
                        // All processing will now stop.
                        res.json({'success': false, 'files': []});
                    } else {
                        res.json({'success': true, 'files': results.slice(skip, skip + limit)});
                    }
                });

            }
        });
};


exports.report = function(req, res) {

    var fileId = false;
    if (req.body.fileId) {
        fileId = ObjectID(req.body.fileId);
    }
    if (req.params.fileId) {
        fileId = ObjectID(req.params.fileId);
    }

    if (!fileId) {
        res.statusCode = 404;
        res.send('Can\'t find that file, sorry!');
        return;
    }

    var reportUserId = req.body.user_id;
    var type = req.body.type;
    var comment = req.body.comment;
    if (typeof reportUserId === 'undefined' || reportUserId === '' ||
        typeof type === 'undefined' || type === '' ||
        typeof comment === 'undefined' || comment === ''
        ) {
        res.json({'success': false, 'error': 'Required fields are missing.'});
        return;
    }

    db.collection('fs.files').findOne({_id: fileId}, function(err, file) {
        if (err) throw err;
        if (!file) {
            res.statusCode = 404;
            res.send('Cant find that file, sorry!');
        } else {

            var report = new Report({
                fileId: fileId,
                reportUserId: reportUserId,
                type: type,
                comment: comment,
                reportDate: require('moment')().format()
            }).save(function (err, newReport) {
                if (err)
                    res.json({'success': false, error: 'Error found.'});
                else if(newReport) {
                    res.json({'success': true, 'report': newReport});

                    var nodemailer = require('nodemailer');
                    var transporter = nodemailer.createTransport({
                        service: "Gmail",
                        auth: {
                            user: "support@anonywork.com",
                            pass: "vkclyqqrycgfwruu"
                        }
                    });

                    var message = 'This file is reported: <br>'
                        + 'FileId: ' + newReport.fileId + '<br>'
                        + 'Owner: ' + file.metadata.user_id + '<br>'
                        + 'Reported By: ' + newReport.reportUserId + '<br>'
                        + 'Type: ' + newReport.type + '<br>'
                        + 'Comment: ' + newReport.comment + '<br>'
                        + 'Report Date: ' + newReport.reportDate

                    var mailOptions = {
                        from: "support@anonywork.com",  // sender address
                        to: "support@anonywork.com",    // list of receivers
                        subject: "Reported : " + file.metadata.user_id + " - " + newReport.fileId, // subject line
                        html: message
                    };

                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, function(error, response){
                        if(error) throw error;
                    });
                }
            });
        }
    });
};