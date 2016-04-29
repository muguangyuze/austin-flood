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
                console.log(redSensorList);
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
                var querySensor = new Parse.Query(Sensor);
                querySensor.equalTo("sensorId", sensorId);
                querySensor.find({
                    success: function (sensorResults){
                        if (wlResults.length == 0
                            || wlResults[0].get('waterLevel') == 0
                            || wlResults[0].get('waterLevel') <= threshold
                            || wlResults[0].get('hasError') == true || sensorResults[0].get('hasError') == true) {
                            redSensorList.push(sensorId);
                            markerList.unshift(sensorId);
                        } else {
                            greenSensorList.push(sensorId);
                            markerList.push(sensorId);

                        }
                        if (markerList.length == len) {
                            initMap();
                        }
                    }

                })

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
                            var lockBarricadeStatusBtn = "";
                            if (results == null || results.length == 0) {
                                sensorTable = '';
                            }
                            else {
                                currentBatteryLevel = results[0].get('batteryLevel');
                                currentValue = results[0].get('waterLevel');
                                sensorTable = sensorTable +'Current Sensor Reading is: '+ (currentValue*0.00328).toFixed(2) + ' ft'+'<br><button type="button" class="btn btn-link btn-sm" ' +
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
                                        ' >Send Notification to all subscribed users</button>';
                                    lockBarricadeStatusBtn =
                                        '<button onclick="changeLockStatus(this)" class="btn btn-link btn-sm" value=' + sensor.get('sensorId') +
                                        '>Switch between manual and automatic mode</button>';
                                }

                                //This contains the current waterlevel data,view history data button, and push notification feature.
                            }
                            var barricadeInfo = "";

                            var barricadeStatusinString;
                            if (barricadesMap[sensor.get('sensorId')].get('bStatus') == false){
                                barricadeStatusinString = 'open';
                            }
                            else {
                                barricadeStatusinString = 'closed';
                            }
                            var lockStatusinString;
                            if (barricadesMap[sensor.get('sensorId')].get('overrideStatus') == false){
                                lockStatusinString = 'in automatic mode.';
                            }
                            else {
                                lockStatusinString = 'in manual mode.';
                            }
                            if (typeof(barricadesMap[sensor.get('sensorId')]) != "undefined") {
                                var userExist = document.getElementById("userExist").innerHTML;
                                barricadeInfo = 'The barricade is currently ' + barricadeStatusinString+'<br>'
                                    ;
                                if (userExist == "true") {
                                    barricadeInfo = barricadeInfo
                                        + '<button onclick="changeBarricadeStatus(this)" class="btn btn-link btn-sm" value=' + barricadesMap[sensor.get('sensorId')].get('sensorId') +
                                        '>Change Barricade Status</button><br>';
                                        //This contains the barricade status change button and only viewable if a barricade is placed.
                                    var setValue = barricadesMap[sensor.get('sensorId')].get('sensorId');
                                    var lockBarricadeStatusBtn ='';
                                    if (barricadesMap[sensor.get('sensorId')].get('overrideStatus')) {
                                        lockBarricadeStatusBtn =
                                            '<form> <input type="radio" name="status" onclick="changeLockStatus(this)" id="true" checked value=' + setValue + '> Manual ' +
                                            '<input type="radio" name="status" onclick="changeLockStatus(this)" id="false" value=' + setValue + '> Automatic </form>';
                                    } else {
                                        lockBarricadeStatusBtn =
                                            '<form> <input type="radio" name="status" onclick="changeLockStatus(this)" id="true" value=' + setValue + '> Manual' +
                                            '<input type="radio" name="status" onclick="changeLockStatus(this)" id="false" checked value=' + setValue + '> Automatic </form>';

                                    }
                                }
                            }
                            else {
                                barricadeInfo = "There is no barricade at this location.";
                            }
                            var queryS = new Parse.Query(Sensor);
                            queryS.equalTo("sensorId", sensor.get('sensorId'));
                            queryS.first({
                                success: function (error) {
                                    var showSensorError = "";
                                    if (error.get('hasErrorOrFlood') == 1) {
                                        showSensorError = '<i class="material-icons" style="font-size:24px;color:orange">warning</i>'
                                    } else if (error.get('hasErrorOrFlood') == 2) {
                                        showSensorError = '<i class="material-icons" style="font-size:24px;color:red">warning</i>'
                                    }
                                    //else if (error.get('hasErrorOrFlood') == 3) {
                                    //    showSensorError = '<i class="material-icons" style="font-size:24px;color:yellow">warning</i>'
                                    //}
                                    var contentString = '<div id="infoWindow">' +
                                        '<h1 id="infoWindowHeading">' + sensor.get('placeName') + showSensorError + '</h1>' +
                                        '<div id="infoWindowBody">' + sensorTable +
                                        barricadeInfo + '<br>' +notificationBtn + '<br>' + subscribeBtn + unsubscribeBtn +
                                        '</div>' +
                                        '</div>';
                                    if (userExistFirst == "true"){
                                        contentString = '<div id="infoWindow">' +
                                            '<h1 id="infoWindowHeading">' + sensor.get('placeName') + showSensorError +'</h1>' +
                                            '<div id="infoWindowBody">' + sensorTable +
                                            barricadeInfo + 'The barricade is currently ' + lockStatusinString + '<br>'+ lockBarricadeStatusBtn + '<br>' + 'Current Battery Level is: ' + currentBatteryLevel + '(V)' + '<br>'+notificationBtn + '<br>' +
                                            '</div>' +
                                            '</div>';
                                    };
                                    infoWindow.close(); // Close previously opened infowindow
                                    infoWindow.setContent(contentString);
                                    infoWindow.open(map, marker);
                                }
                            });
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
                        alert('The barricade status has been changed, reopen the info-window to check!');
                    },
                    error: function (error) {
                        console.error(error);
                    }
                });
            }
        }
    })
}
function changeLockStatus(btn) {
    var queryBB = new Parse.Query(Barricade);
    var updateStatus = btn.id;
    queryBB.equalTo("sensorId",btn.value);
    queryBB.first({
        success:function(results){
            if (results == undefined || typeof(results) == "undefined") {
                return;
            } else {
                console.log(btn.value.toString());
                var currentStatus = results.get('overrideStatus');
                if (updateStatus.toString() != currentStatus.toString()) {
                    results.set('overrideStatus', !currentStatus);
                    results.save(null, {
                        success: function (barricade) {
                            //alert('The barricade is locked:' + results.get('overrideStatus'));
                        },
                        error: function (error) {
                            console.error(error);
                        }
                    });
                }
            }
        }
    });
}
//This function queries waterlevel data and send it to modal with a table format.
function historyDataToModal(btn) {
    console.log("here");
    var sensorId = btn.value;
    var queryW = new Parse.Query(WaterLevel);

    queryW.equalTo("sensorId", sensorId);
    queryW.descending("createdAt");
    queryW.limit(1000);
    queryW.find({
        success: function (results) {

            var waterLevels = results;
            var downloadDataResult = waterLevels;
            var waterLevelsMap = {};
            for (var i = 0; i < results.length; i++) {
                waterLevelsMap[results[i].id] = results[i];
            }
            var waterTable = "<tr><td>Update Time</td><td>Sensor Reading (mm)</td><td>Sensor Reading (ft)</td></tr>";
            for (var i = 0; i < waterLevels.length && i < 8; i++) {
                //i < waterLevels.length
                var waterLevel = waterLevels[i];
                var currentWaterLevelStr = waterLevel.get('waterLevel').toString();
                var timeStamp = waterLevel.createdAt.toLocaleString();
                waterTable = waterTable + '<tr><td>' + timeStamp + '</td>' + '<td>' + currentWaterLevelStr
                    +'</td><td>'+ (Number(currentWaterLevelStr)*0.00328).toFixed(2); + '</td></tr>';
            }
            var queryName = new Parse.Query(Sensor);
            queryName.equalTo("sensorId",sensorId);
            queryName.find({
                success: function (results){
                    var name = results[0].get('placeName');
                    var criticalLevelInPlot = results[0].get('criticalLevel');
                    document.getElementById("historyDataTitle").innerHTML = name;
                    waterTable = waterTable + name;
                    //console.log(results);
                    console.log(name);
                    var waterLevelPlot = [];
                    var timeStampPlot = [];
                    var sampleDataSet = [];
                    var criticalDataSet = [];

                    for (var i = 0; (i < waterLevels.length)&&(i<1440); i++) {
                        waterLevelPlot.push(waterLevels[i].get('waterLevel').toString());
                        timeStampPlot.push(waterLevels[i].createdAt.toJSON());
                        //sample start
                        var criticalDataEntry = [];
                        var sampleDataEntry = [];
                        var currentDate = waterLevels[i].createdAt;
                        sampleDataEntry.push(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(),
                            currentDate.getUTCHours(), currentDate.getUTCMinutes(), currentDate.getUTCSeconds()));
                        sampleDataEntry.push(waterLevels[i].get('waterLevel'));
                        sampleDataSet.push(sampleDataEntry);

                        criticalDataEntry.push(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(),
                            currentDate.getUTCHours(), currentDate.getUTCMinutes(), currentDate.getUTCSeconds()));
                        criticalDataEntry.push(criticalLevelInPlot);
                        criticalDataSet.push(criticalDataEntry);



                    }
                    $(function () {
                        Highcharts.setOptions({
                            global: {
                                useUTC: false
                            }
                        });
                        $('#tester').highcharts({
                            chart: {
                                type: 'spline'
                            },
                            title: {
                                text: name
                            },

                            xAxis: {
                                type: 'datetime',
                                dateTimeLabelFormats: {
                                    //second: '%Y-%m-%d<br/>%H:%M:%S',
                                    minute: '%Y-%m-%d<br/>%H:%M',
                                    //hour: '%Y-%m-%d<br/>%H:%M',
                                    //day: '%Y<br/>%m-%d',
                                    //week: '%Y<br/>%m-%d',
                                    //month: '%Y-%m',
                                    //year: '%Y'
                                },
                                title: {
                                    text: 'Date'
                                }
                            },
                            yAxis: {
                                reversed: true,
                                title: {
                                    text: 'Sensor Reading (mm)'
                                }

                            },
                            tooltip: {
                                type: 'datetime',
                                //headerFormat: '<b>{series.name}</b><br>',
                                //pointFormat: '{point.x:%e. %b}: {point.y:.2f} mm',
                                dateTimeLabelFormats: {
                                    //second: '%Y-%m-%d<br/>%H:%M:%S',
                                    //second:"%A, %b %e, %H:%M:%S",
                                    minute:"%A, %b %e, %H:%M"
                                },

                            },
                            /*tooltip: {

                            },*/

                            /*plotOptions: {
                                spline: {
                                    marker: {
                                        enabled: true
                                    }
                                }
                            },*/
                            plotOptions: {
                                spline: {
                                    lineWidth: 4,
                                    states: {
                                        hover: {
                                            lineWidth: 5
                                        }
                                    },
                                    marker: {
                                        enabled: false
                                    },
                                }
                            },

                            series: [{
                                name: 'Sensor Reading (mm)',
                                // Define the data points. All series have a dummy year
                                // of 1970/71 in order to be compared on the same x axis. Note
                                // that in JavaScript, months start at 0 for January, 1 for February etc.
                                data: sampleDataSet
                            },
                                {
                                    name: 'Critical Level (mm)',
                                    data:criticalDataSet,
                                    dashStyle: 'longdash'
                                }
                            ]
                        });
                    });

                },
                error: function (error) {
                    console.error(error);
                }

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
    var criticalInput = Number(document.getElementById("criticalInput").value);
    var warningInput = Number(document.getElementById("warningInput").value);
    var placeNameInput = document.getElementById("placeNameInput").value;
    var errorDelta = Number(document.getElementById("deviationInput").value);
    //var geoPoint = new Parse.GeoPoint({latitude:geoX, longitude:geoY});

    sensor.save({
        sensorId: sensorIdInput,

        placeName: placeNameInput,
        criticalLevel: criticalInput,
        warningLevel: warningInput,
        errorDelta: errorDelta,
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
        bStatus: true,
        overrideStatus: false,
        //manualChangedAt: Date()
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
function sendNotification(text, id) {
    var listOfNum = [];
    var queryN = new Parse.Query(Parse.User);
    //queryN.equalTo("phoneNumber", "+15103966032");
    queryN.find({
        success: function (users) {
            listOfNum = users;
            //console.log(listOfNum.length);
            for (var i = 0; i < listOfNum.length; i++) {
                //if (listOfNum[i] != undefined && typeof(listOfNum[i] != "undefined") && listOfNum[i].get('phoneNumber').length != 0){
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
                //}
            }
        },
        error: function (error) {
            console.log(error);
        }
    });
}

function sendPublicNotification (text, sensorId) {
    var queryP = new Parse.Query(Subscribe);

    queryP.equalTo("sensorId", sensorId);
    queryP.equalTo("isVerified", true);
    queryP.find({
        success: function (public) {
            listofPub = public;
            //res.error("have the numbers");
            for (var i = 0; i < listofPub.length; i++) {
                //if (listofPub[i] != undefined && typeof(listofPub[i] != "undefined") && listofPub[i].get('phoneNumber').length != 0){
                $.post("/testsms",
                    {
                        to: listofPub[i].get('phoneNumber'),
                        message: text//"Hello!"
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(data);
                        }
                    });
                //}
            }
            alert("text sent out to all users");
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
                    sendNotification(message, sensor.value);
                    sendPublicNotification(message, sensor.value);
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
        var line = Number(array[i]['sensorId'])+','+array[i]['waterLevel']+','+array[i]['createdAt']+'\n';
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
function resetCaptcha(){
    grecaptcha.reset();
}
$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});