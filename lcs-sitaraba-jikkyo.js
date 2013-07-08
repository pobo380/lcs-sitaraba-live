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
      var url = 'http://jbbs.livedoor.jp/netgame/7609/subject.txt';

      Meteor.http.get(url, {encoding: null}, function (err, result) {
        if (result.statusCode === 200) {
          var converted = Converter.convert(result.content).toString();
          var lines = converted.split("\n");
          var jikkyo_threads = _.filter(lines, function (line) {
            return (/(Twitch.*?LoL.*?youtube)/i).test(line);
          });
          var thread_ids = _.map(jikkyo_threads, function (thread) {
            return _.first(thread.split("."));
          });

          _.each(thread_ids, function (thread_id) {
            if (_.isUndefined(Threads.findOne({id: thread_id}))) {
              console.log("- Thread " + thread_id + " is added.");
              Threads.insert({id: thread_id, next_res: 1});
            }
          });

          console.log("## GET subject.txt done");
        }
        else {
          console.error("## GET subject.txt failed!!");
        }
      });
    }, 5 * 1000);

    // update messages
    Meteor.setInterval(function () {
      var base_url = 'http://jbbs.livedoor.jp/bbs/rawmode.cgi/netgame/7609/';
      var threads = Threads.find({next_res: {$lte: 1000}}, {limit: 6});

      _.each(threads.fetch(), function (thread) {
        var url = base_url + thread.id + '/' + thread.next_res + '-';
        console.log(url);

        Meteor.http.get(url, {encoding: null, timeout: 1000}, function (err, result) {
          if (!_.isNull(err)) { return console.error(err); }

          if (result.statusCode === 200) {
            if (_.isUndefined(result.content)) { return; }
            var converted = Converter.convert(result.content).toString();
            var lines = converted.split("\n").slice(0, -1);
            var parsed = _.map(lines, function (line) {
              var e = line.split("<>");
              return {
                thread_id: thread.id,
                res_idx:   parseInt(e[0]),
                name:      e[1],
                date:      new Date(Date.parse(e[3])),
                text:      e[4],
                res_id:    e[6]
              };
            });

            _.each(parsed, function (msg) {
              Messages.insert(msg);
            });

            Threads.update({id: thread.id}, {$set: {next_res: _.last(parsed).res_idx + 1}});

            console.log("GET " + url + " done.");
          }
          else {
            console.error("GET " + url + " failed. StatusCode: " + result.statusCode);
          }
        });
      });
    }, 0.8 * 1000);

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
