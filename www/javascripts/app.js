// Bind fix
Function.prototype.bind = function(context) {
  var m = this; // référence l'instance de Function
  return function() {
    return m.apply(context, arguments);
  }
}

var App = $.inherit({
	options: {
		searchRadius: 2000, // In meters
		toogleInterval: 1000,
		placeTypes: [
			"restaurant",
			"movie_theater",
			"store",
			"cafe"
		],
		pressEvent: 	(debug) ? "mousedown" : "touchstart",
		releaseEvent: (debug) ? "mouseup" 	: "touchend",
		devCoords: {
			latitude: 44.833,
			longitude: -0.567
		},
		startIcon: "http://www.google.com/mapfiles/dd-start.png",
		endIcon: 	 "http://www.google.com/mapfiles/dd-end.png",
		mapZoom: 15
	},
	
	__constructor: function(options) {
		console.log("App launched");
		
		// Merge options
		$.extend(this.options, options);
		
		// jQuery objects
		this.button = $('.button');
		this.img = $('.img', this.button);
		this.loader = $('.loader', this.button);
		this.pages = {
			button: $('#button-page').page(),
			categories: $('#list-page').page(),
			map: $('#map-page').page()
		};

		// Specific properties
		this.map = null;
		this.directions = null;
		this.directionRenderer = null;
		this.location = null;
		this.selectedResult = null;
		this.results = {};
		
		// Main events
		this.placeButton();
		this.buttonEvents();
	},
	
	// Place the main button at the center of the screen
	placeButton: function() {
		this.button.css({
			'margin-top': Math.round(parseInt($(window).height(), 	10 ) / 2)
									- Math.round(parseInt(this.img.height(), 10 ) / 2)
		});
	},
	
	// Bind touch start/end events
	buttonEvents: function() {
		this.img.bind(this.options.pressEvent, function(ev) {
			ev.preventDefault();
			this.img.removeClass('default').addClass('pressed');
		}.bind(this));
		
		this.img.bind(this.options.releaseEvent, function(ev) {
			console.log('Button pressed');
			ev.preventDefault();
			this.loader.show();
			//setTimeout(this.toogleButton.bind(this), this.options.toogleInterval);
			this.img.removeClass('pressed').addClass('active');
			this.startGeolocation();
		}.bind(this));
	},
	
	// Toogle the button color periodically
	toogleButton: function() {
		if (this.img.hasClass('active')) {
			this.img.removeClass('active').addClass('toggling');
		} else {
			this.img.removeClass('toggling').addClass('active');
		}
		setTimeout(this.toogleButton.bind(this), this.options.toogleInterval);
	},
	
	// Geolocate the device and search for places around the resulting position
	startGeolocation: function() {
		var onError = function(error) {
		  debug.log("Can't get location");
		}

		if (!debug) {
			navigator.geolocation.getCurrentPosition(this.loadServices.bind(this), onError);
		} else {
			this.loadServices({
				coords: this.options.devCoords
			});
		}
	},
	
	/*
	 * Instanciate the google maps services (maps, direction, places)
	 * As Places needs a map in its constructor, we create a new map instance
	 * on an hidden div. That will cause some graphic issues when showing the div,
	 * we'll fix that later.
	 */
	loadServices: function(position) {
		console.log('Geolocated');

		this.location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		
		// Google Map
		var mapOptions = {
			center: this.location,
			zoom:	this.options.mapZoom,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControl: false,
			streetViewControl: false,
			scaleControl: false
		};
		var mapCanvas = $('#map', this.pages.map);;
		this.map = new google.maps.Map(mapCanvas.get(0), mapOptions);

		// Map init event
		var content = $('[data-role="content"]', this.pages.map);
		
		// Fix map center/size issues
		this.pages.map.bind('pageshow', function(ev) {
			mapCanvas.css('min-height', $(window).height() - $('[data-role="header"]', this.pages.map).outerHeight());
			google.maps.event.trigger(this.map, 'resize');
			//this.map.panTo(this.location);
			
			// Fit the maps to bounds
			var bounds = new google.maps.LatLngBounds();
			bounds.extend(this.location);
			bounds.extend(this.selectedResult.place.geometry.location);
			this.map.setCenter(bounds.getCenter());
			this.map.fitBounds(bounds);
		}.bind(this));
		
		// Direction events
		$('.go', this.pages.map).bind('vclick', function(ev) {
			ev.preventDefault();

			var request = {
				origin: this.location,
				destination: this.selectedResult.place.geometry.location,
				travelMode: google.maps.TravelMode.WALKING
			};
			this.directions.route(request, function(result, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					this.selectedResult.directionsResult = result;
					this.showRoute();
				} else {
					console.log("Can't compute route to this point");
				}
			}.bind(this));			
		}.bind(this))

		// Add a marker at the current location
		var currentLocationMarker = new google.maps.Marker({
			map: this.map,
			position: this.location,
			icon: this.options.startIcon
		});

		// Google Directions
		this.directions = new google.maps.DirectionsService();
		this.directionsRenderer = new google.maps.DirectionsRenderer({
			map: this.map,
			suppressMarkers: true,
			preserveViewport: true
		});

		//this.pages.map.hide();
		
		// Google Places
		// Search places around the current location
		var places = new google.maps.places.PlacesService(this.map);
		this.searchType(places, 0);
	},
	
	/*
	 * Search for places according to a type.
	 * Will be recursively called with a different type index,
	 * until placeTypes.length is reached
	 */
	searchType: function(places, typeIndex) {
		console.log("Searching for type "+ this.options.placeTypes[typeIndex]);
		
		var request = {
			types: [this.options.placeTypes[typeIndex]],
			location: this.location,
			radius: this.options.searchRadius
		};
		places.search(request, function(results, status) {			
			// Handling results
			this.results[this.options.placeTypes[typeIndex]] = results;
			if (typeIndex < this.options.placeTypes.length - 1) {
				this.searchType(places, typeIndex + 1);
			} else {
				var empty = true;
				for (var name in this.results) {
					if (this.results[name].length != 0) {
						empty = false;
						break;
					}
				}
				if (empty) {
					if (!debug) {
						navigator.notification.alert("Can't find any good stuff around you :-(");
					}
					return;
				}
				
				this.initList();
			}
		}.bind(this))
	},
	
	/*
	 * Populate the places list
	 */
	initList: function() {		
		console.log('Populating list');
		
		var listPage = $('#list-page').page();
		var ul = $('ul#places', listPage);
		ul.listview();
		
		// Update listview
		var self = this;
		var populateList = function(type) {
			this.selectedCategory = type;
			ul.empty();
			for (var i=0; i<this.results[type].length; i++) {
				// New li item
				var newLi = $('<li>\
												<a href="#" data-resulttype="'+ type +'" data-resultindex="'+ i +'">\
													'+ this.results[type][i].name +'\
												</a>\
											</li>');
				
				// Place loading event
				newLi.bind('vclick', function(ev) {
					ev.preventDefault();
					var el = $('a', this);
					
					console.log('Loading place');
					self.showPlace(self.results[el.attr('data-resulttype')][parseInt(el.attr('data-resultindex'), 10)]);
				});
				
				// Adding the place item to the list
				ul.append(newLi);
			}
			ul.listview("refresh");
		}.bind(this);
		
		// Categories change events
		$('#categories a').bind('tap', function(ev) {
			ev.preventDefault();
			populateList($(this).attr('data-category'));
		});
		
		// First load
		this.selectedCategory = this.options.placeTypes[0];
		populateList(this.selectedCategory);
		
		console.log('Loading page');
		$.mobile.changePage(this.pages.categories);
	},
	
	/*
	 * Get directions to the place, make some markers
	 */
	showPlace: function(place) {
		// Removing previous place and directions
		if (this.selectedResult != null) {
			this.selectedResult.marker.setMap(null);
			this.selectedResult.directionsResult = null;
			this.directionsRenderer.setMap(null);	
		} else {
			this.selectedResult = {};
		}

		// Add a marker on the place
		var placeMarker = new google.maps.Marker({
			map: this.map,
			position: place.geometry.location,
			icon: this.options.endIcon
		});
		this.selectedResult.marker = placeMarker;
		this.selectedResult.place = place;
		
		$.mobile.changePage(this.pages.map, {
			transition: "slide"
		});
	},
	
	/*
	 * Place route on the map, and show it
	 */ 
	showRoute: function(result) {
		this.directionsRenderer.setMap(this.map);
		this.directionsRenderer.setDirections(this.selectedResult.directionsResult);
	}
});