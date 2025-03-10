// Lab 1: pace-time Prop Symbol Maps w/ Leaflet



//Set the mapbox key
var accessToken = 'pk.eyJ1Ijoia2Nyb3dlYmFzc3BybyIsImEiOiJjbG8wZnJwMXgxNW1lMnNwZGF4M295bzhiIn0.HH0mKHddBIow2AdY707JMA';

//declare map  and minValue vars in global scope
var map;
var minValue;
var dataStats = {};

//function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('map', {
        center: [26.55, -81.8],
        zoom: 10
    });


    // Tiles are 512x512 pixels and are offset by 1 zoom level
    L.tileLayer(
        'https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=' + accessToken, {
            tileSize: 512,
            zoomOffset: -1,
            attribution: '© <a href="https://www.mapbox.com/contribute/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

    // add search box
    L.Control.geocoder().addTo(map);

    //call getData function
    getData(map);
};

function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each zip code
    for(var zipCode of data.features){
        //loop through each month
        for(var month = 1; month <= 8; month+=1){
              //get rent for the current month
              var value = zipCode.properties["rent_month_"+ String(month)];

              //add value to array
              allValues.push(value);
        }
    }
    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    console.log(dataStats.min);
    console.log(dataStats.max);
    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length;
    console.log(dataStats.mean);

    // check datastats
    console.log(dataStats);
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 3;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,2.5) * minRadius

    return radius;
};


//PopupContent constructor function
function PopupContent(properties, attribute){
    this.properties = properties;
    this.attribute = attribute;
    this.month = attribute.split("month_")[1];
    this.rent = this.properties[attribute];
    this.formatted = "<p><b>ZIP Code:</b> " + this.properties.zipCode + "</p><p><b>Rent in month " + this.month + ":</b> $" + this.rent + "</p>";
};

function getCircleValues(attribute) {
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
      max = -Infinity;
  
    map.eachLayer(function (layer) {
      //get the attribute value
      if (layer.feature) {
        var attributeValue = Number(layer.feature.properties[attribute]);
  
        //test for min
        if (attributeValue < min) {
          min = attributeValue;
        }
  
        //test for max
        if (attributeValue > max) {
          max = attributeValue;
        }
      }
    });
  
    //set mean
    var mean = (max + min) / 2;
  
    //return values as an object
    return {
      max: max,
      mean: mean,
      min: min,
    };
  }

function updateLegend(attribute) {
    //create content for legend
    var month = attribute.split("month_")[1];
    //replace legend content
    document.querySelector("span").innerHTML = month;
  
    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(attribute);
  
    for (var key in circleValues) {
      //get the radius
      var radius = calcPropRadius(circleValues[key]);
  
      document.querySelector("#" + key).setAttribute("cy", 59 - radius);
      document.querySelector("#" + key).setAttribute("r", radius)
  
      document.querySelector("#" + key + "-text").textContent = " $" + Math.round(circleValues[key] * 100) / 100;
  
    }
  }



// legend content constructor function
function LegendContent(attribute){
    this.attribute = attribute;
    this.month = attribute.split("month_")[1];
    this.formatted = "</p><p><b>Rents in month " + this.month + "</b></p>";
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var popupContent = new PopupContent(feature.properties, attribute);
    //bind the popup to the circle marker    
    layer.bindPopup(popupContent.formatted, {
        offset: new L.Point(0,-options.radius)   
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};


// Create a legend
function createLegend(attributes){
    console.log("Check this out");
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            // set the default legend content
            container.innerHTML = '<p class="temporalLegend">Rent in month <span class="month">1</span></p>';

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="130px" height="130px">';

            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

              //Step 2: loop to add each circle and text to svg string
      for (var i = 0; i < circles.length; i++) {
        //calculate r and cy
        var radius = calcPropRadius(dataStats[circles[i]]);
        console.log(radius);
        var cy = 59 - radius;
        console.log(cy);

        //circle string
        svg +=
          '<circle class="legend-circle" id="' +
          circles[i] +
          '" r="' +
          radius +
          '"cy="' +
          cy +
          '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="30"/>';

        //evenly space out labels
        var textY = i * 20 + 20;

        //text string
        svg +=
          '<text id="' +
          circles[i] +
          '-text" x="65" y="' +
          textY +
          '">' +
          " $" +
          Math.round(dataStats[circles[i]] * 100) / 100 +
          "</text>";
      }

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);
             
            console.log(svg);


            //add attribute legend svg to container
            //container.innerHTML += svg;

            console.log(container);

            return container;
        }
    });

    map.addControl(new LegendControl());
};


// Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            
            //update the layer style and popup
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add formatted attribute to panel content string
            var popupContent = new PopupContent(props, attribute);    

            //update popup with new content    
            popup = layer.getPopup();    
            popup.setContent(popupContent.formatted).update();
        };

        // update the legend content
        var legendContent = new LegendContent(attribute);
        document.querySelector(".temporalLegend").innerHTML = legendContent.formatted;   
        updateLegend(attribute);    


        };
    });
};


//Create new sequence controls
function createSequenceControls(attributes){

    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/rewind2.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward2.png"></button>');

            //set slider attributes
            container.querySelector(".range-slider").max = 7;
            container.querySelector(".range-slider").min = 0;
            container.querySelector(".range-slider").value = 0;
            container.querySelector(".range-slider").step = 1;

            // click listener for buttons
            container.querySelectorAll('.step').forEach(function(step){
                step.addEventListener("click", function(){
                    var index = container.querySelector('.range-slider').value;

                    // increment or decrement depending on button clicked
                    if (step.id == 'forward'){
                        index++;
                        //if past the last attribute, wrap around to first attribute
                        index = index > 7 ? 0 : index;
                    } else if (step.id == 'reverse'){
                        index--;
                        // if past the first attribute, wrap around to last attribute
                        index = index < 0 ? 7 : index;
                    };

                    // update slider
                    container.querySelector('.range-slider').value = index;

                    // pass new attribute to update symbols
                    updatePropSymbols(attributes[index]);
                                
                })
                
            })

             // input listener for slider
             container.querySelector('.range-slider').addEventListener('input', function(){            

                // get the new index value
                var index = this.value;

                // pass new attribute to update symbols
                updatePropSymbols(attributes[index]);
            
            });  
       
        //disable any mouse event listeners for the container
        L.DomEvent.disableClickPropagation(container);

        return container;
    }
});

    map.addControl(new SequenceControl());    // add listeners after adding control

};


// build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with rent values
        if (attribute.indexOf("rent") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};


//Import GeoJSON data
function getData(map){
    //load the data
    fetch("data/rents.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
             //create an attributes array
            var attributes = processData(json);
            //calculate min, max, mean
            calcStats(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap)