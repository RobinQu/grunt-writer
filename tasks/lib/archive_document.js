exports.init = function(grunt) {
  var Document = require("./document").init(grunt),
      debug = require("debug")("archive_document");
  
  var ArchiveDocument = Document.extend({
    
    archive: function() {
      var isNumber = function(t) { return !Number.isNaN(parseInt(t, 10)); },
          tree = this.templateContext.tree,
          traverse,
          archive;

      traverse = function(node) {
        var keys = Object.keys(node).sort().reverse(),
            obj = [];
        debug("node keys %s", keys);
        if(isNumber(keys[0])) {//date component
          keys.filter(isNumber).forEach(function(k) {
            debug("archive node %s", k);
            obj.push({
              key: parseInt(k, 10),
              content: traverse(node[k])
            });
          });
          return obj;
        }
        //text nodes
        return keys.map(function(k) {
          var n = node[k]["@"].file;
          // debug("node", n);
          debug("text node %s, title %s", n.ref, n.metadata.title);
          return n;
        }).sort(function(a, b) {
          //old -> new
          var t1 = new Date(a.metadata.date),
              t2 = new Date(b.metadata.date);
          debug("date diff %d, d1 %d, d2 %d", t1-t2, t1.getTime(), t2.getTime());
          return t2 - t1;
        });
      };
      archive = traverse(tree.blog);
      this.templateContext.archive = archive;
      return this.render();
    },
    
    write: function(callback) {
      debug("ouput archive");
      grunt.file.write(this.file.dest, this.archive());
      if(callback) {
        callback();
      }
    }
    
  });
  
  return ArchiveDocument;
};