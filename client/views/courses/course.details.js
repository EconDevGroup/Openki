
/* ------------------------- Details ------------------------- */

  Template.coursedetails.isEditing = function () {
    return Session.get("isEditing");
  };


  Template.coursedetails.events({
    'click input.inc': function () {
      // bei click auf das input-element mit der class "inc",
      // erh�he den score dieses Kurses um eins
      Courses.update(Session.get("selected_course"), {$inc: {score: 1}});
    },

    'click input.get_subscriber': function () {
    	// für Kurs anmelden (array: subscribers)
     	  Courses.update(Session.get("selected_course"), {$addToSet:{subscribers: Meteor.userId()}});

    },

    'click input.remove_subscriber': function () {
    	// von Kurs abmelden
    	Courses.update(Session.get("selected_course"), {$pull:{subscribers: Meteor.userId()}});
       },

    'click input.get_organisator': function () {
    	// Orga werden
    	Courses.update(Session.get("selected_course"), {$set:{organisator: Meteor.userId()}});
    },


    'click input.remove_organisator': function () {
    	// Orga künden
      	Courses.update(Session.get("selected_course"), {$set:{organisator: ""}});
      },


    'click input.del': function () {
      // bei click auf das input-element mit der class "del"
      // l�sche den ausgew�hlten kurs
      Courses.remove(Session.get("selected_course"));
      // select new cours:
      Session.set("selected_course", Courses.find().fetch()[0]._id); //select first of db
      // erstelle neue, wenns keine mehr gibt:
      createCoursesIfNone();
     },
    'click input.edit': function () {
      // gehe in den edit-mode, siehe html
      if(Meteor.userId())
      	      Session.set("isEditing", true);
      else
      	      alert("Security robot say: sign in");
    },
    'click input.save': function () {
      // wenn im edit-mode abgespeichert wird, update db und verlasse den edit-mode
      Courses.update(Session.get("selected_course"), {$set: {description: $('#editform_description').val(), tags: $('#editform_tags').val(), categories: $('#editform_category').val(), name: $('#editform_name').val(), subscribers_min: $('#editform_subscr_min').val(), subscribers_max: $('#editform_subscr_max').val()}});
      Session.set("isEditing", false);
    },
    'click input.cancel': function() {
      Session.set("isEditing", false);
    }
  });



// nur für css

  Template.coursedetails.subscribers_status = function() {
  	  //CSS status: genug anmeldungen? "ok" "notyet"
  	var course=Courses.findOne(Session.get("selected_course"));
  	if(course){
  	  if(course.subscribers){
  	  	  if(course.subscribers.length>=course.subscribers_min){
			  return "ok";
		  }else{
			  return "notyet";
		  }
  	  }
  	}
  }
  
// muss zuert aufruf abfragen , obs couses existiertfunktionniert hat  indexOf
// zuerst genereller aufruf machen weil courses muss ready sein
// dann könte man direkt machen
// wenn man fetch macht würds funktionnieren  -- oder auch nicht.
// find one gibt nicht Course sondern Curser zurück (asynchron data loader xyz)
// gibt nichts zurück, weis asynchon ist

	Template.coursedetails.isSubscribed = function () {
		//ist User im subscribers-Array?
		var course = Courses.findOne(Session.get("selected_course"));
		return course && course.subscribers.indexOf(Meteor.userId()) > -1
	}


   Template.coursedetails.organisator = function() {
       course=Courses.findOne(Session.get("selected_course"));
       if(course)
           return course.organisator;
           //return display_username(course.organisator);
           
  
   }


   Template.coursedetails.isOrganisator = function () {
       course=Courses.findOne(Session.get("selected_course"));
       if(course){
          if (course.organisator==Meteor.userId()){
              return  true;
            }else{
                return false;
            }
        }
  };

  

 /*
  Template.coursedetails.helpers({
  subscribers: function () {
     return Courses.findOne(Session.get("selected_course")).subscribers;
  	  }
  });
 */

// müsste eigentlich zuobrst hin (HauptFunktion) 
 
 
  Template.coursedetails.selected_name = function () {
    // gib den name und die description des ausgew�hlten kurses zur�ck
    // wird aufgerufen, sobald "selected_course" ändert (z.B. routing)
    var course = Courses.findOne(Session.get("selected_course"));
    if(course){

    	    //Strub: es lädt die daten nicht neu, wenn man von der liste her kommt???
    	    //var createdby=display_username(course.createdby);
    	    var createdby=course.createdby;
    	    // var time_created= format_date(course.time_created);
    	    var time_created= course.time_created;

          var categories = display_categoryname(course.categories);

   if(course.subscribers){
       var subscribers_usernames=[];
       course.subscribers.forEach(function(userid){  //könnte wie oben gelöst werden als vorabfrage
          subscribers_usernames.push(display_username(userid));
       });
   	   var subscriber_count=  course.subscribers.length*1;
   }else{
   	   var subscriber_count= 0;
   }
    return course && {name: course.name, desc: course.description, tags: course.tags, categories: categories, score: course.score,  createdby: createdby, time_created: time_created, subscribers_min: course.subscribers_min, subscribers_max: course.subscribers_max, subscriber_count:subscriber_count, subscribers:subscribers_usernames};
  }};


