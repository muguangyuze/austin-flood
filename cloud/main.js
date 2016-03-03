require('cloud/app.js');

var accountSid = 'AC81afc6eaa961bf59a98a98bd48e09273';
var authToken = '33ff5995d61529ce8cc13bafa0ba137b';
var client = require('twilio')(accountSid, authToken);

var sensorTwilio = Parse.Object.extend("Sensor");
var barricadeTwilio = Parse.Object.extend("Barricade");
var infoOfLevel = {};
var listOfNum = [];

var message = '';

Parse.Cloud.beforeSave("WaterLevel", function(request, response) {

    var queryT = new Parse.Query(sensorTwilio);

    queryT.equalTo("sensorId", request.object.get("sensorId"));
    queryT.first({
        success: function (sensor) {
            if (request.object.get("waterLevel") >= sensor.get("thresholdLevel")) {

                infoOfLevel[sensor.get("placeName")] = request.object.get("waterLevel");
                message = formatText(infoOfLevel);

                var queryN = new Parse.Query(Parse.User);
                queryN.equalTo("phoneNumber", "+15103966032");
                queryN.find({
                    success: function(users) {
                        listOfNum = users;

                        sendAutoText(listOfNum, message, request.object.get("sensorId"));
                        var queryB = new Parse.Query(barricadeTwilio);

                        queryB.equalTo("sensorId", request.object.get("sensorId"));
                        queryB.first({
                            success: function (barricadeTwilio) {

                                barricadeTwilio.save(null, {
                                    success: function (status) {
                                        //response.error(status.get('sensorId'));
                                        status.set("bStatus", true);
                                        status.save();
                                        response.success();
                                    }
                                });
                            }
                        });


                    },
                    error: function (error) {
                        console.log(error);
                    }
                });
            } else {
                var queryB1 = new Parse.Query(barricadeTwilio);

                queryB1.equalTo("sensorId", request.object.get("sensorId"));
                queryB1.first({
                    success: function (barricadeTwilio) {

                        barricadeTwilio.save(null, {
                            success: function (status) {
                                //response.error(status.get('sensorId'));
                                status.set("bStatus", false);
                                status.save();
                                response.success();
                            }
                        });
                    }
                });

            }
        }
    })
});

//format message of the warning text
function formatText (floodedSensors) {
    if (Object.keys(floodedSensors).length == 0) {
        console.log('here');
        return '[This is a test] ALERT! Currently there are no flash floods.';
    }

    var message = '[This is a test] ALERT! The water level went pass the threshold for the following sensor(s): \n';
    for (var key in floodedSensors) {
        message += key.toString() + ': ' + floodedSensors[key].toString() + '\n';
    }

    return message;
}

function sendAutoText(num, message, sensorId) {
    var queryB = new Parse.Query(barricadeTwilio);

    queryB.equalTo("sensorId", sensorId);
    queryB.first({
        success: function (status) {
            if (status.get('bStatus') == false) {
                for (var i = 0; i < num.length; i++) {
                    client.sendSms({
                        to: num[i].get('phoneNumber'),
                        from: '+19315320186',
                        body: message
                    }, function(error, data) {
                        if (error) {
                            //response.error("error");
                        } else {
                            //response.error("success");
                        }
                    });
                }
            }
        }
    });
}
