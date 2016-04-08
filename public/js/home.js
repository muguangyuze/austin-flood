//initialize lists and maps.
var Barricade = Parse.Object.extend("Barricade");
var barricades = [];
var barricadesMap = {};
var Sensor = Parse.Object.extend("Sensor");
var sensors = [];
var sensorMap = {};
var WaterLevel = Parse.Object.extend("WaterLevel");
var user = new Parse.User();
var currentUser = Parse.User.current();
var waterLevels = [];
var waterLevelMap = {};
var redSensorList = [];
var greenSensorList = [];
var markerList = []; // a list of sensorId
var markerMap ={};
var message = "";
var jsonObject;
var Subscribe = Parse.Object.extend("Subscription");
/*query barricade information, initialize the map, and place all markers.
 While placing markers, infowindow contains information about the barricade and current status of sensors.
 More information about history data for specific sensor can be retrieved from a modal.*/

$(function () {
    var query = new Parse.Query(Sensor);
    // find all sensors
    query.find({
        success: function (results) {
            for (var i = 0; i < results.length; i++) {
                var len = results.length;
                var sensorId = results[i].get('sensorId');
                var threshold = results[i].get('criticalLevel');
                var initMapNow = (i == results.length - 1);
                sensors.push(results[i]);
                sensorMap[sensorId] = results[i];
                queryWaterLevelForSensor(sensorId, threshold, len);
            }
        },
        error: function (error) {
            console.error(error);
        }
    });

    function queryWaterLevelForSensor(sensorId, threshold, len){
        var queryWaterLevel = new Parse.Query(WaterLevel);
        queryWaterLevel.equalTo("sensorId", sensorId);
        queryWaterLevel.descending("createdAt");
        queryWaterLevel.find({
            success: function(wlResults) {
                if (wlResults.length == 0
                    || wlResults[0].get('waterLevel') == 0
                    || wlResults[0].get('waterLevel') <= threshold) {
                    redSensorList.push(sensorId);
                    markerList.unshift(sensorId);
                } else {
                    greenSensorList.push(sensorId);
                    markerList.push(sensorId);

                }
                if (markerList.length == len) {
                    initMap();
                }
            },
            error: function (error) {
                console.error(error);
            }
        });
    }

    //This function initializes the map.
    function initMap() {
        var infoWindow = new google.maps.InfoWindow({
            maxWidth: 320
            /*pixelOffset: new google.maps.Size(0, 300)*/
        });
        var map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: new google.maps.LatLng(30.36, -97.73),
            zoom: 10,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        for (var i = 0; i < markerList.length; i++) {
            placeMarker(map, sensorMap[markerList[i]], infoWindow, i);
        }
    }

    //This function places the markers on the map.
    function placeMarker(map, sensor, infoWindow, counter) {
        var latLng = new google.maps.LatLng(sensor.get('location').latitude, sensor.get('location').longitude);
        if (counter < redSensorList.length) {
            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            })
        }
        else {
            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            })
        }

