"use strict";

Template.event.created = function() {
	this.editing = new ReactiveVar(false);
	this.replicaDates = new ReactiveVar([]);
}

Template.event.onRendered(function(){
	if (this.editing.get()) {
		setDurationInTemplate(this);
	} else {
		updateReplicas(this);
	}
});


Template.eventPage.helpers({
	course: function() {
		var courseId = this.course_id;
		if (courseId) {
			// Very bad?
			Template.instance().subscribe('courseDetails', courseId);
			
			return Courses.findOne({_id: courseId});
		}
	},

	kioskMode: function() {
		return Session.get('kiosk_mode');
	}
});

Template.eventPage.helpers({
	isEvent: function() {
		return (this._id !== undefined) || this.new;
	}
});

Template.event.helpers({
	isoDateFormat: function(date) {
		return moment(date).format("YYYY-MM-DD");
	},
	editing: function() {
		return this.new || Template.instance().editing.get();
	},
	affectedReplicaCount: function() {
		Template.instance().subscribe('affectedReplica', this._id);
		return Events.find(affectedReplicaSelectors(this)).count();
	},
	regions: function(){
		return Regions.find();
	},

	showRegionSelection: function() {
		// You can select the region for events that are new and not associated
		// with a course
		if (this._id) return false;
		if (this.course_id) return false;
		return true;
	},
	
	currentRegion: function(region) {
		var currentRegion = Session.get('region')
		return currentRegion && region._id == currentRegion;
	},
	
	replicaDateCount: function() {
		return Template.instance().replicaDates.get().length;
	},
	
	replicaDates: function() {
		return Template.instance().replicaDates.get();
	},
	
	mayEdit: function() {
		return mayEditEvent(Meteor.user(), this);
	},

	disableForPast: function() {
		return this.start > new Date ? '' : 'disabled';
	},

	kioskMode: function() {
		return Session.get('kiosk_mode');
	}
});

Template.eventDescritpionEdit.rendered = function() {
	new MediumEditor(this.firstNode);
}


var getEventStartMoment = function(template) {
	var startMoment =  moment(template.$('#edit_event_startdate').val())
	var startTime = template.$('#edit_event_starttime').val();
	var startTimeParts = startTime.split(":");
	var minutes = startTimeParts[1];
	var hours = startTimeParts[0];
	startMoment.hours(hours);
	startMoment.minutes(minutes);
	return startMoment;
}

var getEventEndMoment = function(template) {
	var startMoment = getEventStartMoment(template);
	var endMoment = moment(startMoment);
	var endtime = template.$('#edit_event_endtime').val();
	var endtimeParts = endtime.split(":");
	var minutes = endtimeParts[1];
	var hours = endtimeParts[0];
	endMoment.hours(hours);
	endMoment.minutes(minutes);
	if(endMoment.diff(startMoment) < 0) {
		endMoment.add(1,"day");
	}

	return endMoment;
}

var getEventDuration = function(template) {
	var duration = parseInt(template.$('#edit_event_duration').val(),10);

	return Math.max(0,duration);
}

var calculateEndMoment = function(startMoment, duration) {
	return moment(startMoment).add(duration, "minutes"); 
}

var setDurationInTemplate = function(template) {
	var startMoment = getEventStartMoment(template);
	var endMoment = getEventEndMoment(template);
	var duration = endMoment.diff(startMoment, "minutes");
	template.$("#edit_event_duration").val(duration);
};

var updateReplicas = function(template) {
	template.replicaDates.set(_.map(getEventFrequency(template), function(interval) { return interval[0]; } ));
}

var getEventFrequency = function(template) {
	var startDate = moment(template.$('.replicate_start').val());
	if (!startDate.isValid()) return [];
	var endDate   = moment(template.$('.replicate_end').val());
	if (!endDate.isValid()) return [];
	var frequency = template.$('.replicate_frequency').val();
	var diffDays = endDate.diff(startDate, "days");
	
	var unit = { once: 'days', daily: 'days', weekly: 'weeks' }[frequency];
	if (unit === undefined) return [];
	
	var eventStart = moment(template.data.start);
	var originDay = moment(eventStart).startOf('day');
	var eventEnd = moment(template.data.end);
	
	var now = moment();
	var repStart = moment(startDate).startOf('day');
	var dates = [];
	while(true) {
		var daysFromOriginal = repStart.diff(originDay, 'days');
		if (daysFromOriginal !=0 && repStart.isAfter(now)) {
			dates.push([
				moment(eventStart).add(daysFromOriginal, 'days'),
				moment(eventEnd).add(daysFromOriginal, 'days')
			]);
			if (frequency == 'once') break;
			if (dates.length >= 52) break;
		}

		repStart.add(1, unit);

		if (repStart.isAfter(endDate)) break;
	}

	return dates;
};


