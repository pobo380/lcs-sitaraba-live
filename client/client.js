Twitch = {
  _player: null,
  get_player: function () {
    var player_ids = [
      "#live_site_player_flash",
      "#live_embed_player_flash",
      "#archive_site_player_flash",
      "#clip_embed_player_flash",
    ];
    return this._player = $(player_ids.join(",")).get(0);
  },
  player: function () {
    return _.isNull(this._player) ? this.get_player() : this._player;
  }
};

/**
 * Client Code
 */
Meteor.startup(function () {
  Backbone.history.start({pushState: true});

  Session.set("forwarding", 8 * 1000);

  /**
   * Resizing twitch player.
   */
  $(window).resize(function (e) {
    var player   = $(Twitch.player()),
        comments = $('#comments'),
        height   = player.width() * 0.5931;

    player.height(height);
    comments.height(height);
  });

  /**
   * Hook console.log and detect a event 'video loaded'.
   */
  var handle = null;
  Utils.hook_console_log_if(
    // detect event
    function (obj, console) {
      var val = _.first(obj);
      return val.LR_TITLE === "riotgames";
    },

    // after video loaded.
    function (obj, console) {
      // send request to get recording date and video length.
      var archive_id = Session.get("archive_id"),
          base_url   = "https://api.twitch.tv/kraken/videos/a" + archive_id,
          jsonp_url  = base_url + '?callback=Template.twitch_api.video_info_callback';

      var twitch_api_tag = $('#twitch_api'),
          script_tag     = $('<script type="text/javascript">');

      script_tag.attr('src', jsonp_url);

      twitch_api_tag.empty();
      twitch_api_tag.append(script_tag);

      // start to observe twitch player.
      var loaded_at = null, lasttime_at = null;

      if (! _.isNull(handle)) {
        Meteor.clearInterval(handle);
      }

      handle = Meteor.setInterval(function () {
        var play_time  = Twitch.player().get_time() * 1000,
            start_at   = Session.get("start_at"),
            current_at = start_at + play_time + Session.get("forwarding");

        loaded_at = _.max([loaded_at, current_at]);

        Session.set("current_at", current_at);
      }, 1 * 1000);
    });
});

/**
 * Routing
 */
var AppRouter = Backbone.Router.extend({
  routes: {
    ""            : "top_page",
    "archive/:id" : "archive_page",
    "live"        : "live",
  },

  top_page: function () {
  },

  archive_page: function (id) {
    Session.set("archive_id", id);
  },

  live : function () {
    Session.set("is_live", true);
    var one_hour_ago = (new Date()).getTime() - 1 * 60 * 60 * 1000;
    var future = (new Date("2100/1/1")).getTime();
    Meteor.subscribe("comments", one_hour_ago, future);
  }
});

window.router = new AppRouter;

/**
 * Templates
 */
Template.content.is_live = function () {
  return Session.get("is_live");
}

Template.archive_comments.comments = function () {
  var start_date   = new Date(Session.get("start_at")),
      current_date = new Date(Session.get("current_at"));

  var result = Comments.find({date: {$gte: start_date, $lte: current_date}},
                             {sort: {date: -1}, limit: 15});

  return result;
};

Template.live_comments.comments = function () {
  var result = Comments.find({}, {sort: {date: -1}, limit: 30});
  return result;
};

Template.archive_video.archive_id = function () {
  return Session.get("archive_id");
};

Template.time.current = function () {
  return _.isUndefined(Session.get("current_at"))
         ? ""
         : new Date(Session.get("current_at"));
}

Template.twitch_api.video_info_callback = function (video_info) {
  var start_at   = Date.parse(video_info.recorded_at),
      end_at     = start_at + video_info.length * 1000;

  console.log(video_info);

  Session.set('start_at', start_at);
  Session.set('end_at',   end_at);

  Meteor.subscribe("comments", start_at, end_at);
}
