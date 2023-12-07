// JS by Kevin Crowe, 2023

/* Lab 1
 Objectives:
    - at least 15 locations
    - at least 7 timestamps
    - proportional symbols
    - 5 interaction operators:
        - pan
        - zoom
        - retrieve
        - sequence
        - another operator -- perhaps a filter to show which have grown the most by percentage

*/

//Set the mapbox key
L.mapbox.accessToken = 'pk.eyJ1Ijoia2Nyb3dlYmFzc3BybyIsImEiOiJjbG8wZnJwMXgxNW1lMnNwZGF4M295bzhiIn0.HH0mKHddBIow2AdY707JMA';


//declare map var in global scope
var map;

//Step 1: function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('map', {
        center: [41, -100],
        zoom: 4
    });

    // Tiles are 512x512 pixels and are offset by 1 zoom level
    L.tileLayer(
        'https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=' + L.mapbox.accessToken, {
            tileSize: 512,
            zoomOffset: -1,
            attribution: '© <a href="https://www.mapbox.com/contribute/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

    //call getData function
    getData(map);
};


//Calculate the minimum value of the properties
function calculateMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var city of data.features){
        //loop through each year
        for(var year = 1950; year <= 2010; year+=10){
              //get population for current year
              var value = city.properties["t" + String(year) + "s"];
              //add value to array
              allValues.push(value);
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}


//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var maxRadius = 15;

    //Flannery Apperance Compensation formula
    //var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    //I need to take a different approach to calculating a radius
    radius = attValue/50;

    return radius;
};


//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    //Step 2.4: Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];

    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#33fffc",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //add formatted attribute to panel content string
    var year = attribute.split("rent_")[1];

    //build popup content string
    var popupContent = "<p><b>City:</b> " + feature.properties.city + "</p><p><b>Median rent in " + year + ":</b> $" + feature.properties[attribute] + "</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent,{
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
            return pointToLayer(feature, latlng, attributes)
        }
    }).addTo(map);
};


//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>City:</b> " + props.city + "</p>";

            //add formatted attribute to panel content string
            var decade = attribute.split("rent_")[1];
            popupContent += "<p><b>Average number of 90-degree days per year in the " + decade + ":</b> " + props[attribute] + " days</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};




//Step 1: Create new sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;


    //add the step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">Reverse</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">Forward</button>');

    //Step 2.5: click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
             var index = document.querySelector('.range-slider').value;

            //Step 2.6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 2.7: if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
                console.log(index);
            } else if (step.id == 'reverse'){
                index--;
                //Step 2.7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
                console.log(index);
            };

            //Step 2.8: update slider
            document.querySelector('.range-slider').value = index;
            
            //Step 2.9: pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })

    })

    //Step 2.5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 2.6: get the new index value
        var index = this.value;
        console.log(index)            
        
        //Step 2.9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);

    });
};



//Step 2.3: build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with temperature values
        if (attribute.indexOf("rent_") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

// Step 2: Import the GeoJSON data
function getData(map){
    //load the data
    fetch("data/big_city_rents_point.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
           
            //create an attributes array
            var attributes = processData(json);

            //calculate minimum data value
            minValue = calculateMinValue(json);

            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};


document.addEventListener('DOMContentLoaded',createMap)
