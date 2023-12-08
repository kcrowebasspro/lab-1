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

Which data to show:
    - Percent changes and whole dollar changes for 2005-2022
    - Change the colors of the markers based on whether there was a positive or negative change

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

    // add search box
    L.Control.geocoder().addTo(map);

    //call getData function
    getData(map);

};




//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    
    //There are some small values, so we want to set a floor
    if(attValue < 6){
        
        radius = 3;

    } else {

    radius = attValue/2;

    }

    return radius;

};

//Create a function to change the fill color based on positive or negative change
function calcFillColor(attValue){


    if(attValue < 0){
        
        fill_color = "#ff7d33";

    } else {

        fill_color = "#33fffc";
    }

    return fill_color;

}

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes, medRents, totChanges){
    //Determine which attribute to visualize with proportional symbols
    //Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];
    var medRent = medRents[0];
    var totChange = totChanges[0];

    //check
    console.log(attribute);


    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //create marker options
    var options = {
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
    };

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //Each circle's color based on the direction of change -- positive or negative
    options.fillColor = calcFillColor(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //add formatted attribute to panel content string
    var year = attribute.split("pct_2005_")[1];

    //build popup content string
    var popupContent = "<p><b>City:</b> " + feature.properties.city + "</p><p>Median rent changed by <b>$" + feature.properties[totChange].toLocaleString("en-US") + "</b> to a total of <b>$" +  feature.properties[medRent].toLocaleString("en-US") + "</b> from <b>2005 to " + year + "</b>, a <b>" + feature.properties[attribute] + "%</b> change.</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent,{
        offset: new L.Point(0,-options.radius) 
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;

};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes, medRents, totChanges){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes, medRents, totChanges)
        }
    }).addTo(map);
};


//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute, medRent, totChange){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //upate the fill color
            var fill_color = calcFillColor(props[attribute]);
            layer.setStyle({fillColor: fill_color});

            //add city to popup content string
            var popupContent = "<p><b>City:</b> " + props.city + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split("pct_2005_")[1];
            popupContent += "</p><p>Median rent changed by <b>$" + props[totChange].toLocaleString("en-US") + "</b> to a total of <b>$" +  props[medRent].toLocaleString("en-US") + "</b> from <b>2005 to " + year + "</b>, a <b>" + props[attribute] + "%</b> change.</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};


//Create sequence controls
function createSequenceControls(attributes, medRents, totChanges){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 7;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //add the step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">2007</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">2022</button>');

    //Click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
             var index = document.querySelector('.range-slider').value;

            //Increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 2.7: if past the last attribute, wrap around to first attribute
                index = index > 7 ? 0 : index;
                console.log(index);
            } else if (step.id == 'reverse'){
                index--;
                //Step 2.7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 7 : index;
                console.log(index);
            };

            //Update slider
            document.querySelector('.range-slider').value = index;
            
            //Pass new attribute to update symbols
            updatePropSymbols(attributes[index], medRents[index], totChanges[index]);

        })

    })

    //Input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 2.6: get the new index value
        var index = this.value;
        console.log(index)            
        
        //Pass new attribute to update symbols
        updatePropSymbols(attributes[index], medRents[index], totChanges[index]);

    });
};


//Build an attributes array from the data containg the percent changes
function processPercents(data){
    //empty arrays to hold the different chunks of data
    var attributes = []; //percent changes

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){

        //only take attributes with percent change values
        if (attribute.indexOf("pct_2005_") > -1){

            attributes.push(attribute);

        };
    };

    //check result
    console.log(attributes);

    return attributes;
};


//Function to process the median rents for each period
function processRents(data){

    //empty arrays to hold the different chunks of data
    var medRents = []; //median rents

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into rents array
    for (var attribute in properties){
        
        //only take attributes with median rent values
        if (attribute.indexOf("rent_") > -1) {

            medRents.push(attribute);

        };
    };

    //check result
    console.log(medRents);

    return medRents;
};


//Function to process the total changes for each period 
//compared to 2005
function processChanges(data){
    //empty arrays to hold the different chunks of data
    var totChanges = []; //the actual dollar changes

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into total changes array
    for (var attribute in properties){
        
        //take the attributes with total in the name
        if (attribute.indexOf("tot_2005_") > -1) {

            totChanges.push(attribute);    

        };
    };

    //check result
    console.log(totChanges);

    return totChanges;
};


/*

//testing the creation of the variable
var testData = fetch("data/big_city_rents_point.geojson")
        .then(function(response){
            return response.json();
        });

console.log(testData);
*/



//Import the GeoJSON data
function getData(map){
    //load the data
    fetch("data/big_city_rents_point.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
           
            //create an attributes array
            var attributes = processPercents(json);

            //create the total changes array
            var totChanges = processChanges(json);

            //create array to hold the median rents
            var medRents = processRents(json);

            //call function to create proportional symbols
            createPropSymbols(json, attributes, medRents, totChanges);
            createSequenceControls(attributes, medRents, totChanges);

        })

};


document.addEventListener('DOMContentLoaded',createMap)
