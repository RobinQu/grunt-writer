exports.init = function(grunt) {
  var Document = require("./document").init(grunt),
      assert = require("assert");
  return Document.extend({
    handleMarkdown: function() {
      assert.fail("should never run PageDocument::handleMarkdown");
    }
  });
};