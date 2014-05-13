exports.init = function(grunt) {
  "use strict";
  
  var fs = require("fs"),
      path = require("path"),
      _ = require("lodash"),
      hljs = require('highlight.js'),
      markdown = require("marked"),
      yaml = require("js-yaml"),
      Document = require("./document").init(grunt),
      handlebars = require("handlebars"),
      debug = require("debug")("writer"),
      util = require("util"),
      async = require("async");
  
  var MarkdownWriter = function(options) {
    this.tree = {};
    this.context = {};
    this.types = {};
    this.docs = [];
    
    this.initWriter(options.writerOptions);
    this.initRenderer();
    this.initMarkdown(options.markdownOptions);
    this.documentOptions = options.documentOptions;
  };
  
  MarkdownWriter.prototype.initWriter = function (options) {
    this.datasource = options.datasource;
    this.viewsource = options.viewsource;
    this.helpers = options.helpers;
    this.partials = options.partials;
  };

  MarkdownWriter.prototype.initRenderer = function () {
    var that = this,
        ext = ".hbs";
        
    //currently only hbs is supported
    this.renderer = handlebars;
    this.renderer.ext = ext;
    this.renderer.lookup = function(view) {
      return path.join(that.viewsource, view + this.ext);
    };
    debug("partials %s", this.partials);
    grunt.file.expand({
      cwd: this.partials,
      filter: "isFile"
    }, "*.hbs").forEach(function(name) {
      var n = name.replace(ext, "");
      debug("register partial %s", n);
      handlebars.registerPartial(n, grunt.file.read(path.join(that.partials, name)));
    });
    debug("helpers %s", this.helpers);
    grunt.file.expand({
      cwd: this.helpers,
      filter: "isFile"
    }, "*.js").forEach(function(name) {
      var n = name.replace(".js", "");
      debug("register helper %s", n);
      handlebars.registerHelper(n, require(path.join(that.helpers, name)));
    });
  };
  
  MarkdownWriter.prototype.initMarkdown = function (options) {
    var codeLines = options.codeLines;
    var shouldWrap = codeLines && codeLines.before && codeLines.after;
    function wrapLines(code) {
      var out = [];
      var before = codeLines.before;
      var after = codeLines.after;
      code = code.split('\n');
      code.forEach(function(line) {
        out.push(before+line+after);
        });
      return out.join('\n');
    }

    if(typeof options.highlight === 'string') {
      if(options.highlight === 'auto') {
        options.highlight = function(code) {
          var out = hljs.highlightAuto(code).value;
          if(shouldWrap) {
            out = wrapLines(out);
          }
          return out;
        };
      } else if (options.highlight === 'manual') {
        options.highlight = function(code, lang) {
          var out = code;
          try {
            out = hljs.highlight(lang, code).value;
          } catch(e) {
            out = hljs.highlightAuto(code).value;
          }
          if(shouldWrap) {
            out = wrapLines(out);
          }
          return out;
        };
      }

    }
    markdown.setOptions(options);
    this.markdown = markdown;
    handlebars.registerHelper("md", function(src) {
      if(!src) {
        return "";
      }
      return new handlebars.SafeString(markdown(src));
    });
  };
  
  MarkdownWriter.prototype.loadData = function (p) {
    var data;
    if(typeof p === "string") {//as a json path
      data = grunt.file.readJSON(path.join(this.datasource, p));
    } else {
      data = p;
    }
    debug("load data", p);
    _.extend(this.context, data);
  };
  
  MarkdownWriter.prototype.loadFiles = function (files, callback) {
    debug("%d files loaded ", files.length);
    var that = this;
    async.eachLimit(files, 25, function(file, next) {
      file.metadata = that.extractMetadata(grunt.file.read(file.src));
      file.src = util.isArray(file.src) ? file.src[0] : file.src;
      file.ref = (file.src).replace(file.orig.cwd, "").replace(/^\//, "");
      file.filename = file.src.split("/").pop();
      that.docs.push(file);
      next();
    }, function() {
      //sort by file path
      that.docs.sort(function(a, b) {
        if(a.src < b.src) {
          return 1;
        }
        if(a.src > b.src) {
          return -1;
        }
        return 0;
      });
      if(callback) {
        callback(null, that.docs);
      }
    });
  };
  
  MarkdownWriter.prototype.extractMetadata = function (src) {
    var result, markdown, parsed, metadata;
    if (src.slice(0, 3) === "---") {
      result = src.match(/^-{3,}\s([\s\S]*?)-{3,}(\s[\s\S]*|\s?)$/);
      if (result && result.length === 3) {
        metadata = result[1];
        markdown = result[2];
      }
      // debug("metadata match %s", metadata);
    }
    try {
      parsed = yaml.load(metadata);
    } catch(e) {
      debug("yaml error %s", e);
      parsed = {};
    } finally {
    }
    result = markdown.match(/<\!\-\-\s*more\s*\-\->/);
    if(result && result.index) {
      debug("summary match %d", result.index);
      parsed.summary = markdown.substr(0, result.index);
    } else {//full document read
      parsed.summary = markdown;
    }
    return parsed;
  };
  
  MarkdownWriter.prototype.run = function (files, callback) {
    // assert(this.docs.length, "should have some documents to run");
    var that = this;
    that.loadFiles(files, function(e, docs) {
      if(e) {
        grunt.log.writeln("failed to load files");
        throw e;
      }
      // debug("docs %s", docs.map(function(doc) { return doc.src; }));
      // Iterate over all specified file groups.
      async.eachLimit(docs, 25, function (doc, next) {
        // 
        // grunt.log.writeln('File "' + doc.dest + '" created.');
        // debug("docs", doc);
        that.convert(doc, that.documentOptions).write(next);
      }, callback);
    });
    
  };
  
  MarkdownWriter.prototype.insert = function (options) {
    var ps = options.path.split("/"),
        p, current, i, len, isDir;
        
    current = this.tree;
    debug("path array: %s, base: %s", ps, options.base);
    for(i=0,len=ps.length; i<len-1; i++) {
      p = ps[i];
      // debug("current slice %s", ps.slice(0, i));
      isDir = fs.statSync(
        i > 0 ? path.join(options.base, ps.slice(0,i).join(path.sep)) : options.base
      ).isDirectory();
      if(isDir) {
        current[p] = current[p] || {};
        // current[p].parent = current;
        current = current[p];
      }
    }
    current[ps[i] === "index.md" ? "@" : ps[i]] = options.doc;
  };
  
  MarkdownWriter.prototype.convert = function (doc, options) {
    // merge template data
    options = options || {};
    if(doc.metadata.docOptions) {
      _.extend(options, doc.metadata.docOptions);
      delete doc.metadata.docOptions;//prevent circling
    }
    options.templateContext = _.extend(Object.create(this.context), {
      //data for current doc
      filepath: doc.src,
      reference: doc.ref,
      metadata: doc.metadata,
      filename: doc.src.split("/").pop(),
      //overall structure data
      docs: this.docs,
      tree: this.tree
    });
    
    if(doc.metadata.ext) {
      doc.dest = doc.dest.replace(/\.[^\.]+$/, doc.metadata.ext);
      doc.filename = doc.dest.split("/").pop();
    }
    
    options.file = doc;
    options.renderer = this.renderer;
    options.markdown = this.markdown;
    var docType = doc.metadata.type,
        DocClass;
    if(docType && MarkdownWriter.types[docType]) {//Custom doc type
      DocClass = MarkdownWriter.types[docType];
    } else {
      DocClass = Document;
    }
    debug("convert doc type %s, ref %s", docType || "document", doc.ref);
    var document = new DocClass(options);
    // var relativePath = (doc.src).replace(doc.orig.cwd, "").replace(/^\//, "");
    this.insert({
      path: doc.ref,
      base: doc.orig.cwd,
      doc: document
    });
    return document;
  };
  
  
  MarkdownWriter.types = {
    index: require("./index_document").init(grunt),
    archive: require("./archive_document").init(grunt)
  };
  MarkdownWriter.registerDocumentType = function (type, Document) {
    this.types[type] = Document;
  };
  
  return MarkdownWriter;
  
  
};