Template.courseCompact.onCreated(function() {
	var instance = this;
	var course = instance.data;

	var mainCategories = [];
	_.each(course.categories, function(courseCategory) {
		var mainCategory = _.find(Categories, function(category) {
			return category.name == courseCategory;
		});
		if (mainCategory) mainCategories.push(mainCategory);
	});

	instance.mainCategories = mainCategories;
});

Template.courseCompact.helpers({
	ready: function() {
		var instance = Template.instance;
		return !instance.eventSub || instance.eventSub.ready();
	},

	courseState: function() {
		if (this.nextEvent) return 'has-upcoming-events';
		if (this.lastEvent) return 'has-past-events';
		return 'proposal';
	},

	isProposal: function(courseState) {
		return courseState === 'proposal';
	},

	mainCategoriesLimited: function() {
		var maxLimit = 4;
		var instance = Template.instance();
		var mainCategories = instance.mainCategories;

		return mainCategories.slice(0, maxLimit);
	},

	needsRole: function(role) {
		var courseRoles = this.roles;
		if (!courseRoles) {
			return false;
		} else if (courseRoles.indexOf(role) != -1){
			return !hasRole(this.members, role);
		}
	},

	hasUpcomingEvents: function() {
		return this.nextEvent;
	},

	courseRegionId: function() {
		return this.region;
	}
});

Template.courseCompactRoles.helpers({
	maxRoles: function() {
		return Roles.length - 1; // -1 because we don't show participants role
	},

	requiresRole: function(role) {
		var courseRoles = this.roles;
		if (!courseRoles) return false;
		return courseRoles.indexOf(role) != -1;
	},

	needsRole: function(role) {
		return !hasRole(this.members, role);
	},

	userHasRole: function (role) {
		return hasRoleUser(this.members, role, Meteor.userId());
	}
});


Template.courseCompact.events({
	"mouseover .js-group-label": function(event, template){
		 template.$('.course-compact').addClass('elevate_child');
	},

	"mouseout .js-group-label": function(event, template){
		 template.$('.course-compact').removeClass('elevate_child');
	}
});

Template.courseCompact.rendered = function() {
	this.$('.course-compact-title').dotdotdot();
};