//important, add a listener for click event.
        google.maps.event.addListener(marker, 'click', function () {
            var queryB = new Parse.Query(Barricade);
            queryB.equalTo("sensorId", sensor.get('sensorId'));
            queryB.find({
                success: function (results) {
                    barricades = results;
                    for (var i = 0; i < results.length; i++) {
                        barricadesMap[results[i].get('sensorId')] = results[i];
                    }
                    var sensorTable = "";
                    var currentValue = 0;
                    var currentBatteryLevel = 0;
                    var queryW = new Parse.Query(WaterLevel);
                    queryW.equalTo("sensorId", sensor.get('sensorId'));
                    console.log(queryW);
                    queryW.descending("createdAt");
                    queryW.find({
                        success: function (results) {
                            waterLevels = results;
                            var notificationBtn = "";
                            var subscribeBtn;
                            if (results == null || results.length == 0) {
                                sensorTable = '';
                            }
                            else {
                                currentBatteryLevel = results[0].get('batteryLevel');
                                currentValue = results[0].get('waterLevel');
                                sensorTable = sensorTable +'Current water level Reading is: '+ currentValue + ' mm'+'<br><button type="button" class="btn btn-link btn-sm" ' +
                                    'value= ' + sensor.get('sensorId') + ' onclick="historyDataToModal(this)">View History Data</button>'+'<br>'
                                ;
                                subscribeBtn = '<button id = "subscribe" type="button" onclick="addNewSubscription(this)"'+
                                    'class="btn btn-link btn-sm" value=' + sensor.get('sensorId') +
                                    ' >Subscribe</button>';
                                var unsubscribeBtn ='<button id = "unsubscribe" type="button" onclick="removeSubs(this)"'+
                                    'class="btn btn-link btn-sm" value=' + sensor.get('sensorId') +
                                    ' >Unsubscribe</button>';
                                var userExistFirst = document.getElementById("userExist").innerHTML;
                                if (userExistFirst == "true"){
                                    notificationBtn =
                                        '<button id = "pushNotification" onclick="getSensorInfo(this)" type="button"'+
                                        'class="btn btn-link btn-sm" value=' + sensor.get('sensorId') +
                                        ' >Send Notification</button>';
                                }

                                //This contains the current waterlevel data,view history data button, and push notification feature.
                            }
                            var barricadeInfo = "";


                            if (typeof(barricadesMap[sensor.get('sensorId')]) != "undefined") {
                                var userExist = document.getElementById("userExist").innerHTML;
                                barricadeInfo = 'Barricade Lowered:  ' + barricadesMap[sensor.get('sensorId')].get('bStatus')+'<br>'
                                    ;
                                if (userExist == "true") {
                                    barricadeInfo = barricadeInfo
                                        + '<button onclick="changeBarricadeStatus(this)" class="btn btn-link btn-sm" value=' + barricadesMap[sensor.get('sensorId')].get('sensorId') +
                                        '>Change Barricade Status</button>';
                                        //This contains the barricade status change button and only viewable if a barricade is placed.
                                }
                            }
                            else {
                                barricadeInfo = "There is no barricade at this location.";
                            }
                            var queryS = new Parse.Query(Sensor);
                            queryS.equalTo("sensorId", sensor.get('sensorId'));
                            queryS.first({
                                success: function (error) {
                                    var showError =""
                                    if (error.get('hasError') == true) {
                                        showError = '<i class="material-icons" style="font-size:24px;color:red">warning</i>'
                                    }
                                    var contentString = '<div id="infoWindow">' +
                                        '<h1 id="infoWindowHeading">' + sensor.get('placeName') + showError + '</h1>' +
                                        '<div id="infoWindowBody">' + sensorTable +
                                        barricadeInfo +'<br>' +notificationBtn + '<br>' + subscribeBtn + unsubscribeBtn +
                                        '</div>' +
                                        '</div>';
                                    if (userExistFirst == "true"){
                                        contentString = '<div id="infoWindow">' +
                                            '<h1 id="infoWindowHeading">' + sensor.get('placeName') + showError +'</h1>' +
                                            '<div id="infoWindowBody">' + sensorTable +
                                            barricadeInfo +'<br>' + 'Current Battery Level is: ' + currentBatteryLevel + '<br>'+notificationBtn + '<br>' +
                                            '</div>' +
                                            '</div>';
                                    };
                                    infoWindow.close(); // Close previously opened infowindow
                                    infoWindow.setContent(contentString);
                                    infoWindow.open(map, marker);
                                }
                            });
                            /*var contentString = '<div id="infoWindow">' +
                                '<h1 id="infoWindowHeading">' + sensor.get('placeName') + '</h1>' +
                                '<div id="infoWindowBody">' + '<table id="mytable" class="table table-bordered">' + sensorTable + '</table>'+
                                barricadeInfo +'<br>' +notificationBtn + '<br>' + subscribeBtn + unsubscribeBtn +
                                '</div>' +
                                '</div>';
                            if (userExistFirst == "true"){
                                contentString = '<div id="infoWindow">' +
                                    '<h1 id="infoWindowHeading">' + sensor.get('placeName') + '</h1>' +
                                    '<div id="infoWindowBody">' + '<table id="mytable" class="table table-bordered">' + sensorTable + '</table>'+
                                    barricadeInfo +'<br>' +notificationBtn + '<br>' +
                                    '</div>' +
                                    '</div>';
                            }
                            infoWindow.close(); // Close previously opened infowindow
                            infoWindow.setContent(contentString);
                            infoWindow.open(map, marker);*/
                        }
                    })
                },
                error: function (error) {
                    console.error(error);
                }
            });
        });
        google.maps.event.addListener(map, "click", function () {
            infoWindow.close();
        });
    }

});

