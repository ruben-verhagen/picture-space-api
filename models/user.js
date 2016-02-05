
var Token = require('../lib/pass');
var mongoose = require('mongoose');
mongoose.connect("mongodb://localhost/mmdb");

var UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    age: Number,
    gender: String,
    interestId: Number,
    country: String,
    city: String,
    facebookId: String,
    salt: String,
    hash: String
});

UserSchema.methods.generateToken = function(cb) {
    this.accessToken = Token.token(50);

    var userData = this.toObject();
    delete userData._id;

    User.update({_id: this._id}, userData, {upsert: true}, function(err) {
	    if (err) throw err;
    });
};

var User = mongoose.model('users', UserSchema);
