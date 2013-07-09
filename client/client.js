/**
 * Client Code
 */
Meteor.startup(function () {
});

Template.comments.greeting = function () {
  return Messages.find({}, {sort: {date: -1}});
};

Template.comments.events({
  'change input[type=text]' : function (e, template) {
    Session.set(e.target.id, e.target.value);
  },
  'click input[type=button]' : function (e, template) {
    console.log(Session.get("startAt"));
    console.log(Session.get("endAt"));
    Meteor.subscribe("messages", Session.get("startAt"), Session.get("endAt"));
  }
});

//Deps.autorun(function () {
//  Meteor.subscribe("messages", Session.get("startAt"), Session.get("endAt"));
//});