//This function flips the barricade status.
function changeBarricadeStatus(btn) {
    var barricade = barricadesMap[btn.value];
    var queryBB = new Parse.Query(Barricade);
    queryBB.equalTo("sensorId",barricade.get('sensorId'));
    queryBB.find({
        success:function(results){
            var barricadeUnderSameSensors = results;
            var barricadeUnderSameSensorMap = {};
            /*for (var i=0; i < results.length; i++){
                barricadeUnderSameSensorMap[results]
            }*/
            for (var i = 0; i < barricadeUnderSameSensors.length; i++){
                var barricadeUnderSameSensor = barricadeUnderSameSensors[i];
                var currentStatus = barricadeUnderSameSensor.get('bStatus');
                barricadeUnderSameSensor.set('bStatus', !currentStatus);
                barricadeUnderSameSensor.save(null, {
                    success: function (barricade) {
                    },
                    error: function (error) {
                        console.error(error);
                    }
                });
            }
        }
    })
}
//This function queries waterlevel data and send it to modal with a table format.
function historyDataToModal(btn) {
    console.log("here");
    var sensorId = btn.value;
    var queryW = new Parse.Query(WaterLevel);
    queryW.equalTo("sensorId", sensorId);
    queryW.descending("createdAt");
    queryW.find({
        success: function (results) {
            var waterLevels = results;
            var downloadDataResult = waterLevels;
            var waterLevelsMap = {};
            for (var i = 0; i < results.length; i++) {
                waterLevelsMap[results[i].id] = results[i];
            }
            var waterTable = "<tr><td>Update Time</td><td>WaterLevel (mm)</td></tr>";
            for (var i = 0; i < waterLevels.length && i < 8; i++) {
                //i < waterLevels.length
                var waterLevel = waterLevels[i];
                var currentWaterLevelStr = waterLevel.get('waterLevel').toString();
                var timeStamp = waterLevel.createdAt;
                waterTable = waterTable + '<tr><td>' + timeStamp + '</td>' + '<td>' + currentWaterLevelStr + '</td></tr>';
            }
            var waterLevelPlot = [];
            var timeStampPlot = [];
            var sampleDataSet = [];
            for (var i = 0; i < waterLevels.length; i++) {
                 waterLevelPlot.push(waterLevels[i].get('waterLevel').toString());
                 timeStampPlot.push(waterLevels[i].createdAt.toJSON());
                //sample start
                var sampleDataEntry = [];
                var currentDate = waterLevels[i].createdAt;
                sampleDataEntry.push(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(),
                    currentDate.getUTCHours(), currentDate.getUTCMinutes(), currentDate.getUTCSeconds()));
                sampleDataEntry.push(waterLevels[i].get('waterLevel'));
                sampleDataSet.push(sampleDataEntry);
            }


            $(function () {
                $('#tester').highcharts({
                    chart: {
                        type: 'spline'
                    },
                    title: {
                        text: 'History Data Plot'
                    },

                    xAxis: {
                        type: 'datetime',
                        dateTimeLabelFormats: { // don't display the dummy year
                            month: '%e. %b',
                            year: '%b'
                        },
                        title: {
                            text: 'Date'
                        }
                    },
                    yAxis: {
                        title: {
                            text: 'Flood Level (mm)'
                        }

                    },
                    tooltip: {
                        headerFormat: '<b>{series.name}</b><br>',
                        pointFormat: '{point.x:%e. %b}: {point.y:.2f} mm'
                    },

                    plotOptions: {
                        spline: {
                            marker: {
                                enabled: true
                            }
                        }
                    },

                    series: [{

                        // Define the data points. All series have a dummy year
                        // of 1970/71 in order to be compared on the same x axis. Note
                        // that in JavaScript, months start at 0 for January, 1 for February etc.
                        data: sampleDataSet
                    }
                    ]
                });
            });

            document.getElementById("table-waterLevel").innerHTML = waterTable;
            $("#myModal").modal('show');

                    // Create Object
            var items = downloadDataResult;


                // Convert Object to JSON
             jsonObject = JSON.stringify(items);


                // Convert JSON to CSV & Display CSV
            var csvObject = "text/csv;charset=utf-8," + encodeURIComponent(ConvertToCSV(jsonObject));




            var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(downloadDataResult));
            document.getElementById("downloadDataDiv").innerHTML = '<a href="data:' + csvObject + '" download="HistoryData.csv" class="btn btn-success" >Download All History Data</a>';


        },
        error: function (error) {
            console.error(error);
        }
    });
}

