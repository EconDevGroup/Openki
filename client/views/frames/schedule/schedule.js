Router.map(function () {
	this.route('frameSchedule', {
		path: '/frame/schedule',
		layoutTemplate: 'frameLayout',
	});
});

Template.frameSchedule.onCreated(function() {
	var filter = Filtering(EventPredicates);

	var instance = this;
	instance.interval = new ReactiveVar(60);
	instance.scheduleStart = new ReactiveVar(moment());
	instance.separators = new ReactiveVar([]);
	instance.repeatingOnly = new ReactiveVar(false);

	// Read query params
	this.autorun(function() {
		var query = Router.current().params.query;

		instance.repeatingOnly.set(Object.hasOwnProperty(query, 'repeating'));

		var scheduleStart;
		if (query.start) scheduleStart = moment(query.start);
		if (!scheduleStart || !scheduleStart.isValid()) scheduleStart = moment(minuteTime.get()).startOf('week');
		instance.scheduleStart.set(scheduleStart);


		var rawSeps = (query.sep || "").split(',');
		var seps = [];
		_.each(rawSeps, function(rawSep) {
			if (rawSep.length === 0) {
				return;
			}

			if (rawSep.length < 3) {
				rawSep = rawSep + "00";
			}

			var hm = parseInt(rawSep, 10);
			if (!isNaN(hm)) {
				var h = Math.floor(hm/100);
				var m = hm % 100;
				seps.push(h*60+m);
			}
		});
		var separators = _.uniq(seps);
		instance.separators.set(separators);

		var readInterval = parseInt(query.interval, 10);
		if (!isNaN(readInterval) && readInterval > 0) {
			instance.interval.set(readInterval);
		} else {
			if (separators.length > 0) {
				instance.interval.set(24*60);
			} else {
				instance.interval.set(60);
			}
		}


		filter.clear().read(query);
		filter.add('after', scheduleStart);
		filter.add('end', moment(scheduleStart).add(4, 'week'));
		filter.done();
	});


	this.autorun(function() {
		subs.subscribe('eventsFind', filter.toQuery(), 500);
	});


	instance.days = new ReactiveVar([]);
	instance.intervals = new ReactiveVar([]);
	instance.slots = new ReactiveVar({});
	instance.kindMap = function() { return 0; };

	this.autorun(function() {
		var scheduleStart = moment(filter.get('after'));
		var end = moment(filter.get('end'));
		var dayCount = end.diff(scheduleStart, 'days');
		var interval = instance.interval.get();

		// Track overall repetition of events so we know which ones to sort
		// first for the schedule to look more stable.
		var repetitionCount = {};

		// Track repeating events so we know how often they occur per weekday.
		// The key to this dict is a combination of courseId, weekday and start time.
		var repetitionCountDay = {};


		// Load events but keep only the first when they repeat on the same
		// weekday at the same time.
		var dedupedEvents = [];
		eventsFind(filter.toQuery()).forEach(function(event) {
			var repKey = event.start.getHours()+'-'+ event.start.getMinutes()+'-';

			// If there is no courseId, we fall back to replicationId, then _id.
			if (event.courseId) {
				repKey += event.courseId;
			} else if (event.replicaOf) {
				repKey += event.replicaOf;
			} else {
				repKey += event._id;
			}

			var repKeyDay = event.start.getDay()+'-'+repKey;

			if (repetitionCountDay[repKeyDay] >= 1) {
				repetitionCountDay[repKeyDay] += 1;
			} else {
				repetitionCountDay[repKeyDay] = 1;

				event.repKey = repKey;
				event.repKeyDay = repKeyDay;
				dedupedEvents.push(event);
			}

			if (repetitionCount[repKey] >= 1) {
				repetitionCount[repKey] += 1;
			} else {
				repetitionCount[repKey] = 1;
			}
		});

		// Because we need to find the closest separator later on we create a
		// reversed copy which is easier to search.
		var separators = instance.separators.get().slice().reverse();

		// List of intervals where events or separators are placed
		var intervals = _.reduce(separators, function(intervals, separator) {
			intervals[separator] = separator;
			return intervals;
		}, {});

		// List of days where events where found
		var days = {};

		// Map of slots where events were found. Each slot holds a list of events.
		var slots = {};

		// Count occurences of first few chars in event titles
		// This helps coloring the events so they're easier to scan.
		var kinds = {};

		// Place found events into the slots
		_.each(dedupedEvents, function(event) {
			event.repCount = repetitionCount[event.repKey];
			if (event.repCountDay < 2 && instance.repeatingOnly.get()) {
				// Skip
				return;
			}

			var eventStart = moment(event.start);
			var dayStart = moment(eventStart).startOf('day');

			var day = dayStart.diff(scheduleStart, 'days') % 7;
			days[day] = day;

			var minuteDiff = eventStart.diff(dayStart, 'minutes');
			var intervalStart = Math.floor(minuteDiff / interval) * interval;
			var closestSeparator = _.find(separators, function(sep) {
				return sep <= minuteDiff;
			});

			var mins = Math.max(intervalStart, closestSeparator || 0);
			intervals[mins] = mins;


			if (!slots[mins]) slots[mins] = [];
			if (!slots[mins][day]) slots[mins][day] = [];
			slots[mins][day].push(event);

			var kindId = event.title.substr(0, 5);
			if (!kinds[kindId]) kinds[kindId] = 1;
			kinds[kindId] += 1;
		});

		_.each(slots, function(dayslots, min) {
			_.each(dayslots, function(slot, day) {
				slots[min][day] = _.sortBy(slot, function(event) {
					// We add repetitionCount to the sort criteria so that the
					// output hopefully looks more stable through the weekdays
					// with events occurring every weekday listed first in the
					// each slot
					return [event.start.getHours(), event.start.getMinutes(), -repetitionCount[event.repKey]];
				});
			});
		});

		var numCmp = function(a, b) { return a - b; };
		instance.days.set(_.values(days).sort(numCmp));
		instance.intervals.set(_.values(intervals).sort(numCmp));
		instance.slots.set(slots);

		// Build list of most used titles (first few chars)
		var mostUsedKinds = _.sortBy(_.pairs(kinds), function(kv) { return -kv[1]; });
		var kindRank = _.object(_.map(mostUsedKinds.slice(0, 15), function(kv, rank) {
			return [kv[0], rank+1];
		}));
		instance.kindMap = function(title) {
			var kindId = title.substr(0, 5);
			if (kindRank[kindId]) return kindRank[kindId];
			return 0;
		};
	});
});

