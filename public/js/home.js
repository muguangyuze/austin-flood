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
/*query barricade information, initialize the map, and place all markers.
 While placing markers, infowindow contains information about the barricade and current status of sensors.
 More information about history data for specific sensor can be retrieved from a modal.*/
$(function () {
    var query = new Parse.Query(Sensor);
    query.find({
        success: function (results) {
            sensors = results;
            for (var i = 0; i < results.length; i++) {
                sensorMap[results[i].get('sensorId')] = results[i];
            }
            initMap();

        },
        error: function (error) {
            console.error(error);
        }
    });
//This function initializes the map.
    function initMap() {
        var infoWindow = new google.maps.InfoWindow({
            maxWidth: 320
            /*pixelOffset: new google.maps.Size(0, 300)*/
        });
        var map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: new google.maps.LatLng(30, 30),
            zoom: 8,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        for (var i = 0; i < sensors.length; i++) {
            placeMarker(map, sensors[i], infoWindow);
        }
    }

//This function places the markers on the map.
    function placeMarker(map, sensor, infoWindow) {
        var latLng = new google.maps.LatLng(sensor.get('location').latitude, sensor.get('location').longitude);
        var marker = new google.maps.Marker({
            position: latLng,
            map: map
        });
//important, add a listener for click event.
        google.maps.event.addListener(marker, 'click', function () {
            var queryB = new Parse.Query(Barricade);
            queryB.equalTo("sensorId", sensor.get('sensorId'));
            queryB.find({
                success: function (results) {
                    barricades = results;
                    for (var i = 0; i < results.length; i++) {
                        barricadesMap[results[i].id] = results[i];
                    }
                    var sensorTable = "";
                    var currentValue = 0;
                    var queryW = new Parse.Query(WaterLevel);
                    queryW.equalTo("sensorId", sensor.get('sensorId'));
                    queryW.descending("createdAt");
                    queryW.find({
                        success: function (results) {
                            waterLevels = results;

                            if (results == null || results.length == 0) {
                                sensorTable = '';
                            }
                            else {
                                currentValue = results[0].get('waterLevel');
                                sensorTable = sensorTable + '<td>' + currentValue + '</td><td><button type="button" class="btn btn-info btn-sm" ' +
                                    'value= ' + sensor.get('sensorId') + ' onclick="historyDataToModal(this)">View History Data</button></td>'+ '<p></p>'+
                                '<button id = "pushNotification" onclick="sendNotification()" type="button"'+
                                'class="btn btn-info btn-sm" value=' + sensor.get('sensorId') +
                                    ' >Send Notification</button>';
                                //This contains the current waterlevel data,view history data button, and push notification feature.
                            }
                            var barricadeInfo = "";


                            if (typeof(barricadesMap[sensor.get('sensorId')]) != "undefined") {
                                var userExist = document.getElementById("userExist").innerHTML;
                                barricadeInfo = '<p>Barricade status: </p>' + barricadesMap[sensor.get('sensorId')].get('bStatus') + '<br>'
                                    + '<table id="mytable" class="table table-bordered">' + sensorTable + '</table>';
                                if (userExist == "true") {
                                    barricadeInfo = barricadeInfo
                                        + '<button onclick="changeBarricadeStatus(this)" class="btn btn-info btn-sm" value=' + barricadesMap[sensor.get('sensorId')].id +
                                        '>Change Barricade Status</button>';
                                        //This contains the barricade status change button and only viewable if a barricade is placed.
                                }
                            }
                            else {
                                barricadeInfo = "There is no barricade at this location.";
                            }
                            var contentString = '<div id="infoWindow">' +
                                '<h1 id="infoWindowHeading">' + sensor.get('sensorId') + '</h1>' +
                                '<div id="infoWindowBody">' +
                                barricadeInfo +
                                '</div>' +
                                '</div>';
                            infoWindow.close(); // Close previously opened infowindow
                            infoWindow.setContent(contentString);
                            infoWindow.open(map, marker);
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
    var currentStatus = barricade.get('bStatus');
    barricade.set('bStatus', !currentStatus);
    barricade.save(null, {
        success: function (barricade) {
        },
        error: function (error) {
            console.error(error);
        }
    });
}
//This function queries waterlevel data and send it to modal with a table format.
function historyDataToModal(btn) {
    console.log("here");
    var sensorId = btn.value;
    var queryW = new Parse.Query(WaterLevel);
    queryW.equalTo("sensorId", sensorId);
    queryW.find({
        success: function (results) {
            var waterLevels = results;
            var waterLevelsMap = {};
            for (var i = 0; i < results.length; i++) {
                waterLevelsMap[results[i].id] = results[i];
            }
            var waterTable = "<tr><td>Update Time</td><td>WaterLevel</td></tr>";
            for (var i = 0; i < waterLevels.length; i++) {
                var waterLevel = waterLevels[i];
                var currentWaterLevelStr = waterLevel.get('waterLevel').toString();
                var timeStamp = waterLevel.createdAt;
                waterTable = waterTable + '<tr><td>' + timeStamp + '</td>' + '<td>' + currentWaterLevelStr + '</td></tr>';
            }
            document.getElementById("table-waterLevel").innerHTML = waterTable;
            $("#myModal").modal('show');
        },
        error: function (error) {
            console.error(error);
        }
    });
}
//This function is called from the add sensor button, will only invoke the modal/form.
function addAnotherSensor(){
    $("#addSensorModal").modal('show');
}
//This function is called from the submit button inside the modal. This will submit and register a new sensor form.
function submitAnotherSensor(){
    var sensor = new Sensor();
    var sensorIdInput = document.getElementById("sensorIdInput").value;
    var geoX = Number(document.getElementById("geoX").value);
    var geoY = Number(document.getElementById("geoY").value);
    var arduinoIdInput = document.getElementById("arduinoIdInput").value;
    //var geoPoint = new Parse.GeoPoint({latitude:geoX, longitude:geoY});

    sensor.save({
        sensorId: sensorIdInput,
        arduino: arduinoIdInput,
        location: {
            "__type": "GeoPoint",
            "latitude": geoX,
            "longitude": geoY
        },
        //location: geoPoint
    }, {
        success: function(gameScore) {
            // The object was saved successfully.
            alert('Save.')
            window.location.reload();//This will reload the entire page. Not sure if this is the optimal plan.
        },
        error: function(gameScore, error) {
            // The save failed.
            // error is a Parse.Error with an error code and message.
            alert('Did not save.')
        }
    });
}
function sendNotification() {
    alert('here');
    $.post("/sendSMS",
        {message:"hahaha"},
        function (data, status) {
            alert("Data: " + data + "\nStatus: " + status);
        });
}