function addNewVerification(){
    $("#codeVerification").modal('show');
}
//This function is called from the add sensor button, will only invoke the modal/form.
function addAnotherSensor(){
    $("#addSensorModal").modal('show');
}
function addAnotherBarricade(){
    $("#addBarricadeModal").modal('show');
}
//This function is called from the submit button inside the modal. This will submit and register a new sensor form.
function submitAnotherSensor(){
    var sensor = new Sensor();
    var sensorIdInput = document.getElementById("sensorIdInput").value;
    var geoX = Number(document.getElementById("geoX").value);
    var geoY = Number(document.getElementById("geoY").value);
    var criticalInput = Number(document.getElementById("criticalInput"))
    var warningInput = Number(document.getElementById("warningInput").value);
    var placeNameInput = document.getElementById("placeNameInput").value;
    //var geoPoint = new Parse.GeoPoint({latitude:geoX, longitude:geoY});

    sensor.save({
        sensorId: sensorIdInput,

        placeName: placeNameInput,
        criticalLevel: criticalInput,
        warningLevel: warningInput,
        location: {
            "__type": "GeoPoint",
            "latitude": geoX,
            "longitude": geoY
        },
        //location: geoPoint
    }, {
        success: function(gameScore) {
            // The object was saved successfully.
            alert('A new sensor is added to the system.');
            window.location.reload();//This will reload the entire page. Not sure if this is the optimal plan.
        },
        error: function(gameScore, error) {
            // The save failed.
            // error is a Parse.Error with an error code and message.
            alert('Did not save. Please check the information you entered!');
        }
    });
}
function submitAnotherBarricade(){
    var barricade = new Barricade();
    var barricadeIdInput = document.getElementById("barricadeIdInput").value;



    var correspondingSensorIdInput = document.getElementById("correspondingSensorIdInput").value;
    //var geoPoint = new Parse.GeoPoint({latitude:geoX, longitude:geoY});

    barricade.save({
        arduinoIdBarricade: barricadeIdInput,
        sensorId: correspondingSensorIdInput,
        bStatus: true


    }, {
        success: function(gameScore) {
            // The object was saved successfully.
            alert('A new barricade is added to the system.');
            window.location.reload();//This will reload the entire page. Not sure if this is the optimal plan.
        },
        error: function(gameScore, error) {
            // The save failed.
            // error is a Parse.Error with an error code and message.
            alert('Did not save. Please check the information you entered!');
        }
    });
}
function sendNotification(text) {
    var listOfNum = [];
    var queryN = new Parse.Query(Parse.User);
    queryN.equalTo("phoneNumber", "+15103966032");
    queryN.find({
        success: function (users) {
            listOfNum = users;
            //console.log(listOfNum.length);

            for (var i = 0; i < listOfNum.length; i++) {
                $.post("/testsms",
                    {
                        to: listOfNum[i].get('phoneNumber'),
                        message: text//"Hello!"
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(data);
                        }
                    });
            }
        },
        error: function (error) {
            console.log(error);
        }
    });
}

function getSensorInfo (sensor) {
    //console.log(sensor.value.toString());
    var queryText = new Parse.Query(Sensor);
    queryText.equalTo("sensorId", sensor.value);
    queryText.first({
        success: function (result) {
            console.log(result.get('placeName'));
            message = message + result.get('placeName').toString() + ": ";

            var queryLevel = new Parse.Query(WaterLevel);
            queryLevel.equalTo("sensorId", sensor.value);
            queryLevel.first({
                success: function (info) {
                    console.log(info.get('waterLevel').toString());
                    message += info.get('waterLevel').toString();
                    console.log(message);
                    sendNotification(message);
                }
            });
        }

    });
}

function addNewSubscription(sensorId){
    var sensor = document.getElementById("sensorId");
    sensor.value = sensorId.value;

    var id = sensorId.value;
    var place = "";
    var queryP = new Parse.Query(Sensor);
    queryP.equalTo("sensorId", id);
    queryP.first({
        success: function (sensor) {
            place = document.getElementById("sensorLoc");
            place.value = sensor.get('placeName');
        }
    });
    $("#addNewSubscription").modal('show');
}

