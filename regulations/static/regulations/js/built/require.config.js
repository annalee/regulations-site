var require = { "paths" :
{
        "jquery": "./lib/jquery/jquery",
        "underscore": "./lib/underscore/underscore",
        "backbone": "./lib/backbone/backbone",
        "samplejson": "../tests/grunt/js/fixtures/sample-json",
        "jquery-scrollstop": "./lib/jquery.scrollstop/index",
        "queryparams": "./lib/backbone.queryparams/index",
        "definition-view": "./views/sidebar/definition-view",
        "sub-head-view": "./views/header/sub-head-view",
        "sidebar-module-view": "./views/sidebar/sidebar-module-view",
        "toc-view": "./views/drawer/toc-view",
        "sidebar-view": "./views/sidebar/sidebar-view",
        "reg-view": "./views/main/reg-view",
        "diff-view": "./views/main/diff-view",
        "konami": "./lib/konami/index",
        "analytics-handler": "./views/analytics-handler-view",
        "header-view": "./views/header/header-view",
        "section-footer-view": "./views/main/section-footer-view",
        "drawer-view": "./views/drawer/drawer-view",
        "history-view": "./views/drawer/history-view",
        "search-view": "./views/drawer/search-view",
        "sxs-list-view": "./views/sidebar/sxs-list-view",
        "sidebar-list-view": "./views/sidebar/sidebar-list-view",
        "sxs-view": "./views/breakaway/sxs-view",
        "search-results-view": "./views/main/search-results-view",
        "main-view": "./views/main/main-view",
        "child-view": "./views/main/child-view",
        "help-view": "./views/sidebar/help-view",
        "breakaway-view": "./views/breakaway/breakaway-view",
        "drawer-tabs-view": "./views/drawer/drawer-tabs-view",
        "super-view": "./views/super-view",
        "drawer-events": "./events/drawer-events",
        "sidebar-events": "./events/sidebar-events",
        "header-events": "./events/header-events",
        "main-events": "./events/main-events",
        "breakaway-events": "./events/breakaway-events",
        "ga-events": "./events/ga-events",
        "search-model": "./models/search-model",
        "meta-model": "./models/meta-model",
        "reg-model": "./models/reg-model",
        "sxs-model": "./models/sxs-model",
        "diff-model": "./models/diff-model",
        "regs-router": "./router",
        "regs-helpers": "./helpers",
        "sidebar-model": "./models/sidebar-model"
    }
, "shim":
{
        "underscore": {
            "deps": [
                "jquery"
            ],
            "exports": "_"
        },
        "backbone": {
            "deps": [
                "underscore",
                "jquery"
            ],
            "exports": "Backbone"
        },
        "konami": {
            "exports": "Konami"
        },
        "jquery-scrollstop": {
            "deps": ["jquery"]
        }
}
}
