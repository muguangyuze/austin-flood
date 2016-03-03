/**
 * Created by youjinpark on 2/16/16.
 */
var input = {
    to: ["+19315320186"],
    //from: "+19315320186",
    body: "Hello!"
};

var Sensor = Parse.Object.extend("Sensor");
//var infoOfSensor = {};
var listOfSensor = [];
var listOfNum = [];
var WaterLevel = Parse.Object.extend("WaterLevel");
var infoOfLevel = {};
var Barricade = Parse.Object.extend("Barricade");
var message = '';

var count = 0;

$(function () {
    var query = new Parse.Query(Sensor);

    query.descending('sensorId');
    query.find({
        success: function (sensors) {
            listOfSensor = sensors;
            for (var i = 0; i < sensors.length; i++) {
                //console.log(listOfSensor[i].get('sensorId') + ' - ' + listOfSensor[i].get('recentUpdate'));
                checkForUpdate(sensors[i]);
            }
        },
        error: function (error) {
            console.log(error);
        }
    });

    function checkForUpdate (sensor) {
        var queryW = new Parse.Query(WaterLevel);

        queryW.equalTo("sensorId", sensor.get('sensorId'));
        queryW.descending("createdAt");
        queryW.first({
            success: function (wlevel) {
                console.log(wlevel.get('sensorId') + ' - ' + sensor.get('thresholdLevel') + ': ' +
                    wlevel.get('waterLevel'));

                //if the new reading is greater than or equal to the sensor's specific threshold
                if (wlevel.get('waterLevel') >= sensor.get('thresholdLevel')) {
                    // store the water level
                    infoOfLevel[wlevel.get('sensorId')] = wlevel.get('waterLevel');

                    message = formatText(infoOfLevel);
                    console.log(message);

                    var queryN = new Parse.Query(Parse.User);
                    queryN.equalTo("phoneNumber", "+19314228528");
                    queryN.find({
                        success: function(users) {
                            listOfNum = users;
                            //console.log(listOfNum.length);
                            /*
                             if (count == 0) {
                             //sendAutoText(listOfNum, message);
                             count = count + 1;
                             }
                             */
                        },
                        error: function (error) {
                            console.log(error);
                        }
                    });
                } else {
                    message = formatText(infoOfLevel);
                    console.log(message);
                }
            },
            error: function (error) {
                console.log(error);
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

    function sendNotification(inputs) {
        //console.log(inputs.to.length);
        for (var i = 0; i < inputs.to.length; i++) {
            $.post("/testsms",
                {
                    to: inputs.to[i],
                    message: inputs.body
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(data);
                    }
                });
        }
    }

    function sendAutoText(num, message) {
        var sendStr = message;
        for (var i = 0; i < num.length; i++) {
            $.post("/testsms",
                {
                    to: num[i].get('phoneNumber'),
                    message: sendStr
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(data.to);
                    }
                });
        }
    }

    function updateBarricadeStatus(barricades) {

        var queryN = new Parse.Query(Barricade);
        if (Object.keys(barricades).length == 0) {
            return '[This is a test] ALERT! Currently there are no flash floods.';
        }
        for (var key in barricades) {
            //var newStatus = new Barricade();
            queryN.equalTo("sensorId", key.toString());
            queryN.find({
                success: function (status) {
                    //console.log('here');
                    console.log('Current status of the barricade is: ' + key.toString() + '\n');
                },
                error: function (error) {
                    console.log(error);
                }
            });
        }
    }

    //function to print out content of the dictionary
    function printdict (dictionary) {
        for(var key in dictionary) {
            if (dictionary.hasOwnProperty(key)) {
                console.log(key + ": " + dictionary[key]);
            }
        }
        console.log("number of keys are " + Object.keys(dictionary).length);
    }
})