
var mongoose = require('mongoose');
var User = mongoose.model('users');
var validator = require('validator');
var Token = mongoose.model('tokens');
var Pass  = require('../lib/pass');
var tokengen = require('../lib/pass').token;
var moment = require('moment');

exports.signup = function (req, res) {
    var password = req.body.password;
    var email = req.body.email;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var interestId = req.body.interestId;
    var country = req.body.country;
    var city = req.body.city;
    var age = req.body.age;
    var gender = req.body.gender;

    if (!email || !validator.isEmail(email)) {
	    res.json({'success': false, 'error': 'Invalid email.'});
	    return;
    }

    if (!password) {
	    res.json({'success': false, 'error': 'Invalid password.'});
	    return;
    }
    Pass.hash(password, function (err, salt, hash) {
        if (err) throw err;
        var user = new User({
            email: email,
            firstName: firstName,
            lastName: lastName,
            interestId: interestId,
            country: country,
            city: city,
            age: age,
            gender: gender,
            salt: salt,
            hash: hash
        }).save(function (err, newUser) {
            if (err) throw err;
            authenticate(newUser.email, password, function(err, user){
                if (user) {
					var accessToken = tokengen(50);
					var expiryDate = moment().add(1, 'day').format();
					var token = new Token({
						email: user.email,
						accessToken: accessToken,
						expiryDate: expiryDate
					}).save(function (err, newToken) {
						if (err) throw err;
						res.json({
						    'success': true,
							'accessToken': newToken.accessToken,
							'firstName': user.firstName,
							'lastName': user.lastName,
							'gender': user.gender,
                            'interestId': user.interestId || 0,
                            "country": user.country || '',
                            "city": user.city || '',
                            "age": user.age || 0
						});
					});
				} else {
					res.json({'success': true, 'error': 'Invalid email or password.'});
				}
            });
        });
    });
};

exports.login = function (req, res) {
    if (req.body.facebookToken) {
        authenticateFacebook(req, function (err, user) {
            if (user) {
                var accessToken = tokengen(50);
                var expiryDate = moment().add(1, 'day').format();
                var token = new Token({
                    email: user.email,
                    accessToken: accessToken,
                    expiryDate: expiryDate
                }).save(function (err, newToken) {
                    if (err) throw err;
                    res.json({
                        'success': true,
                        'accessToken': newToken.accessToken,
                        'email': user.email,
                        'firstName': user.firstName,
                        'lastName': user.lastName,
                        'gender': user.gender,
                        'interestId': user.interestId || 0,
                        "country": user.country || '',
                        "city": user.city || '',
                        "age": user.age || 0
                    });
                });
            } else {
                res.json({'success': true, 'error': 'Invalid facebook token.'});
            }
        });
    } else {
        authenticate(req.body.email, req.body.password, function (err, user) {
            if (user) {
                var accessToken = tokengen(50);
                var expiryDate = moment().add(1, 'day').format();
                var token = new Token({
                    email: user.email,
                    accessToken: accessToken,
                    expiryDate: expiryDate
                }).save(function (err, newToken) {
                    if (err) throw err;
                    res.json({
                        'success': true,
                        'accessToken': newToken.accessToken,
                        'firstName': user.firstName,
                        'lastName': user.lastName,
                        'gender': user.gender,
                        'interestId': user.interestId || 0,
                        "country": user.country || '',
                        "city": user.city || '',
                        "age": user.age || 0
                    });
                });
            } else {
                res.json({'success': true, 'error': 'Invalid email or password.'});
            }
        });
    }
};

exports.sendpassword = function (req, res) {

    sendPassword(req.body.email, function (err, user) {
        if (err) res.json({'success': false, 'error': 'Error occurred.'});
        else res.json({'success': true});
    });

};

exports.userExist = function(req, res, next) {
    User.count({
        email: req.body.email
    }, function (err, count) {
        if (count === 0) {
            next();
        } else {
    	    res.json({'success': false, 'error': 'The email is already registered.'});
        }
    });
}

function authenticate(email, pass, fn) {
    /*if (!module.parent) console.log('authenticating %s:%s', email, pass);*/

    if (!email || !pass) return fn(new Error('wrong email or password.'));
    User.findOne({
        email: email
    },

    function (err, user) {
        if (user && user.salt) {
            if (err) return fn(new Error('cannot find user'));
            Pass.hash(pass, user.salt, function (err, hash) {
                if (err) return fn(err);
                if (hash == user.hash) return fn(null, user);
                return fn(new Error('invalid password'));
            });
        } else {
            return fn(new Error('cannot find user'));
        }
    });
}

