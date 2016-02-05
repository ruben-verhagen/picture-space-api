

var mongoose = require('mongoose');
var VoteSchema = new mongoose.Schema({
    fileId: String,
    userId: String,
    rating: Number
});

var Vote = mongoose.model('votes', VoteSchema);
