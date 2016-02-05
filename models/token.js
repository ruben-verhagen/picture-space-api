

var mongoose = require('mongoose');

var TokenSchema = new mongoose.Schema({
    email: String,
    accessToken: String,
    expiryDate: Date
});

var Token = mongoose.model('tokens', TokenSchema);
