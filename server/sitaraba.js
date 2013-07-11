Sitaraba = {
  _base_url: 'http://jbbs.livedoor.jp',
  _converter: new Meteor.require('iconv').Iconv('euc-jp', 'utf-8//ignore'),

  _http_get_rawdata_to_utf8: function (url, options, callback) {
    options.encoding = null;

    var _this = this;
    Meteor.http.get(url, options, function (err, result) {
      if ((!err) && result.statusCode === 200) {
        result.content = _.isUndefined(result.content)
          ? ""
          : result.content = _this._converter.convert(result.content).toString();

        callback(null, result);
      }
      else { 
        err = err || Meteor.http._makeErrorByStatus(result.statusCode,
                                                    result.content);
        callback(err, null);
      }
    });
  },

  // Siataraba.get_subject.txt...) ;)
  // @return [{title: String, Id: int}, ..]
  get_subject_txt: function (category, board_id, options, callback) {
    var url = this._base_url + '/' + category + '/' + board_id + '/subject.txt';

    this._http_get_rawdata_to_utf8(url, options, function (err, result) {
      if (err) {
        callback(err, null);
      }
      else {
        var lines  = result.content.split("\n").slice(0, -1),
            parsed = _.map(lines, function (line) {
              var id_cgi_title = line.split(',');
              return {
                id:    parseInt(_.first(_.first(id_cgi_title).split('.'))),
                title: _.last(id_cgi_title)
              };
            });

        callback(null, parsed);
      }
    });
  },

  //
  // Siataraba.get_thread
  //
  // @return [
  //   {
  //     thread_id: Int,
  //     res_idx:   Int,
  //     name:      String,
  //     date:      Date,
  //     text:      String,
  //     res_id:    String,
  //   },
  //   ...
  // ]
  get_thread: function (category, board_id, thread_id, res_idx, options, callback) {
    var url = this._base_url + '/bbs/rawmode.cgi/'
            + category + '/' + board_id + '/' + thread_id + '/' + res_idx + '-';

    this._http_get_rawdata_to_utf8(url, options, function (err, result) {
      if (err) {
        callback(err, null);
      }
      else {
        // TODO: return empty Array
        var lines  = result.content.split("\n").slice(0, -1), // remove a empty string
            parsed = _.map(lines, function (line) {
              var splitted      = line.split("<>");
              var text_replaced = splitted[4].replace(/<br>/g, "\n") 
                                            .replace(/&gt;/g,  ">")
                                            .replace(/&lt;/g,  "<");

              return {
                thread_id: parseInt(thread_id),
                res_idx:   parseInt(splitted[0]),
                name:      splitted[1],
                date:      new Date(Date.parse(splitted[3])),
                text:      text_replaced,
                res_id:    splitted[6]
              };
            });

        callback(null, parsed);
      }
    });
  },
};
