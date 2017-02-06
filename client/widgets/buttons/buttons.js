Template.clearInputBtn.events({
	"click .js-clear-input": function(e) {
		var inputField = $(e.currentTarget).prev('input');

		inputField.val('');
		inputField.select();
	}
});
