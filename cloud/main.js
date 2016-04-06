require('cloud/app.js');

var accountSid = 'AC81afc6eaa961bf59a98a98bd48e09273';
var authToken = '33ff5995d61529ce8cc13bafa0ba137b';
var client = require('twilio')(accountSid, authToken);

var sensorTwilio = Parse.Object.extend("Sensor");
var barricadeTwilio = Parse.Object.extend("Barricade");
var publicTwilio = Parse.Object.extend("Subscription");
var levelTwilio = Parse.Object.extend("WaterLevel");
var infoOfLevel = {};
var listOfNum = [];
var listofPub = [];
var listofLevel = [];

var message = '';

Parse.Cloud.beforeSave("WaterLevel", function(request, response) {

    var queryL = new Parse.Query(levelTwilio);

    queryL.equalTo("sensorId", request.object.get("sensorId"));
    queryL.equalTo("hasError", false);
    queryL.descending("createdAt");
    queryL.first({
        success: function (level) {
            var change = Math.abs(request.object.get("waterLevel") - level.get('waterLevel'));
            if (change > 100) {
                //response.error(change.toString());
                changeErrorStatus(request.object.get("sensorId"), true, response);
            } else {
                var queryT = new Parse.Query(sensorTwilio);

                queryT.equalTo("sensorId", request.object.get("sensorId"));
                queryT.first({
                    success: function (sensor) {
                        //check for critical level then lower barricade and send text when barricade is removed
                        if (request.object.get("waterLevel") <= sensor.get("criticalLevel")) {

                            infoOfLevel[sensor.get("placeName")] = request.object.get("waterLevel");
                            message = formatText(infoOfLevel);

                            var queryN = new Parse.Query(Parse.User);
                            //queryN.equalTo("phoneNumber", "+19314228528");
                            queryN.find({
                                success: function(users) {
                                    listOfNum = users;

                                    sendAutoText(listOfNum, message, request.object.get("sensorId"));
                                    sendPublicAlert(message, request.object.get("sensorId"), response);
                                    //response.error("reached critical.")
                                    //response.success();
                                    changeBarricadeStatus(request.object.get("sensorId"), true, response);
                                }
                            });
                        }
                        //check for caution level then remove barricade when it's lowered
                        else if (request.object.get("waterLevel") >= sensor.get("warningLevel")) {
                            //response.error("here");
                            changeBarricadeStatus(request.object.get("sensorId"), false, response);
                        }
                        else {
                            changeErrorStatus(request.object.get("sensorId"), false, response);
                            //response.success();
                            //response.error("nothing happens");
                        }
                    }
                });
            }
        }
    });
});


function changeErrorStatus (id, status, res) {
    var queryStat = new Parse.Query(sensorTwilio);

    queryStat.equalTo("sensorId", id);
    queryStat.first({
        success: function (sensorTwilio) {
            sensorTwilio.set("hasError", status);
            sensorTwilio.save();
            //res.error(status+"change error");
            res.success();
        }
    });
}

function changeBarricadeStatus (id, state, res) {
    var queryB1 = new Parse.Query(barricadeTwilio);
    var time_now = Date.now();

    queryB1.equalTo("sensorId", id);
    queryB1.first({
        success: function (barricade) {
            // check if 10 minutes have passed since updating barricade manually
            var statusChangedAt = barricade.get("manualChangedAt").getTime();
            var min_passed = Math.round((time_now - statusChangedAt)/(1000*60));
            //res.error(min_passed.toString());
            //res.error(state.toString());

            // only change barricade when its state is the opposite of the the given status and if it hasn't been changed manually
            if (barricade.get("bStatus") != state && min_passed >= 10) {
                barricade.save(null, {
                    success: function (status) {
                        status.set("bStatus", state);
                        status.save();
                        //res.success();
                        //res.error(state + "change barricade");
                        changeErrorStatus(id, false, res);
                    }
                });
            } else {
                changeErrorStatus(id, false, res);
            }
        }
    });
}

Parse.Cloud.afterSave("WaterLevel", function(request) {
    var query = new Parse.Query(levelTwilio);
    var queryF = new Parse.Query(levelTwilio);

    queryF.equalTo("sensorId", request.object.get("sensorId"));
    queryF.equalTo("hasError", false);
    queryF.descending("createdAt");
    queryF.find({
        success: function(results) {
            listofLevel = results;
            var change = Math.abs(request.object.get("waterLevel") - listofLevel[0].get("waterLevel"));
            if (change > 100) {
                query.get(request.object.id,{
                    success:function(flag){
                        flag.set("hasError", true);
                        //flag.set("waterLevel", change);
                        flag.save();
                    }
                });
            } else {
                query.get(request.object.id,{
                    success:function(flag){
                        flag.set("hasError", false);
                        //flag.set("waterLevel", change);
                        flag.save();
                    }
                });
            }
        }
    });
});

function sendPublicAlert (text, sensorId, res) {
    var queryP = new Parse.Query(publicTwilio);

    queryP.equalTo("sensorId", sensorId);
    queryP.equalTo("isVerified", true);
    queryP.find({
        success: function (public) {
            listofPub = public;
            //res.error("have the numbers");
            sendAutoText(listofPub, text, sensorId, res);
        }
    });
}

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
    //res.error(num[0].get('phoneNumber'));
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
                        //res.error("success");
                    });
                }
            }
        }
    });
}