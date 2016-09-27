Template.course_edit.created = function() {
	// Show category selection right away for new courses
	var editingCategories = !this.data || !this.data._id;
	this.editingCategories = new ReactiveVar(editingCategories);
	this.selectedCategories = new ReactiveVar(this.data && this.data.categories || []);
};

Template.course_edit.helpers({
	query: function() {
		return Session.get('search');
	},

	availableCategories: function() {
		return Object.keys(categories);
	},

	availableSubcategories: function(category) {
		// Hide if parent categories not selected
		var selectedCategories = Template.instance().selectedCategories.get();
		if (selectedCategories.indexOf(category) < 0) return [];

		return categories[category];
	},

	editingCategories: function() {
		return Template.instance().editingCategories.get();
	},

	available_roles: function() {
		return _.filter(Roles, function(role) { return !role.preset; });
	},

	roleDescription: function() {
		return 'roles.'+this.type+'.description';
	},

	roleSubscription: function() {
		return 'roles.'+this.type+'.subscribe';
	},

	isChecked: function() {
		var selectedCategories = Template.instance().selectedCategories.get();
		if (selectedCategories.length && selectedCategories.indexOf(''+this) >= 0) {
			return 'checkbox-checked';
		}
		return '';
	},

	checkCategory: function() {
		var selectedCategories = Template.instance().selectedCategories.get();
		if (selectedCategories.length) {
			return selectedCategories.indexOf(''+this) >= 0 ? 'checked' : '';
		}
	},

	hasRole: function() {
		var instance = Template.instance();
		return instance.data && instance.data.members && hasRoleUser(instance.data.members, this.type, Meteor.userId()) ? 'checked' : null;
	},

	regions: function() {
		return Regions.find();
	},

	currentRegion: function(region) {
		var currentRegion = Session.get('region');
		return currentRegion && region._id == currentRegion;
	},

	isInternal: function() {
		return this.internal ? "checked" : null;
	},

	proposeFromQuery: function() {
		var parentInstance = Template.instance().parentInstance();
		var filter = parentInstance.filter;
		if (!filter) return false;

		var search = filter.toParams().search;
		if (!search) return false;

		var filterQuery = filter.toQuery();
		var results = coursesFind(filterQuery, 1);

		return (results.count() === 0) && search;
	},

	courseSearch: function() {
		var parentInstance = Template.instance().parentInstance();
		var filterParams = parentInstance.filter.toParams();

		return filterParams.search;
	}
});


Template.course_edit.rendered = function() {
	var desc = this.find('#editform_description');
	if (desc) new MediumEditor(desc);
};


Template.course_edit.events({
	'submit form, click .js-course-edit-save': function (ev, instance) {
		ev.preventDefault();

		if (pleaseLogin()) return;

		var course = instance.data;
		var courseId = course._id ? course._id : '';
		var isNew = courseId === '';

		var roles = {};
		$('.js-check-role').each(function(_, rolecheck) {
			roles[rolecheck.name] = rolecheck.checked;
		});

		var changes = {
			description: $('#editform_description').html(),
			categories: instance.selectedCategories.get(),
			name: $('#editform_name').val(),
			roles: roles,
			internal: $('.js-check-internal').is(':checked'),
		};

		changes.name = saneText(changes.name);

		if (changes.name.length === 0) {
			alert("Please provide a title");
			return;
		}

		if (isNew) {
			changes.region = $('.region_select').val();
			if (!changes.region) {
				alert("Please select a region");
				return;
			}

			var groups = [];
			if (Router.current().params.query.group) {
				groups.push(Router.current().params.query.group);
			}
			changes.groups = groups;
		}

		Meteor.call("save_course", courseId, changes, function(err, courseId) {
			if (err) {
				showServerError('Saving the course went wrong', err);
			} else {
				Router.go('/course/'+courseId); // Router.go('showCourse', courseId) fails for an unknown reason
				addMessage(mf('course.saving.success', { NAME: changes.name }, 'Saved changes to course "{NAME}".'), 'success');

				$('.js-check-enrol').each(function(_, enrolcheck) {
					if (enrolcheck.checked) {
						Meteor.call('add_role', courseId, Meteor.userId(), enrolcheck.name, false);
					} else {
						Meteor.call('remove_role', courseId, enrolcheck.name);
					}
				});
			}
		});

		return false;
	},

	'click .js-course-edit-cancel': function(event, instance) {
		var course = instance.data;

		if (course._id) {
			Router.go('showCourse', course);
		} else {
			Router.go('/');
		}
	},

	'click .js-edit-categories': function (event, template) {
		Template.instance().editingCategories.set(true);
	},

	'change .js-category-checkbox': function(event, instance) {
		var catKey = ''+this;
		var selectedCategories = instance.selectedCategories.get();
		var checked = instance.$('input.cat_'+catKey).prop('checked');
		if (checked) {
			selectedCategories.push(catKey);
			selectedCategories = _.uniq(selectedCategories);
		} else {
			selectedCategories = _.without(selectedCategories, catKey);

			if (categories[catKey]) {
				// Remove all the subcategories as well
				selectedCategories = _.difference(selectedCategories, categories[catKey]);
			}
		}

		instance.selectedCategories.set(selectedCategories);
	}
});

Template.courseEditRole.onCreated(function() {
	this.checked = new ReactiveVar(false);
});

Template.courseEditRole.onRendered(function() {
	this.checked.set(this.data.selected.indexOf(this.data.role.type) >= 0);
});

Template.courseEditRole.helpers({
	roleDescription: function() {
		return 'roles.'+this.role.type+'.description';
	},

	roleSubscription: function() {
		return 'roles.'+this.role.type+'.subscribe';
	},

	checkRole: function() {
		var instance = Template.instance();
		return instance.checked.get() ? "checked" : null;
	},

	hasRole: function() {
		return this.members && hasRoleUser(this.members, this.role.type, Meteor.userId()) ? 'checked' : null;
	},
});

Template.courseEditRole.events({
	"change .js-check-role": function(event, instance) {
		instance.checked.set(instance.$(".js-check-role").prop("checked"));
	}
});
