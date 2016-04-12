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
    var change = 0;

    queryL.equalTo("sensorId", request.object.get("sensorId"));
    queryL.notEqualTo("hasError", true);
    queryL.descending("createdAt");
    queryL.first({
        success: function (level) {
            if (level == undefined || typeof(level) == "undefined") {
                response.success();
            } else {
                change = Math.abs(request.object.get("waterLevel") - level.get('waterLevel'));

                var queryD = new Parse.Query(sensorTwilio);

                queryD.equalTo("sensorId", request.object.get("sensorId"));
                queryD.first({
                    success: function(info) {
                        if (change > info.get("errorDelta")) {
                            //response.error(change.toString());
                            //response.error(info.get("errorDelta").toString());
                            //changeErrorStatus(request.object.get("sensorId"), true, response);

                            var queryTE = new Parse.Query(sensorTwilio);

                            queryTE.equalTo("sensorId", request.object.get("sensorId"));
                            queryTE.first({
                                success: function (sensor) {
                                    //check for critical level then lower barricade and send text when barricade is removed
                                    //response.error("reached before critical in error." + request.object.get("waterLevel").toString() + sensor.get("criticalLevel").toString());
                                    if (request.object.get("waterLevel") <= sensor.get("criticalLevel")) {

                                        infoOfLevel[sensor.get("placeName")] = request.object.get("waterLevel");
                                        message = formatText(infoOfLevel);

                                        var queryNE = new Parse.Query(Parse.User);
                                        //queryNE.equalTo("phoneNumber", "+19314228528");
                                        queryNE.find({
                                            success: function(users) {
                                                listOfNum = users;

                                                //sendAutoText(listOfNum, message, request.object.get("sensorId"));
                                                //sendPublicAlert(message, request.object.get("sensorId"), response);
                                                //response.error("reached critical in error.")
                                                //response.success();
                                                changeBarricadeStatus(request.object.get("sensorId"), true, 1, response);
                                            }
                                        });
                                    }
                                    //check for caution level then remove barricade when it's lowered
                                    else if (request.object.get("waterLevel") >= sensor.get("warningLevel")) {
                                        //response.error("here in error");
                                        changeBarricadeStatus(request.object.get("sensorId"), false, 1, response);
                                    }
                                    else {
                                        changeErrorStatus(request.object.get("sensorId"), 1, response);
                                        //response.success();
                                        //response.error("nothing happens in error");
                                    }
                                }
                            });

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
                                                changeBarricadeStatus(request.object.get("sensorId"), true, 3, response);
                                            }
                                        });
                                    }
                                    //check for caution level then remove barricade when it's lowered
                                    else if (request.object.get("waterLevel") >= sensor.get("warningLevel")) {
                                        //response.error("here");
                                        changeBarricadeStatus(request.object.get("sensorId"), false, 0, response);
                                    }
                                    else {
                                        changeErrorStatus(request.object.get("sensorId"), 0, response);
                                        //response.success();
                                        //response.error("nothing happens");
                                    }
                                }
                            });
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
            sensorTwilio.set("hasErrorOrFlood", status);
            sensorTwilio.save();
            //res.error(status+"change error");
            res.success();
        }
    });
}

function changeBarricadeStatus (id, state, sensor, res) {
    var queryB1 = new Parse.Query(barricadeTwilio);
    var queryS1 = new Parse.Query(sensorTwilio);
    var time_now = Date.now();

    queryB1.equalTo("sensorId", id);
    queryB1.first({
        success: function (barricade) {
            if (barricade == undefined || typeof(barricade) == "undefined") {
                res.success();
            }
            // check if 10 minutes have passed since updating barricade manually
            //var statusChangedAt = barricade.get("manualChangedAt").getTime();
            //var min_passed = Math.round((time_now - statusChangedAt)/(1000*60));
            //res.error(min_passed.toString());
            //res.error(state.toString());
            else {
                // only change barricade when its state is the opposite of the the given status and if it hasn't been changed manually
                if (barricade.get("bStatus") != state && barricade.get("overrideStatus") == false) {
                    barricade.save(null, {
                        success: function (status) {
                            status.set("bStatus", state);
                            status.save();
                            //res.success();
                            //res.error(state + "change barricade");
                            changeErrorStatus(id, sensor, res);
                        }
                    });
                } else {
                    changeErrorStatus(id, sensor, res);
                }
            }
        }
    });
}

