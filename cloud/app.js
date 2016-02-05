
// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var expressLayouts = require('cloud/express-layouts.js');
var router = require('cloud/routes/router.js');

var parseExpressHttpsRedirect = require('parse-express-https-redirect');
var parseExpressCookieSession = require('parse-express-cookie-session');
var accountSid = 'ACf3ea843512294d9aaa7b8d786f8d8c87';
var authToken = 'a03c723f349fa9b660cdba485c7abb6c';
var client = require('twilio')(accountSid, authToken);
var app = express();
//var twilioClient = require('cloud/twilioClient.js');

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(expressLayouts);
app.use(parseExpressHttpsRedirect());
app.use(express.cookieParser('austinflood'));
app.use(parseExpressCookieSession({ cookie: { maxAge: 3600000 } }));
app.use(express.bodyParser());    // Middleware for reading request body
app.use(express.methodOverride());
app.use(app.router);

app.locals.parseAppId = 'OenLwqP21DFOVjeXg3HXsd4urWWNGSwxPgQMnknS';
app.locals.parseJsKey = 'S1I1VZppmxt1WiT2PHYMZBhuLTSqp2URZ8abTjWK';
app.locals.title = 'Austin Flood';

// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
app.get('/', router.home);
app.get('/login', router.login);
app.post('/login', router.loginSubmit);
app.get('/signup', router.signup);
app.post('/signup', router.signupSubmit);
app.get('/logout', router.logout);
app.post('/sendSMS',
    function(req, res) {
        client.sendSms({
            to: "+19315320186",
            from: "+15005550006",
            body: 'Hello World from Twilio'
        }, function(err, responseData) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(responseData);
                    //console.log(responseData.body);
                }
            }
        );
        res.send('Success');
    });
/*app.get('/testtwilio', function(req, res){
    twilioClient.sendSms('hahahahaha');
    res.send('Text Sent!');
});*/
// // Example reading from the request query string of an HTTP get request.
// app.get('/test', function(req, res) {
//   // GET http://example.parseapp.com/test?message=hello
//   res.send(req.query.message);
// });

// // Example reading from the request body of an HTTP post request.
// app.post('/test', function(req, res) {
//   // POST http://example.parseapp.com/test (with request body "message=hello")
//   res.send(req.body.message);
// });

// Attach the Express app to Cloud Code.
app.listen();
