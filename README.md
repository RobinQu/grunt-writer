# grunt-writer

Convert markdowns and rendering using handlebars, with some custom recipes

The plugin doesn't play alone. If you are going to make a static site from markdown documents, try to use the awesome yeoman generator: [generator-pencil](https://github.com/RobinQu/generator-pencil) that have full power you need when dealing with a website.


## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-writer --save-dev
```

One the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-writer');
```

## The "writer" task

In your project's Gruntfile, add a section named `writer` to the data object passed into `grunt.initConfig()`.


```js
grunt.initConfig({
  writer: {
    your_target: {
      options: {
        // Target-specific options go here.
      },
      files: {
          // Specify the files you want to convert
      }
    }
  },
})
```

Example Config:

```js
grunt.initConfig({
  writer: {
    all: {
      files: [{
        expand: true,
        src: "**/*.md",
        dest: "dist",
        ext: ".html",
        cwd: "src/contents"
      }],
      options: {
        markdownOptions: {
          gfm: true,
          sanitize: false,
          breaks: true,
          smartypants: true,
          highlight: "auto",
          langPrefix: "hjs-"
        }
      }
    }
  },
})
```

### Options

All options are optional

### writerOptions

Handlebar rendering options.

* `writerOptions.datasource` root for JSON data files. `context.json` will loaded into template context automatically.
* `writerOptions.viewsource` view template root
* `writerOptions.partials` root for view partials
* `writerOptions.helpers` root for view helpers

#### markdownOptions

Options passed directly to [marked](https://github.com/chjj/marked)

#### context

A hash that stores local variables available in templates

### documentOptions

Options used to configure `Document` class


## Convert flow

1. Scan all markdowns
  * Grab meta data embbed in markdown
  * Build the documents tree, so the builder have general view of the markdown collection
2. Run the converter
  * Strip the meta section outside markdown documents
  * Convert markdown to html
  * Save the converted result to template context
3. Render the template
  * Using `Document` class accroding to metadata field `type` (default to [Document](/tasks/lib/document.js))
  * Find the handlebar template according to metadata field `template` (defaults to `article`)
  * Write out

## Write a markdown

Markdown can have its own metadata

    ---
    date: Tue May 13 2014 11:28:29 GMT+0800 (CST)
    author: Robin
    template: article
    title: A Brand New Page
    slug: a-brand-new-page
    ---
    Awesome content

Hypen-sperated contents are formated in YAML. It won't exist in the final HTML docuemnts but avaiable in template rendering context as `metadata` object.

## Document Class

#### Register a custom document class

In options of `Gruntfile.js`:

```
{
  "writer": {
    
  }
}
```