function authenticateFacebook(req, fn) {

    var FB = require('fb');
    var accessToken = req.body.facebookToken;
    FB.api('me', { fields: ['id', 'email', 'first_name', 'last_name', 'gender'], access_token: accessToken }, function (res) {
        if (res.id) {
            var facebookId = res.id;
            var userData = {
                facebookId: res.id,
                email: res.email,
                firstName: res.first_name,
                lastName: res.last_name,
                gender: res.gender
            };

            User.update({email: res.email}, userData, {upsert: true}, function(err) {
                if (err) return fn(err);
                User.findOne({
                        facebookId: facebookId
                    },
                    function (err, user) {
                        if (err) return fn(err);
                        if (user) {
                            return fn(null, user);
                        } else {
                            return fn(new Error('Unknown error'));
                        }
                    });
            });
        } else {
            return fn(new Error('Wrong token, try again.'));
        }
    });
}

function sendPassword(email, fn) {
    /*if (!module.parent) console.log('sending new password to %s', email);*/

    User.findOne({
        email: email
    },

    function (err, user) {
        if (user) {
            if (err) return fn(new Error('cannot find user'));
            var newPass = Pass.token(15);
            if (!user.salt) user.salt = require('crypto').randomBytes(128);
            Pass.hash(newPass, user.salt, function (err, hash) {
                if (err) return fn(err);
                user.hash = hash;
		        var userData = user.toObject();
	            delete userData._id;

                User.update({_id: user._id}, userData, {upsert: false}, function(err) {
                    if (err) throw err;

                    var nodemailer = require('nodemailer');
                    var transporter = nodemailer.createTransport({
                        service: "Gmail",
                        auth: {
                            user: "yourmail@yourdomain.com",
                            pass: "yourpassword"
                        }
                    });

                    var message = 'This is your new password : <b>' + newPass + '</b>. Thanks';
                    // setup e-mail data with unicode symbols
                    var mailOptions = {
                        from: "do-not-reply@ruben-demos.com", // sender address
                        to: user.email, // list of receivers
                        subject: "You have new password", // subject line
                        html: message
                    };

                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, function(error, response){
                        if(error) return fn(new Error('mail is not sent.'));
                        /*console.log("Message sent: " + response.message);*/
                        return fn(null);
                    });
                });
            });
            //fn(null);
        } else {
            return fn(new Error('cannot find user'));
        }
    });
}

exports.checkAuth = function(req, res, next) {

    if (!req.body.accessToken) {
        return res.json({'success': false, 'error': 'Invalid access token.'});
    }

    Token.findOne({
        accessToken: req.body.accessToken
    },

    function (err, token) {
        if (token) {
            if (err) res.json({'success': false, 'error': 'Invalid access token.'});
            User.findOne({
                email: token.email
            }, function(err, user) {
                if (err) res.json({'success': false, 'error': 'Invalid access token owner.'});
                var userData = user.toObject();
                req.body.user_id = userData._id;
                req.body.user_age = userData.age;
                req.body.user_gender = userData.gender;
                req.body.user_interestId = userData.interestId;
                next();
            });

        } else {
            return res.json({'success': false, 'error': 'Invalid access token.'});
        }
    });
};

exports.profileget = function (req, res) {

    User.findOne({
        '_id': req.body.user_id
    },
    function (err, user) {
        if (user) {
            if (err) return fn(new Error('cannot find user'));
            res.json({
                'success': true,
                'profile': {
                    "email": user.email,
                    "firstName": user.firstName,
                    "lastName": user.lastName,
                    "interestId": user.interestId || 0,
                    "country": user.country || '',
                    "city": user.city || '',
                    "age": user.age || 0,
                    "gender": user.gender
                }
            });
        } else {
            return fn(new Error('cannot find user'));
        }
    });
};

function saveUser(user, req, res) {
    var userData = user.toObject();
    delete userData._id;
    User.update({_id: user._id}, userData, {upsert: true}, function(err) {
        if (err) throw err;
        // console.log('user updated.');
        res.json({'success': true});
    });

}

exports.profileset = function (req, res) {

    User.findOne({
        '_id': req.body.user_id
    },

    function (err, user) {
        if (user) {
            if (err) return fn(new Error('cannot find user'));
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.gender = req.body.gender;
            user.country = req.body.country;
            user.city = req.body.city;
            user.interestId = req.body.interestId;
            user.age = req.body.age;

            if (req.body.password) {
                Pass.hash(req.body.password, function (err, salt, hash) {
                    if (err) throw err;
                    user.salt = salt;
                    user.hash = hash;
                    saveUser(user, req, res);
                });
            } else {
                saveUser(user, req, res);
            }
        } else {
            return fn(new Error('cannot find user'));
        }
    });
};
