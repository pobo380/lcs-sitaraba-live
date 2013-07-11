/**
 * Client Code
 */
Meteor.startup(function () {
  Backbone.history.start({pushState: true});

  Session.set("forwarding", 8 * 1000);

  Meteor.setTimeout(function (){
    Deps.autorun(function () {
      var archive_id = Session.get("archive_id"),
      base_url   = "https://api.twitch.tv/kraken/videos/a" + archive_id,
      jsonp_url  = base_url + '?callback=Template.twitch_api.video_info_callback';

      var twitch_api_tag = $('#twitch_api');
      var script_tag     = $('<script type="text/javascript">');

      script_tag.attr('src', jsonp_url);

      twitch_api_tag.empty();
      twitch_api_tag.append(script_tag);
    });

    var player_ids = [
      "#live_site_player_flash",
      "#archive_site_player_flash",
      "#jtv_archive_flash",
      "#live_embed_player_flash",
      "#clip_site_player_flash",
      "#clip_embed_player_flash"
    ];
    var player = $(player_ids.join(",")).get(0);

    Meteor.setInterval(function () {
      var play_time  = player.get_time() * 1000,
          start_at   = Session.get("start_at"),
          current_at = start_at + play_time + Session.get("forwarding");

      console.log(new Date(current_at));
      Session.set("current_at", current_at);
    }, 1 * 1000);
  }, 6 * 1000);
});

var AppRouter = Backbone.Router.extend({
  routes: {
    ""            : "top_page",
    "archive/:id" : "archive_page",
  },

  top_page: function () {
  },

  archive_page: function (id) {
    Session.set("archive_id", id);
  },
});

window.router = new AppRouter;

/**
 * Template
 */
Template.comments.greeting = function () {
  var start_date   = new Date(Session.get("start_at")),
      current_date = new Date(Session.get("current_at"));

  var result = Comments.find({date: {$gte: start_date, $lte: current_date}},
                             {sort: {date: -1}, limit: 30});

  return result;
};

Template.video.archive_id = function () {
  return Session.get("archive_id");
};

Template.time.current = function () {
  return new Date(Session.get("current_at"));
}

Template.video.cb = function () {console.log('aaaaa')};

Template.twitch_api.video_info_callback = function (video_info) {
  var start_at   = Date.parse(video_info.recorded_at),
      end_at     = start_at + video_info.length * 1000;

  console.log(video_info);

  Session.set('start_at', start_at);
  Session.set('end_at',   end_at);

  Meteor.subscribe("comments", start_at, end_at);
}
