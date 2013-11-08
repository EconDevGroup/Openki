// If the user exists at all
Template.userprofile.user_existent = function () {
	if (Meteor.users.findOne({_id:(Session.get('selected_user'))})){
		return("user_existent", true);
	}
	else {
		return("user_existent", false);
	}
};

// if userprofile is the same as the logged in user
Template.userprofile.ownuser = function () {
//	var user = Meteor.users.findOne({_id:(Session.get('selected_user'))})
//  var message = Session.get('selected_user').valueOf()
//	var message = Meteor.userId()
//	alert ('1212'+message)
	if (Session.get('selected_user') === Meteor.userId()){
		return("ownuser", true);
	}
	else {
		return("ownuser", false);
	}
};




Template.userprofile.selected_user_ID = function () {
	return Session.get('selected_user');
}



Template.userprofile.events({
'click input.sendmail': function () {

	var send_user = Meteor.user()
	if(send_user) {
		var send_userdata = {id:Meteor.userId(),username:Meteor.user().username}
		if(send_user.emails) {
			send_userdata.email = send_user.emails[0].address
		}

		var rec_user_id = Session.get('selected_user')
	    var rec_user = Meteor.users.findOne({_id:rec_user_id});
	    if(rec_user){
	      if(rec_user.username){
	        var rec_user = rec_user.username;
	      }
	    }


		var message = document.getElementById('emailmessage').value
		if (message.length >= '7'){
			Meteor.call('sendEmail',
			rec_user_id,
			'from',
			'privat-message from '+send_userdata.username,
			'hello '+rec_user+',     '+send_userdata.username+' sends you the following message:    "'+message+'"   \n    cheers!      his/hers direct contact is: '+send_userdata.email);

			alert ('email could have been sent')
			//todo: reset clear the form.
		}
		else {alert ('longer text please')}
	}
	else {alert ('login...')}
}
})





/*  //global setzen für klicks auf usernamen

   Template.YXZYXZYX.events({
    'click': function () {
      Router.setUser( this._id, this.name);
    }
  });

*/