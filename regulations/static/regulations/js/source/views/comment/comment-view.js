'use strict';

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
Backbone.$ = $;

var edit = require('prosemirror/dist/edit');
require('prosemirror/dist/menu/tooltipmenu');
require('prosemirror/dist/markdown');

var CommentModel = require('../../models/comment-model');
var CommentEvents = require('../../events/comment-events');
var AttachmentView = require('../../views/comment/attachment-view');
var comments = require('../../collections/comment-collection');

/**
 * Get a presigned upload URL.
 * The file extension (from the name) and size are validated
 * and the uploadURL is constrained by the file name and size.
 *
 * @param file {File} File to upload
 */
function getUploadUrl(file) {
  var prefix = window.APP_PREFIX || '/';
  return $.getJSON(
    prefix + 'comments/attachment',
    {size: file.size, name: file.name, type: file.type || 'application/octet-stream'}
  ).then(function(resp) {
    return resp;
  });
}

var CommentView = Backbone.View.extend({
  events: {
    'change input[type="file"]': 'addAttachments',
    'dragenter input[type="file"]': 'highlightDropzone',
    'dragleave input[type="file"]': 'unhighlightDropzone',
    'submit form': 'save'
  },

  initialize: function(options) {
    this.options = options;

    this.$context = this.$el.find('.comment-context');
    this.$container = this.$el.find('.editor-container');
    this.$input = this.$el.find('input[type="file"]');
    this.$attachments = this.$el.find('.comment-attachments');
    this.$status = this.$el.find('.status');

    this.editor = new edit.ProseMirror({
      tooltipMenu: true,
      place: this.$container.get(0),
      docFormat: 'markdown',
      doc: ''
    });

    this.attachmentViews = [];

    this.listenTo(CommentEvents, 'comment:target', this.target);
    this.listenTo(CommentEvents, 'attachment:remove', this.clearAttachment);

    this.setSection(options.section, options.tocId, options.label);
  },

  setSection: function(section, tocId, label, blank) {
    if (this.model) {
      this.stopListening(this.model);
    }
    var options = {id: section, tocId: tocId, label: label, docId: this.options.docId};
    this.model = blank ?
      new CommentModel(options) :
      comments.get(section) || new CommentModel(options);
    this.listenTo(this.model, 'destroy', this.setSection.bind(this, section, tocId, label, true));
    this.render();
  },

  target: function(options) {
    this.setSection(options.section, options.tocId, options.label);
    this.$context.empty();
    if (options.$parent) {
      this.$context.append(options.$parent);
    }
  },

  render: function() {
    this.editor.setContent(this.model.get('comment'), 'markdown');
    this.$attachments.empty();
    this.attachmentViews = this.model.get('files').map(function(file) {
      return new AttachmentView(_.extend({$parent: this.$attachments}, file));
    }.bind(this));
  },

  highlightDropzone: function() {
    this.$input.addClass('highlight');
  },

  unhighlightDropzone: function() {
    this.$input.removeClass('highlight');
  },

  addAttachments: function(e) {
    _.each(e.target.files, function(file) {
      this.addAttachment(file);
    }.bind(this));
    this.$input.val(null);
    this.unhighlightDropzone();
  },

  /**
   * Upload an attachment. Request a signed upload URL, PUT the file via
   * XMLHttpRequest, and pass the XHR to AttachmentView for rendering.
   *
   * @param {File} file File to upload
   */
  addAttachment: function(file) {
    getUploadUrl(file).then(function(resp) {
      var xhr = new XMLHttpRequest();
      this.attachmentViews.push(
        new AttachmentView({
          $parent: this.$attachments,
          previewUrl: resp.urls.get,
          name: file.name,
          size: file.size,
          key: resp.key,
          xhr: xhr
        })
      );
      xhr.open('PUT', resp.urls.put);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      // Metadata that was bound to the presigned URL has to be honored by passing
      // in the meta data fields with x-amz-meta- prefixes
      xhr.setRequestHeader('x-amz-meta-name', file.name);
      xhr.send(file);
    }.bind(this));
  },

  clearAttachment: function(key) {
    var index = _.findIndex(this.attachmentViews, function(view) {
      return view.options.key === key;
    });
    this.attachmentViews[index].remove();
    this.attachmentViews.splice(index, 1);
  },

  save: function(e) {
    e.preventDefault();
    this.model.set({
      comment: this.editor.getContent('markdown'),
      files: _.map(this.attachmentViews, function(view) {
        return {
          key: view.options.key,
          name: view.options.name,
          size: view.options.size,
          previewUrl: view.options.previewUrl
        };
      })
    });
    comments.add(this.model);
    this.model.save();
    this.$status.hide().html('Your comment was saved.').fadeIn();
  }
});

module.exports = CommentView;
