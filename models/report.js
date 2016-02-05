

var mongoose = require('mongoose');

var ReportSchema = new mongoose.Schema({
    fileId: String,
    reportUserId: String,
    type: String,
    comment: String,
    reportDate: Date
});

var Report = mongoose.model('reports', ReportSchema);
