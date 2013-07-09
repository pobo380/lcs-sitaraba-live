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
}

/**
 * Server Code
 */
if (Meteor.isServer) {
  Meteor.startup(function () {
    var Converter = (new Meteor.require('iconv').Iconv('euc-jp', 'utf-8//ignore'))
    var Threads   = new Meteor.Collection("threads");

    /**
     * update thread list from subject.txt
     */
    Utils.async.repeat_interval(10 * 1000, [function (callback) {
      Sitaraba.get_subject_txt('netgame', '7609', {}, function (err, threads) {
        if (!_.isNull(err)) {
          console.error("## GET subject.txt failed.");
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
            console.log("thread" + thread.id + " added.");
          });

        console.log("## Thread list updated.");
      });

      callback(null, null);
    }], function (err, result) {
      if (err) { console.log(err) };
    });

    /**
     * Update messages from thread list
     */
    var get_thread_func = function (thread) {
      return function (callback) {
        Sitaraba.get_thread('netgame', '7609', thread.id, thread.next_res,
                            {timeout: 1000}, function (err, posts) {
          if (err) {
            if (err.code == 'ESOCKETTIMEDOUT') {
              console.error("GET " + thread.id + " timeout.");
              err = null;
            }
            else {
              console.error("GET " + thread.id + " failed.");
            }

            console.error(err);
            callback(err, null);
            return; 
          }

          if (_.isEmpty(posts)) {
            console.log("GET " + thread.id + " up-to-date.");
            callback(null, null);
            return;
          }

          _.each(posts, function (post) {
            Messages.insert(post);
          });

          Threads.update({id: thread.id}, {$set: {next_res: _.last(posts).res_idx + 1}});

          console.log("GET " + thread.id + " done.");

          callback(null, null);
        });
      };
    };

    var get_threads_task_func = function (tasks) {
      return function (callback) {
        Utils.async.parallel_wait(1 * 1000, tasks, function (err, result) {
          callback(err, null);
        });
      };
    };

    async.forever(function (next) {
      var threads = Threads.find({next_res: {$lte: 1000}});
      var tasks   = _.chain(threads.fetch())
                     .map(get_thread_func)
                     .each_slice(3)
                     .map(get_threads_task_func)
                     .value();
      

      if (_.isEmpty(tasks)) {
        Meteor.setTimeout(function () { next() }, 3 * 1000);
      }
      else {
        async.series(tasks, function (err, result) {
          if (err) {
            Meteor.setTimeout(function () { next() }, 15 * 1000);
          }
          else {
            next();
          }
        });
      }
    });


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
