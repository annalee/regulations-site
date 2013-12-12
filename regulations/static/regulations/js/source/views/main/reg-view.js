// **Extends** Backbone.View
//
// **Jurisdiction** .main-content
//
// **Usage** ```require(['reg-view'], function(RegView) {})```
define('reg-view', ['jquery', 'underscore', 'backbone', 'jquery-scrollstop', 'definition-view', 'reg-model', 'section-footer-view', 'regs-router', 'main-view', 'main-controller', 'header-controller', 'sidebar-controller', './regs-helpers', 'drawer-controller', 'child-view'], function($, _, Backbone, jQScroll, DefinitionView, RegModel, SectionFooterView, Router, Main, MainEvents, HeaderEvents, SidebarEvents, Helpers, DrawerEvents, ChildView) {
    'use strict';

    var RegView = ChildView.extend({
        el: '#content-wrapper',

        events: {
            'click .definition': 'termLinkHandler',
            'click .inline-interp-header': 'expandInterp',
            'click .definition.active': 'openDefinitionLinkHandler'
        },

        initialize: function() {
            this.controller = MainEvents;

            this.controller.on('definition:close', this.closeDefinition, this);
            this.controller.on('breakaway:open', this.hideContent, this);
            this.controller.on('breakaway:close', this.showContent, this);

            DrawerEvents.trigger('pane:change', 'table-of-contents');

            this.id = this.options.id;
            this.regVersion = this.options.regVersion;
            this.activeSection = this.options.id;
            this.$activeSection = '';
            this.$sections = {};
            this.url = this.id + '/' + this.options.regVersion;

            HeaderEvents.trigger('section:open', this.activeSection);

            if (Router.hasPushState) {
                this.events['click .inline-interpretation .section-link'] = 'openInterp';
                this.delegateEvents();
            }

            ChildView.prototype.initialize.apply(this, arguments);
        },

        // only concerned with resetting DOM, no matter
        // what way the definition was closed
        closeDefinition: function() {
            this.clearActiveTerms();
        },

        toggleDefinition: function($link) {
            this.setActiveTerm($link); 

            return this;
        },

        // content section key term link click handler
        termLinkHandler: function(e) {
            e.preventDefault();

            var $link = $(e.target),
                defId = $link.attr('data-definition');

            // if this link is already active, toggle def shut
            if ($link.data('active')) {
                SidebarEvents.trigger('definition:close');
                this.clearActiveTerms();
            }
            else {
                // if its the same definition, diff term link
                if ($('.open-definition').attr('id') === defId) {
                    this.toggleDefinition($link);
                }
                else {
                    // close old definition, if there is one
                    SidebarEvents.trigger('definition:close');
                    // open new definition
                    this.setActiveTerm($link);
                    SidebarEvents.trigger('definition:open', defId);
                }
            }

            return this;
        },

        // handler for when inline interpretation is clicked
        expandInterp: function(e) {
            // user can click anywhere in the header of a closed interp
            // for an open interp, they can click "hide" button or header
            e.stopPropagation();
            e.preventDefault();
            var header = $(e.currentTarget),
                section = header.parent(),
                button = header.find('.expand-button'),
                buttonText = header.find('.expand-text');

            section.toggleClass('open');
            header.next('.hidden').slideToggle();
            button.toggleClass('open');
            buttonText.html(section.hasClass('open') ? 'Hide' : 'Show');

            return this;
        },

        // Sets DOM back to neutral state
        clearActiveTerms: function() {
            this.$el.find('.active.definition')
                .removeClass('active')
                .removeData('active');
        },

        setActiveTerm: function($link) {
            this.clearActiveTerms();
            $link.addClass('active').data('active', 1);
        },

        openInterp: function(e) {
            e.preventDefault();

            var sectionId = $(e.currentTarget).data('linked-section'),
                subSectionId = $(e.currentTarget).data('linked-subsection');
            
            Router.navigate(sectionId + '/' + $('section[data-base-version]').data('base-version') + '#' + subSectionId, {trigger: true});
        },

        // when breakaway view loads
        hideContent: function() {
            this.$el.fadeOut(1000);
        },

        // when breakaway view unloads
        showContent: function() {
            this.$el.fadeIn();
        }
    });

    return RegView;
});
