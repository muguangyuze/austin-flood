/**
 * Created by a on 2/2/16.
 */
/**
 * Created by youjinpark on 2/2/16.
 */

var accountSid = 'ACf3ea843512294d9aaa7b8d786f8d8c87';
var authToken = 'a03c723f349fa9b660cdba485c7abb6c';

var client = require('twilio')(accountSid, authToken);

exports.formatMessage = function(errorToReport) {
    return '[This is a test] ALERT! There is a flash flood warning from sensor' + errorToReport;
};

exports.sendSms = function(message) {
    console.log('insideSMS');
    console.log(client);
    client.sendSms({

        to: "+19315320186",
        from: "+15005550006",
        body: message
    }, function (err, data) {
        console.log("here");
        console.log(err);
        console.log(data);
    })
};