function verifySubscription(){
    var verifyCodeInput = document.getElementById("verifyCodeInput").value;
    //console.log(verifyCodeInput);
    var querySub = new Parse.Query(Subscribe);

    if (verifyCodeInput.length < 4) {
        alert('Please enter a valid verification code.');
    } else {
        querySub.equalTo("verificationCode", verifyCodeInput);
        querySub.first({
            success: function (result) {
                if (result == undefined){
                    alert('Please enter the correct verification code.')
                }
                else if (result.get('isVerified') == true) {
                    alert('You have already completed verification for this subscription');
                } else {
                    result.set('isVerified', true);
                    result.save(null, {
                        success: function (success) {
                            console.log("here");
                            alert('You have just verified your subscription.');
                            window.location.reload();
                        },
                        error: function (result, error) {
                            alert('Did not save.');
                        }
                    });
                }
            }
        });
    }
}

function sendVerificationCode() {
    var subscribe = new Subscribe();
    var sensorId = document.getElementById("sensorId").value;
    var place = document.getElementById("sensorLoc").value;
    var phoneNumInput = document.getElementById("phoneNumInput").value;
    var codeNo = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    var response = grecaptcha.getResponse();

    if(response.length == 0) {
        document.getElementById('captcha').innerHTML="Please check the Captcha.";
    } else {
        var queryVer = new Parse.Query(Subscribe);
        if (phoneNumInput.length < 10) {
            alert('Please enter a valid phone number.');
        } else {
            queryVer.equalTo("phoneNumber", "+1" + phoneNumInput);
            queryVer.equalTo("sensorId", sensorId);
            queryVer.first({
                success: function (exists) {
                    if (typeof(exists) != "undefined") {
                        alert('You have already subscribed for this sensor');
                    } else {
                        subscribe.save({
                            sensorId: sensorId,
                            phoneNumber: "+1" + phoneNumInput,
                            verificationCode: codeNo.toString(),
                            isVerified: false
                        }, {
                            success: function (result) {
                                $.post("/testsms",
                                    {
                                        to: "+1" + phoneNumInput,
                                        message: codeNo.toString()
                                    },
                                    function (err, data) {
                                        alert('A verification code has been sent to your phone.');
                                            window.location.reload();
                                    });

                            },
                            error: function (result, error) {
                                alert('Did not save.');
                            }
                        });
                    }
                }
            });
        }
    }
}
// JSON to CSV Converter
function ConvertToCSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    for (var i = 0; i < array.length; i++) {
        /*var line = '';
        for (var index in array[i]) {
            if (line != '') line += ','

            line += array[i][index];
        }

        str += line + '\n ';*/
        var title = 'Sensor Id'+','+'Water Level' +',' + 'Upload Time' +'\n';
        var line = array[i]['sensorId']+','+array[i]['waterLevel']+','+array[i]['createdAt']+'\n';
        str += line;
    }
    str = title + str;
    return str;
}
function removeSubs(sensorId) {
    var sensor = document.getElementById("sensId");
    sensor.value = sensorId.value;

    var id = sensorId.value;
    var place = "";
    var queryP = new Parse.Query(Sensor);
    queryP.equalTo("sensorId", id);
    queryP.first({
        success: function (sensor) {
            place = document.getElementById("sensLoc");
            place.value = sensor.get('placeName');
        }
    });
    $("#removeSensorSubscription").modal('show');
}
function removeSubscription(){
    var sensorId = document.getElementById("sensId").value;
    var phoneNumInput = document.getElementById("phoneNumIn").value;

    var querySub = new Parse.Query(Subscribe);
    if (phoneNumInput.length < 10) {
        alert('Please enter a valid phone number.');
    } else {
        querySub.equalTo("phoneNumber", "+1"+phoneNumInput);
        querySub.equalTo("sensorId", sensorId);
        querySub.first({
            success: function (exists) {
                if (exists == undefined) {
                    alert('You were not subscribed for this sensor.');
                } else {
                    exists.destroy({
                        success: function (result) {
                            alert('You have unsubscribed successfully.');
                            window.location.reload();
                        },
                        error: function (result, error) {
                            alert('There was an error please retry.');
                        }
                    });
                }
            }
        });
    }
}