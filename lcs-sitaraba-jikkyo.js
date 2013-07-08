/**
 * Common
 */
var Messages = new Meteor.Collection("messages");

/**
 * Client Code
 */
if (Meteor.isClient) {
  Meteor.startup(function () {
  });

  Template.hello.greeting = function () {
    return Messages.find({}, {sort: {date: -1}});
  };

  Template.hello.events({
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
}

/**
 * Server Code
 */
if (Meteor.isServer) {
  Meteor.startup(function () {
    var Converter = (new Meteor.require('iconv').Iconv('euc-jp', 'utf-8//ignore'))
    var Threads   = new Meteor.Collection("threads");

    // update thread list.
    Meteor.setInterval(function () {
      Sitaraba.get_subject_txt('netgame', '7609', {}, function (err, threads) {
        if (!_.isNull(err)) {
          console.error("## GET " + url + " failed.");
          console.error(err);
          return;
        }

        _.chain(threads)
          .filter(function (thread) {
            return (/(Twitch.*?LoL.*?youtube)/i).test(thread.title);
          })
          .uniq(false, function (thread) {
            return thread.id;
          })
          .filter(function (thread) {
            return _.isUndefined(Threads.findOne({id: thread.id}));
          })
          .each(function (thread) {
            Threads.insert({id: thread.id, next_res: 1, title: thread.title});
          });

          console.log("## GET subject.txt done");
      });
    }, 5 * 1000);

    // update messages
    Meteor.setInterval(function () {
      var threads = Threads.find({next_res: {$lte: 1000}}, {limit: 6});

      _.each(threads.fetch(), function (thread) {
        Sitaraba.get_thread('netgame', '7609', thread.id, thread.next_res,
                            {timeout: 1000}, function (err, posts) {
          if (!_.isNull(err)) {
            console.error("GET " + thread.id + " failed.");
            console.error(err);
            return; 
          }

          if (_.isEmpty(posts)) {
            console.log("GET " + thread.id + " up-to-date.");
            return;
          }

          _.each(posts, function (post) {
            Messages.insert(post);
          });

          console.log(_.last(posts));

          Threads.update({id: thread.id}, {$set: {next_res: _.last(posts).res_idx + 1}});

          console.log("GET " + thread.id + " done.");
        });
      });
    }, 2 * 1000);

    Meteor.publish("messages", function(startAt, endAt) {
      var startDate = new Date(Date.parse(startAt)),
          endDate   = new Date(Date.parse(endAt));

      var result = Messages.find({date: {$gte: startDate, $lte: endDate}});

      console.log('---------------------');
      console.log(startDate);
      console.log(endDate);
      console.log(startAt);
      console.log(endAt);
      console.log(result.fetch());
      return result;
    });
  });
}
