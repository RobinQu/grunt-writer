exports.init = function(grunt) {
  
  var _ = require("lodash"),
      debug = require("debug")("document"),
      assert = require("assert");
  
  var Document = function(options) {
    this.init(options);
  };
  
  Document.extend = function(props, statics) {
    var F = function() {
      Document.apply(this, arguments);
    };
    F.prototype = _.extend(Object.create(Document.prototype), props || {});
    _.extend(F, statics || {});
    return F;
  };
  
  Document.prototype.init = function (options) {
    // template context object
    this.templateContext = options.templateContext;
    // File object
    this.file = options.file;
    // handlebar instance
    this.renderer = options.renderer;
    // markdown instance
    this.markdown = options.markdown;
  };
  
  Document.prototype.write = function (callback) {
    debug("output %s", this.file.dest);
    grunt.file.write(this.file.dest, this.handleMarkdown());
    if(callback) {
      callback();
    }
  };
  
  Document.prototype.stripMetadata = function (src) {
    var result, markdown;
    if (src.slice(0, 3) === "---") {
      result = src.match(/^-{3,}\s([\s\S]*?)-{3,}(\s[\s\S]*|\s?)$/);
      if (result && result.length === 3) {
        markdown = result[2];
      }
    }
    return markdown;
  };
  
  Document.prototype.handleMarkdown = function () {
    var fp = this.file.src;
    var html = null;
    // var codeLines = this.codeLines;
    // var shouldWrap = codeLines && codeLines.before && codeLines.after;
    var src = grunt.file.read(fp);
    var templateContext = this.templateContext;

    grunt.verbose.write('Marking down...');
    
    //remove yaml texts
    src = this.stripMetadata(src);
    
    html = this.markdown(src);

    //replace 'more' placeholder
    html = html.replace(/<\!\-\-\s*more\s*\-\->/, "<span id=\"more\"></span>");

    templateContext.content = html;
    
    return this.render();
  };
  
  Document.prototype.render = function (view) {
    view = view || this.templateContext.metadata.template;
    if(this.templateContext[view] === undefined) {//if not set
      this.templateContext[view] = true;
    }
    assert(view, "should provide a template view");
    var template = this.renderer.compile(grunt.file.read(this.renderer.lookup(view)));
    return template(this.templateContext);
  };
  
  return Document;
};