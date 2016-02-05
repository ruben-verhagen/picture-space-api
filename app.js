/*
Module Dependencies
*/
var express = require('express'),
    http = require('http'),
    path = require('path'),
    bodyParser = require('body-parser');

var UserModel = require('./models/user');
var TokenModel = require('./models/token');
var VoteModel = require('./models/vote');
var ReportModel = require('./models/report');
var UserRouter = require('./routes/user');
var PictureRouter = require('./routes/picture');
var VoteRouter = require('./routes/vote');

var app = express();

/*
Middlewares and configurations
*/
app.use(bodyParser.urlencoded({limit: '15mb', extended: true}));
app.use(bodyParser.json({limit: '15mb'}));
app.use(express.static(path.join(__dirname, 'public')));

/*
Routes
*/

app.post("/signup",                     UserRouter.userExist,   UserRouter.signup);
app.post("/login",                                              UserRouter.login);
app.post("/sendpassword",                                       UserRouter.sendpassword);
app.post("/profile/get",                UserRouter.checkAuth,   UserRouter.profileget);
app.post("/profile/set",                UserRouter.checkAuth,   UserRouter.profileset);
app.post("/picture/upload",             UserRouter.checkAuth,   PictureRouter.upload);
app.post("/picture/list",               UserRouter.checkAuth,   PictureRouter.list);
app.post("/picture/get",                UserRouter.checkAuth,   PictureRouter.get);
app.post("/picture/delete",             UserRouter.checkAuth,   PictureRouter.delete);
app.post("/picture/set",                UserRouter.checkAuth,   PictureRouter.set);
app.post("/picture/search",             UserRouter.checkAuth,   PictureRouter.search);
app.get('/picture/download/:fileId',                            PictureRouter.download);
app.post('/picture/:fileId/report',     UserRouter.checkAuth,   PictureRouter.report);
app.post('/picture/vote',               UserRouter.checkAuth,   VoteRouter.vote);

http.createServer(app).listen(3000);