Template.event.events({
	'click button.eventDelete': function () {
		if (pleaseLogin()) return;
		if (confirm('Delete event "'+this.title+'"?')) {
			var title = this.title;
			var course = this.course_id;
			Meteor.call('removeEvent', this._id, function (error, eventRemoved){
				if (eventRemoved) {
					addMessage(mf('event.removed', { TITLE: title }, 'Sucessfully removed event "{TITLE}".'), 'success');
					if (course) Router.go('showCourse', { _id: course });
				} else {
					addMessage(mf('event.remove.error', { TITLE: title }, 'Error during removal of event "{TITLE}".'), 'danger');
				}
			});
			Template.instance().editing.set(false);
		}
	},
	
	'click button.eventEdit': function (event, template) {
		if (pleaseLogin()) return;
		Template.instance().editing.set(true);
	},
	
	'change .eventFileInput': function(event, template) {
		template.$('button.eventFileUpload').toggle(300);
	}, 
	'click button.eventFileUpload': function(event, template) {
		
		var fileEvent = $('.eventFileInput')[0].files;
		
		//FS.Utility.eachFile(fileEvent, function(file) {
		$.each( fileEvent, function(i,file){

			Files.insert(file, function (err, fileObj) {

				if (err){
					// add err handling
				} else {
					//adds a single file at a time at the moment
					var fileList = [
						{
							_id: fileObj._id,
							file : "/cfs/files/files/" + fileObj._id,
							filename : fileObj.original.name,
							filesize : fileObj.original.size,
						}
					];
					template.files = fileList;
					template.$('button.eventFileUpload').hide(50);
				
					var fileHtml = '<tr id="row-' + fileObj._id + '">';
					fileHtml += '<td style="padding-right:5px;">';
					fileHtml += '<a href="/cfs/files/files/' + fileObj._id + '" target="_blank">' + fileObj.original.name + '</a>';
					fileHtml += '</td><td><button role="button" class="fileDelete close" type="button">';
					fileHtml += '<span class="glyphicon glyphicon-remove"></span></button></td></tr>';
				
					$("table.file-list").append(fileHtml);
				
				}
			});
		});
	},
	
	'click button.fileDelete': function (event, template) {
		
		var fileid = this._id;
		var eventid = template.data._id;
		var filename = this.filename;
		//delete the actual file
		var fp = Files.remove(fileid);
		
		//hide file name
		var rowid = "tr#row-" + fileid;		
		$(rowid).hide();
		
		//remove file attribute from the event
		Meteor.call('removeFile', eventid, fileid, function (error, fileRemoved){
			if (fileRemoved) addMessage(mf('file.removed', { FILENAME:filename }, 'Sucessfully removed file {FILENAME}.'), 'success');
			else addMessage(mf('file.removed.fail', { FILENAME:filename }, "Couldn't remove file {FILENAME}."), 'danger');
		});		
	},
	
	
	'click button.saveEditEvent': function(event, template) {
		if (pleaseLogin()) return;

		var startMoment = getEventStartMoment(template);
		if(!startMoment) {
			alert("Date format must be of the form 2015-11-30");
			return null;
		}
		var duration = getEventDuration(template);

		//we need this check because duration is not an event property and it is reset to null after first save
		if(!duration){
			setDurationInTemplate(template);
			duration = getEventDuration(template);
		}
		var endMoment = calculateEndMoment(startMoment, duration);
		var nowMoment = moment();

		var editevent = {
			title: template.$('#edit_event_title').val(),
			description: template.$('#edit_event_description').html(),
			location: template.$('#edit_event_location').val(),
			room: template.$('#edit_event_room').val(),
			start: startMoment.toDate(),
			end:   endMoment.toDate(),
			files: this.files || Array() ,
		};

		var fileList = template.files;
		template.files = null;


		//check if file object is stored in the template object
		if(fileList != null){
			var tmp = [];		
			if(this.files){	
				$.each( this.files, function( i,fileObj ){
					tmp.push( fileObj );
				});
			}
			
			$.each( fileList, function( i, fileObj ){
				tmp.push( fileObj );
			});	
					
			editevent.files = tmp;
		}		
		
		
		var eventId = this._id;
		var isNew = !this._id;
		if (isNew) {
			eventId = '';

			if (startMoment.diff(nowMoment) < 0) {
				alert("Date must be in future");
				return;
			}

			if (this.course_id) {
				var course = Courses.findOne(this.course_id);
				editevent.region = course.region;
				editevent.course_id = this.course_id;
			} else {
				editevent.region = template.$('.region_select').val();
			}
		}
		
		var updateReplicas = template.$("input[name='updateReplicas']").is(':checked');
		
		Meteor.call('saveEvent', eventId, editevent, updateReplicas, function(error, eventId) {
			if (error) {
				addMessage(mf('event.saving.error', { ERROR: error }, 'Saving the event went wrong! Sorry about this. We encountered the following error: {ERROR}'), 'danger');
			} else {
				if (isNew) Router.go('showEvent', { _id: eventId });
				else addMessage(mf('event.saving.success', { TITLE: editevent.title }, 'Saved changes to event "{TITLE}".'), 'success');

				if (updateReplicas) {
					addMessage(mf('event.edit.replicates.success', { TITLE: editevent.title }, 'Replicas of "{TITLE}" also updated.'), 'success');
				}

				template.editing.set(false);
			}
		});
	},
	
	'click button.eventReplicate': function (event, template) {
		//get all startDates where the event should be created
		//this does not do anything yet other than generating the start-end times for a given period
		
		var dates = getEventFrequency(template);
		var success = true;	
		$.each( dates, function( i,eventTime ){
			
			/*create a new event for each time interval */
			var replicaEvent = {

				title: template.data.title,
				description: template.data.description,
				location: template.data.location,
				room: template.data.room, //|| '',
				start: eventTime[0].toDate(),
				end: eventTime[1].toDate(),
				files: template.data.files  || new Array(),
				mentors: template.data.mentors  ||  new Array(),
				host: template.data.host ||  new Array(),
				region: template.data.region || Session.get('region'),
				replicaOf: template.data.replicaOf || template.data._id, // delegate the same replicaOf ID for this replica if the replicated event is also a replica
			};
		
			var course_id = template.data.course_id;
			if(course_id){
				replicaEvent.course_id  = course_id; 
			}

			var eventId = '';
				
			Meteor.call('saveEvent', eventId, replicaEvent, function(error, eventId) {
				if (error) {
					addMessage(mf('event.replicate.error', { ERROR: error }, 'Replicating the event went wrong! Sorry about this. We encountered the following error: {ERROR}'), 'danger');
					success = false;
				} else {
				}
			});
		
		
		});
		if(success){
			template.$('div#eventReplicationMenu').slideUp(300);
			template.$('.eventReplicateMenu_close').hide(500);
			template.$('.eventReplicateMenu_open').show(500);
			addMessage(mf('event.replicate.success', { TITLE: template.data.title }, 'Replicated event "{TITLE}".', 'success'));

			Router.go('showEvent', { _id: template.data._id });
		}
			
	},
	'click button.cancelEditEvent': function () {
		if (this.new) history.back();
		Template.instance().editing.set(false);
	},

	'click .toggle_duration': function(event, template){

		template.$('.show_time_end').toggle(300);
		template.$('.show_duration').toggle(300);
	},

	'click .eventReplicateMenu_open': function(event, template){
		template.$('div#eventReplicationMenu').slideDown(300);
		template.$('.eventReplicateMenu_open').hide(500);
		template.$('.eventReplicateMenu_close').show(500);
	},
	'click .eventReplicateMenu_close': function(event, template){
		template.$('div#eventReplicationMenu').slideUp(300);
		template.$('.eventReplicateMenu_close').hide(500);
		template.$('.eventReplicateMenu_open').show(500);
	},

	'change #edit_event_duration, change #edit_event_starttime': function(event, template) {
		var startMoment = getEventStartMoment(template);
		var duration = getEventDuration(template);
		var endMoment = calculateEndMoment(startMoment, duration);
		template.$("#edit_event_endtime").val(endMoment.format("HH:mm"));
	},

	'change #edit_event_endtime': function(event, template) {
		setDurationInTemplate(template);
	},

	'change .updateReplicas, keyup .updateReplicas': function(event, template) {
		updateReplicas(template);
	}
});
