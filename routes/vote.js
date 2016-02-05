
var mongoose = require('mongoose');
var validator = require('validator');
var Vote = mongoose.model('votes');
var voteModel = require('../models/vote');
var PictureRouter = require('./picture');

exports.voteCheck = function(file_id, user_id, callback) {
    Vote.findOne( {$and: [{userId:user_id}, {fileId: file_id}]},  function (err, vote) {
        if (vote) {
            if (err) return fn(new Error('Error found.'));
            callback(true);
        } else {
            callback(false);
        }
    });
}

exports.vote = function (req, res) {
    var fileId = req.body.fileId;
    var rating = req.body.rating;

    if (typeof fileId === 'undefined' || fileId === '' ||
        typeof rating === 'undefined' || rating === '') {
        res.json({'success': false, 'error': 'Required fields are missing.'});
        return;
    }

    if(!validator.isInt(rating) || rating < 0 || rating > 10) {
        res.json({'success': false, 'error': 'Rating should be a number between 1 to 10.'});
        return;
    }

    Vote.findOne( {$and: [{userId: req.body.user_id}, {fileId: fileId}]},  function (err, vote) {
        if (vote) {
            if (err) return fn(new Error('Error found.'));
            //console.log('already rated. - ' + vote.rating);
            var voteData = vote.toObject();
            delete voteData ._id;

            voteData.rating = rating;
            Vote.update({_id: vote._id}, voteData, {upsert: false}, function(err) {
                if (err)
                    res.json({'success': false, error: 'Error found.'});
                else
                    res.json({'success': true, 'vote': voteData});
                });
        } else {
            //console.log('no previously rated.');
            var vote = new Vote({
                fileId: fileId,
                userId: req.body.user_id,
                rating: rating
            }).save(function (err, newVote) {
                    if (err)
                        res.json({'success': false, error: 'Error found.'});
                    else if(newVote) {
                        if (newVote.rating > 0) {
                            PictureRouter.voteup(fileId, rating, function(err, fileData){
                                if (err)
                                    res.json({'success': false, error: 'Error found.'});
                                else{
                                    res.json({'success': true, 'vote': newVote});
                                }
                            });
                        } else {
                            res.json({'success': true, 'vote': newVote});
                        }
                    }
                });
        }
    });
};
