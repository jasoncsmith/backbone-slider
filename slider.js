(function ($, Backbone, _) {
	// MODEL
	var Project = Backbone.Model.extend({
		defaults: {
			client: 'none'
		}
	});
	

	// COLLECTION
	var Projects = Backbone.Collection.extend({
		model: Project,
		url: '../data/projects.json',
		initialize: function () {
			this.on('reset', function () { console.log('loaded projects.json'); })
		}
   	});


	// MODEL: controller
	var Player = Backbone.Model.extend({
		defaults: {
			state: 'play',
			captions: true,
			currentIndex: 0
		},

		initialize: function () {
			this.intervalId = null;
			this.slideDeck = arguments[0].collection;
			this.listenTo(this.slideDeck, 'reset', this.togglePlayback);
			this.on('change:state', this.togglePlayback, this)
		},

		goTo: function (selectedIndex) {
			this.set({ 'currentIndex': selectedIndex });
		},

		previous: function () {
			var currentIndex = this.get('currentIndex');
			if (currentIndex === 0) {
				this.set({ 'currentIndex': (this.slideDeck.length - 1) });
			} else {
				this.set({ 'currentIndex': currentIndex -= 1 });	
			}
		},

		next: function () {
			var currentIndex = this.get('currentIndex');
			if (currentIndex === (this.slideDeck.length - 1)) {
				this.set({ 'currentIndex': 0 });
			} else {
				this.set({ 'currentIndex': currentIndex += 1 });	
			}			
		},

		play: function () {
			this.set({'state': 'play'});
		},

		pause: function () {
			this.set({'state': 'pause'});
		},

		currentIndex: function () {
			return this.currentIndex;
		},

		toggleCaptions: function () {
			this.set({ 'captions': !this.get('captions') });
		},

		togglePlayback: function () {

			if (this.get('state') === 'play') {
				var that = this;
				this.intervalId = setInterval(function () {
					that.next();
				}, 7000);
			} else {
				if (this.intervalId === null) return;
				clearInterval(this.intervalId);
				this.intervalId = null;
			}
		}
	});


	// VIEW
	var MenuItemView = Backbone.View.extend({
		className: 'menuItem',

		events: {
			'click': 'goTo', // omit the element if it is the views el
			'mouseenter': 'showThumbnail',
			'mouseleave': 'removeThumbnail'
		},

		initialize: function (args) {
			this.player = args.player;
			this.updateState();
			this.listenTo(this.player, 'change:currentIndex', this.updateState)
		},

		render: function () {
			this.$el.html(this.model.get('order'));
			return this;
		},

		goTo: function () {
			this.player.goTo(this.model.get('order') - 1);
			this.player.pause();
		},

		showThumbnail: function () {
			if (this.player.get('currentIndex') === (this.model.get('order') - 1)) return;
			this.$el.append('<img src="' + this.model.get('image').url + '" width="200" height="144" />');
			this.$('img').delay(300).fadeIn(200)
		},

		removeThumbnail: function () {
			this.$('img').fadeOut(200);
			this.$el.find('img').remove();
		},

		updateState: function () {
			var currentIndex = this.player.get('currentIndex');
			this.$el.toggleClass('selected', (currentIndex === (this.model.get('order') - 1)));
		}
	});


	// VIEW
	var SlideView = Backbone.View.extend({
		className: 'slide',
		template: _.template($("#slide-template").html()),

		render: function () {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

	// VIEW: main
	var SlideViewer = Backbone.View.extend({
		el: '#slideshow',

		events: {
			// 'click .menuItem': 			'goTo',
			'click .cmdPrevious': 		'goBack',
			'click .cmdNext': 			'goForward',
			'click .cmdPlay': 			'play',
			'click .cmdPause': 			'pause',
			'click .cmdToggleCaptions': 'toggleCaptions'			
		},

		initialize: function (args) {

			this.$menu = this.$('.menu');
			this.$slides = this.$('.slides');
			this.$feedback = this.$('.feedback');
			this.$cmdPlay = this.$('.cmdPlay');
			
			this.player = args.player;
			this.$el.addClass((args.prefs.captions) ? 'captionsOn' : 'captionsOff');

			this.listenTo(this.player, 'change:currentIndex', this.changeSlide);
			this.listenTo(this.player, 'change:state', this.updateState);

			this.listenTo(this.collection, 'reset', this.renderMenu);
			this.listenTo(this.collection, 'reset', this.renderConsole);
			this.listenTo(this.collection, 'reset', this.renderSlides);
			this.listenTo(this.collection, 'reset', this.updateState);
		},

		renderMenu: function () {
			this.collection.each(function (model) {
				var menuItem = new MenuItemView({
					model: model,
					player: this.player
				});

				this.$menu.append(menuItem.render().el);
			}, this)
		},

		renderConsole: function () {
			this.console = new ConsoleView({
				collection: this.collection,
				// model: Project,
				player: this.player
			});
			this.$el.append(this.console.render().el);
		},

		renderSlides: function () {
			// reset
			this.$slides.html('');

			this.collection.each(function (model) {
				var slide = new SlideView({model: model});
				this.$slides.append(slide.render().el);
			}, this);
		},

		goBack: function () {
			this.player.previous();
			this.player.pause();
		},

		goForward: function () {
			this.player.next();
			this.player.pause();		
		},

		play: function () {
			this.player.play();
		},

		pause: function () {
			this.player.pause();
		},

		toggleCaptions: function () {
			this.player.toggleCaptions();

			var hasCaptions = this.player.get('captions');
			
			this.$el.toggleClass('captionsOn', hasCaptions);
			if (hasCaptions) {
				this.$('.container').animate({ left : 0 }, 200, function () { $(this).css('z-index', 5); });
			} else {
				this.$('.container').css('z-index', 6); // change 'z' to hide display.
				this.$('.container').animate({ left : 145 }, 200);
			}
		},

		updateState: function () {
			var isPlaying = this.player.get('state') === 'play';
			var msg = (isPlaying) ? 'playing...' : 'paused...';
			
			this.$feedback.html(msg);
			this.$cmdPlay.toggle(!isPlaying)
		},

		changeSlide: function () {
			var index = this.player.get('currentIndex');
			var width = this.collection.at(0).get('image').width; // they are all the same
			this.$slides
				.stop(true, true)
				.animate({ left : -(width * index)}, { duration: 400, easing: 'easeInCirc' } );
		},

		logToConsole: function () {
			console.log(this.player.get('currentIndex'), this.player.get('state'));
		}
	})

	// VIEW
	var ConsoleView = Backbone.View.extend({
		className: 'display',
		
		template: _.template($('#console-template').html()),

		initialize: function () {
			this.player = this.options.player;
			this.listenTo(this.player, 'change:currentIndex', this.render);
			this.listenTo(this.player, 'change:captions', this.toggleCaptionView);	
		},

		render: function () {
			var model = this.collection.at(this.player.get('currentIndex'));
			this.$el.html(this.template(model.toJSON()));
			// $('body').prepend(this.$el) // debug

			return this;
		},

		toggleCaptionView: function () {
			if (this.player.get('captions')) {
				this.$el
					.animate({left: 620 },{ duration: 400, easing: 'easeOutElastic'/*, complete: function () { $(this).css('z-index', 5); }*/});
			} else {
				this.$el
					.animate({ left: 240 }, { duration : 400, easing : 'easeOutElastic'});
			}
		}
	});

	var init = function () {
		var projects = new Projects(),

			player = new Player({
				collection: projects
			}),

			slideViewer = new SlideViewer({
				prefs: {captions: true},
				collection: projects,
				player: player
			});

		return {
			collection: projects,
			slideView: slideViewer,
			playerModel: player
		}
	}

	return {init: init}
	
}($, Backbone, _)