Parse.Cloud.afterSave("WaterLevel", function(request) {
    var queryF = new Parse.Query(levelTwilio);
    var query = new Parse.Query(levelTwilio);
    var queryC = new Parse.Query(sensorTwilio);

    queryF.equalTo("sensorId", request.object.get("sensorId"));
    queryF.notEqualTo("hasError", true);
    queryF.descending("createdAt");
    queryF.find({
        success: function(results) {
            if (results == undefined || typeof(results) == "undefined") {
                query.get(request.object.id, {
                    success: function (flag) {
                        flag.set("hasError", undefined);
                        flag.save();
                    }
                });
            } else {
                listofLevel = results;
                var change = Math.abs(request.object.get("waterLevel") - listofLevel[1].get("waterLevel"));

                queryC.equalTo("sensorId", request.object.get("sensorId"));
                queryC.first({
                    success: function(sensor){

                        if (change > sensor.get("errorDelta")) {
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

    var message = '[This is a test] ALERT! There is a flash flood in the \n';
    for (var key in floodedSensors) {
        message += key.toString() + '\n';
    }

    return message;
}

function sendAutoText(num, message, sensorId, res) {
    //var queryP = new Parse.Query(publicTwilio);
    var queryS = new Parse.Query(sensorTwilio);
    var queryB = new Parse.Query(barricadeTwilio);
    //res.error(num[0].get('phoneNumber'));
    queryB.equalTo("sensorId", sensorId);
    queryB.first({
        success: function (status) {
            if (status.get('bStatus') == false) {
                for (var i = 0; i < num.length; i++) {
                    //if (num[i] != undefined && typeof(num[i] != "undefined") && num[i].get('phoneNumber').length != 0){
                    client.sendSms({
                        to: num[i].get('phoneNumber'),
                        from: '+19315320186',
                        body: message
                    }, function(error, data) {
                        //res.error("success");
                    });
                    //}
                }
            }
            else if (status == undefined || typeof(status) == "undefined") {
                queryS.equalTo("sensorId", id);
                queryS.first({
                    success: function (sensor) {
                        if (sensor.get('hasErrorOrFlood') != 3 || sensor.get('hasErrorOrFlood') != 1) {
                            for (var i = 0; i < num.length; i++) {
                                //if (num[i] != undefined && typeof(num[i] != "undefined") && num[i].get('phoneNumber').length != 0){
                                client.sendSms({
                                    to: num[i].get('phoneNumber'),
                                    from: '+19315320186',
                                    body: message
                                }, function(error, data) {
                                    //res.error("success");
                                });
                                //}
                            }
                        }
                    }
                });
            }
        }
    });
}

Parse.Cloud.job("sensorStatusCheck", function(request, status) {
    // Set up to modify user data
    console.log('Status job preparing...');
    Parse.Cloud.useMasterKey();
    var counter = 0;
    console.log('Status job still preparing...');
    // Query for all users
    var query = new Parse.Query(sensorTwilio);
    console.log('Status job starting...');
    query.each(function(sensor) {
        var waterLevelQuery = new Parse.Query(levelTwilio);
        console.log("Query sensor for id - " + sensor.get("sensorId"));
        waterLevelQuery.equalTo("sensorId", sensor.get("sensorId"));
        waterLevelQuery.descending("createdAt");
        return waterLevelQuery.first(
            {
                success: function(waterLevel){
                    if (waterLevel==null || typeof(waterLevel) == 'undefined') {
                        return;
                    }
                    var timeDiff = Date.now() - waterLevel.createdAt.getTime();
                    console.log("Query waterlevel for sensor " + sensor.get("sensorId") + " with time difference - " + timeDiff);
                    if (timeDiff > 880000){
                        sensor.set('hasErrorOrFlood', 2); //time interval is smaller than 15 mins for system delays
                    }
                    if (counter % 100 === 0) {
                        // Set the  job's progress status
                        status.message(counter + " sensors processed.");
                    }
                    counter += 1;
                    return sensor.save();
                },
                error: function(error) {
                    console.log("Waterlevel query failing " + error);
                }
            });
    }).then(function() {
        // Set the job's success status
        status.success("Status check completed successfully.");
    }, function(error) {
        // Set the job's error status
        status.error("Sensor status check job ERROR.");
    });
});