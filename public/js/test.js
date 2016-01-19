Parse.$ = jQuery;
Parse.initialize("OenLwqP21DFOVjeXg3HXsd4urWWNGSwxPgQMnknS", "S1I1VZppmxt1WiT2PHYMZBhuLTSqp2URZ8abTjWK");
var Barricade = Parse.Object.extend("Barricade");
var query = new Parse.Query(Barricade);
var barricades = {};
function initMap() {
  var myLatLng = {lat: 30, lng: 30};
  var mapCanvas = document.getElementById('map');
  var mapOptions = {
    center: new google.maps.LatLng(30, 30),
    zoom: 8,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  }
  query.find({
    success: function(results) {
      // results is an array of Parse.Object.
        //barricades = results;
      var map = new google.maps.Map(mapCanvas, mapOptions);
      var contentStr = [];
      for (var i = 0; i < results.length; i++) {
         var barricade = results[i];
          barricades[barricade.id] = barricade;
        var geox = barricade.get('location').latitude;
        var geoy = barricade.get('location').longitude;

        var contentString = '<div id="content">'+
            '<div id="siteNotice">'+
            '</div>'+
            '<h1 id="firstHeading" class="firstHeading">'+ barricade.id+ '</h1>'+
            '<div id="bodyContent">'+
            '<p>This is sensor #1</p>'+ barricade.get('bStatus')+'<br>'+
            '<button onclick="myFunction()">Sensor List</button>'+
            '<button onclick="overrideInside(this)" value='+ barricade.id + '>Change Barricade Status</button>'+
            '</div>'+
            '</div>';

        contentStr.push(contentString);
        var infowindow = new google.maps.InfoWindow({
          content: contentStr[i]
        });
        var marker = new google.maps.Marker({
          map: map,
          position:{lat: geox, lng: geoy},
          title: 'Hello World!'
        });

        (function(marker, i) {
          // add click event
          google.maps.event.addListener(marker, 'click', function() {
            infowindow.setContent(contentStr[i]);
            infowindow.open(map, marker);
          });
        })(marker, i);
        /*marker.addListener('click', function() {
         infowindow.open(map, marker);
         });*/
          var el = document.getElementById('overrideB');
          if(el){
              override();
          }
          /*document.getElementById("ovverideB").addEventListener("click", override);
          function override(){
              if(barricade.get('bStatus')== true){
                  barricade.set('bStatus',false);
              }
              else{
                  barricade.set('bStatus',true);
              }
          }*/
      }console.log(barricades);
    },
    error: function(error) {
      // error is an instance of Parse.Error.
    }
  });
}



function overrideInside(obj) {

    console.log(barricades[obj.value].get('bStatus'));
    var bsid = obj.value;
    if(barricades[obj.value].get('bStatus')==true){barricades[obj.value].set('bStatus',false);}
    else{barricades[obj.value].set('bStatus',true);}
    console.log(barricades[obj.value].get('bStatus'));
    barricades[obj.value].save();
}