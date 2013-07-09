/**
 * Client Code
 */
Meteor.startup(function () {
  Backbone.history.start({pushState: true});

  Deps.autorun(function () {
    var archive_id = Session.get("archive_id"),
    base_url   = "https://api.twitch.tv/kraken/videos/a" + archive_id,
    jsonp_url  = base_url + '?callback=Template.twitch_api.video_callback';

    var twitch_api_tag = $('#twitch_api');
    var script_tag     = $('<script type="text/javascript">');

    script_tag.attr('src', jsonp_url);

    twitch_api_tag.empty();
    twitch_api_tag.append(script_tag);
  });
});

var AppRouter = Backbone.Router.extend({
  routes: {
    ""            : "top_page",
    "archive/:id" : "archive_page",
  },
  top_page: function () {
  },
  archive_page: function (id) {
    console.log(id);
    Session.set("archive_id", id);
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
  return Session.get("archive_id");
};

Template.twitch_api.video_callback = function (video_info) {
  console.log(video_info);
}

//Deps.autorun(function () {
//  Meteor.subscribe("messages", Session.get("startAt"), Session.get("endAt"));
//});
