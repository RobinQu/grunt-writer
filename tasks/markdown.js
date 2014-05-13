/*global __dirname */

module.exports = function(grunt) {
  'use strict';

  var path = require('path');

  // Internal lib.
  var Writer = require('./lib/writer').init(grunt);

  grunt.registerMultiTask('writer', 'Compiles markdown files into html.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      markdownOptions: {
        highlight: "auto"
      },
      writerOptions: {
        datasource: path.resolve("src/data"),
        viewsource: path.resolve("src/templates"),
        partials: path.resolve("src/templates/partials"),
        helpers: path.resolve("src/templates/helpers")
      },
      documentOptions: {
        pagination: {
          limit: 5
        },
        pagesOutputDir: path.resolve("dist/page")
      }
      
    });
    
    var writer = new Writer(options), k;
    if(options.documentTypes) {//register external doc type
      for(k in options.documentTypes) {
        if(options.documentTypes.hasOwnProperty(k)) {
          writer.registerDocumentType(k, options.documentTypes[k]);
        }
      }
    }
    writer.loadData("context.json");
    if(options.context) {
      writer.loadData(options.context);
    }
    writer.run(this.files, this.async());
  });

};
