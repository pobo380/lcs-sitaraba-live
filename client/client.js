/**
 * Client Code
 */
Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});

var AppRouter = Backbone.Router.extend({
  routes: {
    ""           : "top_page",
    "video/:id" : "video_page",
  },
  top_page: function () {
  },
  video_page: function (id) {
    console.log(id);
  },
});

window.router = new AppRouter;

/**
 * Template
 */
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

Template.video.archive_id = function () {
  return 427066117;
};

//Deps.autorun(function () {
//  Meteor.subscribe("messages", Session.get("startAt"), Session.get("endAt"));
//});
