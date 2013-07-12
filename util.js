// each_slice
// http://stackoverflow.com/questions/10249658/equivalent-of-ruby-enumerableeach-slice-in-javascript
_.mixin({
  each_slice: function(obj, slice_size, iterator, context) {
    if (_.isUndefined(iterator)) {
      var sliced = [];

      for (var i=0, l=obj.length; i < l; i+=slice_size) {
        sliced.push(obj.slice(i,i+slice_size));
      }
      return sliced;
    }
    else {
      for (var i=0, l=obj.length; i < l; i+=slice_size) {
        iterator.call(context, obj.slice(i,i+slice_size), i, obj);
      }
    }
  }
});



Utils = {
  // hook console.log
  hook_console_log: function (callback) {
    var console  = window.console,
        _log     = console ? console.log : function(){},
        _console = {log: function () {_log.apply(console, arguments)} };

    console.log = function () {
      callback(arguments, _console);
      _log.apply(console, arguments);
    };
  },
  
  hook_console_log_if: function (test, callback) {
    this.hook_console_log(function (obj, console) {
      if (test(obj, console)) {
        callback(obj, console);
      }
    });
  },
   
  // enhance async.js for Meteor.
  async : {
    _wait_func: function (ms) {
      return function (callback) {
        Meteor.setTimeout(function () { callback(null, null) }, ms);
      };
    },

    _compact_func: function (callback) {
      return function (err, result) {
        callback(err, _.compact(result));
      };
    },

    parallel_wait: function (ms, tasks, callback) {
      async.parallel(tasks.concat([this._wait_func(ms)]),
                     this._compact_func(callback));
    },

    repeat_interval: function (ms, tasks, callback) {
      var _this = this;
      async.forever(function (next) {
        _this.parallel_wait(ms, tasks, function (err, result) {
          callback(err, result);
          next();
        });
      }, function (err) {
        callback(err, null);
      });
    },
  }
};
