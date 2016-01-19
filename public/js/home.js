//initialize lists and maps.
var Barricade = Parse.Object.extend("Barricade");
var barricades = [];
var barricadesMap = {};
var Sensor = Parse.Object.extend("Sensor");
var sensors = [];
var sensorMap = {};
var WaterLevel = Parse.Object.extend("WaterLevel");
/*query barricade information, initialize the map, and place all markers.
While placing markers, infowindow contains information about the barricade and current status of sensors.
More information about history data for specific sensor can be retrieved from a modal.*/
$(function(){
    var query = new Parse.Query(Barricade);
    query.find({
        success: function(results) {
            barricades = results;
            for (var i = 0; i < results.length; i++) {
                barricadesMap[results[i].id] = results[i];
            }
            initMap();
        },
        error: function(error) {
            console.error(error);
        }
    });
//This function initializes the map.
    function initMap(){
        var infoWindow = new google.maps.InfoWindow({
            maxWidth: 320
            /*pixelOffset: new google.maps.Size(0, 300)*/
        });
        var map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: new google.maps.LatLng(50, 30),
            zoom: 8,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        for(var i = 0; i < barricades.length; i++) {
            placeMarker(map, barricades[i], infoWindow);
        }
    }
//This function places the markers on the map.
    function placeMarker(map, barricade, infoWindow) {
        var latLng = new google.maps.LatLng( barricade.get('location').latitude, barricade.get('location').longitude);
        var marker = new google.maps.Marker({
            position : latLng,
            map      : map
        });
//important, add a listener for click event.
        google.maps.event.addListener(marker, 'click', function(){
            var queryS = new Parse.Query(Sensor);
            queryS.equalTo("barricadeId",barricade.id);
            queryS.find({
                success: function(results) {
                    sensors = results;
                    for (var i = 0; i < results.length; i++) {
                        sensorMap[results[i].id] = results[i];
                    }
                    var sensorTable = "";
                    for (var i = 0; i < sensors.length; i++) {
                        sensorTable = sensorTable +  '<tr><td>'+sensors[i].id+'</td><td><button type="button" class="btn btn-info btn-sm" ' +
                            'value= '+sensors[i].id+' onclick="historyDataToModal(this)">View Detail</button></td><td></tr>';
                    }
                    var contentString = '<div id="infoWindow">'+
                        '<h1 id="infoWindowHeading">'+ barricade.id+ '</h1>'+
                        '<div id="infoWindowBody">'+
                        '<p>Barricade status: </p>'+ barricade.get('bStatus')+'<br>'
                        +'<table id="mytable" class="table table-bordered">' +sensorTable +'</table>'
                        +'<button onclick="myFunction()">Sensor List</button>'+
                        '<button onclick="changeBarricadeStatus(this)" value='+ barricade.id + '>Change Barricade Status</button>'+
                        '</div>'+
                        '</div>';
                    infoWindow.close(); // Close previously opened infowindow
                    infoWindow.setContent(contentString);
                    infoWindow.open(map, marker);
                },
                error: function(error) {
                    console.error(error);
                }
            });
        });
        google.maps.event.addListener(map, "click", function() {
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
        success: function(barricade) {
        },
        error: function(error) {
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
                waterTable = waterTable + '<tr><td>'+timeStamp+'</td>'+'<td>'+currentWaterLevelStr+'</td></tr>';
            }
            document.getElementById("table-waterLevel").innerHTML = waterTable;
            $("#myModal").modal('show');
        },
        error: function (error) {
            console.error(error);
        }
    });
}