Template.frameSchedule.helpers({
	month: function() {
		var instance = Template.instance();
		return moment(instance.scheduleStart.get()).format('MMMM');
	},

	days: function() {
		var instance = Template.instance();
		var scheduleStart = instance.scheduleStart.get();
		return _.map(Template.instance().days.get(), function(day) {
			return moment(scheduleStart).add(day, 'days').format('dddd');
		});
	},

	intervals: function() {
		var slots = Template.instance().slots.get();

		return _.map(Template.instance().intervals.get(), function(mins) {
			return {
				interval: moment().hour(0).minute(mins).format('LT'),
				slots: _.map(Template.instance().days.get(), function(day) {
					return slots[mins] && slots[mins][day];
				})
			};
		});
	},

	type: function() {
		return Template.instance().kindMap(this.title);
	},

	customStartTime: function(interval) {
		var event = this;
		var startTime = moment(event.start).format('LT');
		return (interval !== startTime) ? startTime : false;
	},

	single: function() {
		return this.repCount < 2;
	},

	showDate: function() {
		// The date is shown if an event has now repetitions...
		if (this.repCount < 2) return true;

		// ... or if it doesn't occur this week.
		var thisWeek = moment().startOf('week');
		var eventWeek = moment(this.start).startOf('week');
		return eventWeek.isAfter(thisWeek);
	}
});
