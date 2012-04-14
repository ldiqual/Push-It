// Bind fix
Function.prototype.bind = function(context) {
  var m = this; // référence l'instance de Function
  return function() {
    return m.apply(context, arguments);
  }
}

var App = $.inherit({
	options: {
		searchRadius: 5000,
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
		this.pages = {
			button: $('#button-page'),
			categories: $('#list-page'),
			map: $('#map')
		};
		
		// Specific properties
		this.map = null;
		this.directions = null;
		this.directionRenderer = null;
		this.location = null;		
		this.results = {};
		this.placeMarkers = [];
		
		// Main events
		this.placeButton();
		this.buttonEvents();
	},
	
	// Place the main button at the center of the screen
	placeButton: function() {
		this.button.css({
			'margin-top': Math.round(parseInt($(window).height(), 	10 ) / 2)
									- Math.round(parseInt(this.button.height(), 10 ) / 2)
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
			scaleControl: false,
			zoomControl: false,
			draggable: false
		};
		this.map = new google.maps.Map(document.getElementById('map'), mapOptions);

		// Map swipe => return to places list
		this.pages.map.bind('swiperight', function(ev) {
			ev.preventDefault();
			$.mobile.changePage(this.pages.categories, {
				transition: "slide",
				reverse: true
			});
		}.bind(this));

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
			suppressMarkers: true
		});

		this.pages.map.hide();
		
		// Google Places
		// Search places around the current location
		var places = new google.maps.places.PlacesService(this.map);		
		this.searchType(places, 0);
	},
	
	searchType: function(places, typeIndex) {
		var request = {
			types: [this.options.placeTypes[typeIndex]],
			location: this.location,
			radius: this.options.searchRadius			 
		};
		places.search(request, function(results, status) {
			/*
			switch (status) {
				case google.maps.places.PlacesServiceStatus.OK: 							console.log('OK'); break;
				case google.maps.places.PlacesServiceStatus.INVALID_REQUEST: 	console.log('INVALID_REQUEST'); break;
				case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT: console.log('OVER_QUERY_LIMIT'); break;
				case google.maps.places.PlacesServiceStatus.REQUEST_DENIED: 	console.log('REQUEST_DENIED'); break;
				case google.maps.places.PlacesServiceStatus.UNKNOWN_ERROR: 		console.log('UNKNOWN_ERROR'); break;
				case google.maps.places.PlacesServiceStatus.ZERO_RESULTS: 		console.log('ZERO_RESULTS'); break;
				default: console.log("big error");
			}
			*/
			
			// Handling results
			this.results[this.options.placeTypes[typeIndex]] = results;
			if (typeIndex < this.options.placeTypes.length - 1) {
				// Next category
				this.searchType(places, typeIndex + 1);
			} else {
				// All categories have been loaded -> init list
				this.initList();
			}
		}.bind(this))
	},
	
	// Populate the places list
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
				newLi.bind('tap', function(ev) {
					ev.preventDefault();
					var el = $('a', this);
					
					console.log('Loading place');
					self.loadPlace(self.results[el.attr('data-resulttype')][parseInt(el.attr('data-resultindex'), 10)]);
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
	
	loadPlace: function(place) {
		// Remove the previous markers
		for (var i=0; i<this.placeMarkers.length; i++) {
			this.placeMarkers[i].setMap(null);
		}
		
		// Add a marker on the place
		var placeMarker = new google.maps.Marker({
			map: this.map,
			position: place.geometry.location,
			icon: this.options.endIcon
		});
		this.placeMarkers.push(placeMarker);
		
		// Compute direction
		var request = {
			origin: this.location,
			destination: place.geometry.location,
			travelMode: google.maps.TravelMode.WALKING
		};
		this.directions.route(request, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				this.showRoute(result);
			} else {
				this.directionsRenderer.setMap(null);
				console.log("Can't compute route to this point");
			}
		}.bind(this));
		
		//this.map.panTo(this.location);	
	},
	
	showRoute: function(result) {
		this.directionsRenderer.setMap(this.map);
		this.directionsRenderer.setDirections(result);
		
		// Show the map
		console.log('Showing map');
		this.pages.map.show();
		$.mobile.changePage(this.pages.map, {
			transition: "slide"
		});
		
		// Graphic fixes
		google.maps.event.trigger(this.map, 'resize');
	}
});