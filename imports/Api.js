
Router.map(function () {
	this.route('api.0.json.groups', {
		path: '/api/0/json/groups',
		where: 'server',
		action: function () {
			var groupQuery = Filtering(GroupPredicates).read(this.params.query).done().toQuery();
			var groups = GroupLib.find(groupQuery).fetch();

			_.each(groups, function(group) {
				group.sourceLink = Router.url('groupDetails', group);
			});

			this.response.setHeader('Content-Type', 'application/json; charset=utf-8');
			this.response.end(JSON.stringify(groups, null, "\t"));
		}
	});
});

Router.map(function () {
    this.route('api.0.json.venues', {
        path: '/api/0/json/venues',
        where: 'server',
        action: function () {
            var venueQuery = Filtering(VenuePredicates).read(this.params.query).done().toQuery();
            var venues = Venues.find(venueQuery).fetch();

			_.each(venues, function(venue) {
				venue.sourceLink = Router.url('venueDetails', venue);
			});

            this.response.setHeader('Content-Type', 'application/json; charset=utf-8');
            this.response.end(JSON.stringify(venues, null, "\t"));
        }
    });
});
