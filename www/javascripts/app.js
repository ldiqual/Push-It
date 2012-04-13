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
		pressEvent: "mousedown",//"touchstart",
		releaseEvent: "mouseup",//"touchend",
		devCoords: {
			latitude: 44.833,
			longitude: -0.567
		},
		
		debug: true
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
		this.results = {};
		
		// Start methods
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

		// onError Callback receives a PositionError object
		//
		
		var onError = function(error) {
		  debug.log("Can't get location");
		}

		this.loadMap()
		
		if (!this.options.debug) {
			navigator.geolocation.getCurrentPosition(this.loadMap.bind(this), onError);
		}
	},
	
	loadMap: function(position) {
		if (this.options.debug) {
			var position = {
				coords: this.options.devCoords
			}
		}
		var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		// Google Map
		var myOptions = {
			center: location,
			zoom: 8,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		this.map = new google.maps.Map(document.getElementById('map'), myOptions);
		
		console.log(this.pages.map.get(0));

		// Google Places
		// Search places around the current location
		var places = new google.maps.places.PlacesService(map);		
		this.searchType(places, location, 0);
	},
	
	searchType: function(places, location, typeIndex) {
		var request = {
			types: [this.options.placeTypes[typeIndex]],
			location: location,
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
				this.searchType(places, location, typeIndex + 1);
			} else {
				// All categories have been loaded -> init list
				this.initList();
			}
		}.bind(this))
	},
	
	// Populate the places list
	initList: function() {
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
		$.mobile.changePage(this.pages.categories);
	},
	
	loadPlace: function(place) {
		$.mobile.changePage(this.pages.map);
	}
});