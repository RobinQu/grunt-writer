exports.init = function(grunt) {
  var Document = require("./document").init(grunt),
      PageDocument = require("./page_document").init(grunt),
      _ = require("lodash"),
      debug = require("debug")("index_document"),
      async = require("async"),
      assert = require("assert"),
      path = require("path");
  
  var IndexDocument = Document.extend({
    
    init: function(options) {
      Document.prototype.init.call(this, options);
      this.targetDirName = options.targetDirName || "blog";
      this.pagesOutputDir = options.pagesOutputDir;
      assert(this.pagesOutputDir, "should provide destination of pages");
      
      //filter post docs
      this.files = this.templateContext.docs.filter(function(file) {
        return file.ref.indexOf(this.targetDirName) === 0;
      }.bind(this));
      
      //update pagination info
      this.templateContext.pagination = options.pagination;
      this.templateContext.pagination.total = this.templateContext.pagination.current = Math.ceil(this.files.length / options.pagination.limit);
      
      debug("posts total %d, pages %d, limit %d", this.files.length, this.templateContext.pagination.total, this.templateContext.pagination.limit);
      
    },
    
    handleMarkdown: function() {
      assert.fail("should never run IndexDocument::handleMarkdown");
    },
    
    homepage: function(callback) {
      var doc = this.subdoc(),
          that = this;
          
      debug("output index %s", this.file.dest);
      //update pagination info
      (function(context) {
        context.home = true;
        context.posts = that.files.slice(0, context.pagination.limit);
        context.pagination.current = 1;
      }(doc.templateContext));
      // debug(doc.templateContext);
      grunt.file.write(that.file.dest, doc.render());
      if(callback) {
        callback();
      }
    },
    
    
    //render virtual posts page
    posts: function(callback) {
      var that = this, 
          doc,
          total = this.templateContext.pagination.total,
          i = total;
          
      async.whilst(function() {
        return i;
      }, function(next) {
        doc = that.subdoc();
        doc.file.dest = path.join(that.pagesOutputDir, i.toString(), "index.html");
        doc.file.ref = ["page", i].join("/");
        debug("write page file %s, ref %s, %d of %d", doc.file.dest, doc.file.ref, i, total);
        
        (function(context) {
          var limit = context.pagination.limit;
          context.home = false;
          context.pagination.current = i;
          context.posts = that.files.slice((i-1)*limit, i*limit);
        }(doc.templateContext));
        
        grunt.file.write(doc.file.dest, doc.render("page"));
        i--;
        if(next) {
          next();
        }
      }, callback);
    },
    
    subdoc: function(options) {
      return new PageDocument(_.extend({
        //create new context form current context for subdocs
        templateContext: Object.create(this.templateContext),
        renderer: this.renderer,
        file: Object.create(this.file)
      }, options || {}));
    },
    
    write: function(callback) {
      debug("write index and pages");
      async.series([
        this.homepage.bind(this),
        this.posts.bind(this)
      ], callback);
    }
    
  });
  
  return IndexDocument;
  
};