if(typeof(jQuery) === "undefined"){
	throw("Unable to find jQuery");
}

if(typeof(jasmineTree) === "undefined"){
	var jasmineTree = {};
}

(function(){
	"use strict";

	jasmineTree.version = "0.1";

	var CONST = {
		CSS_CLASSES: {
			TRIGGER: "jasmine-tree-trigger",
			TOOLBAR: "jasmine-tree-toolbar",
			BUTTON: "jasmine-tree-button",
			NODE_OPENED: "jasmine-tree-opennode"
		},
		SELECTORS: {
			FIRST_CHILD: ":first-child",
			SUMMARY: ".summary",
			ROOT_SUITE: ".summary > .suite",
			NODE_TITLE: "> li.suite-detail",
			NODE_SPECS: "> ul.specs",
			NODE_SUITES: "> ul.suite"
		},
		TEXT: {
			COLLAPSE: "Collapse All",
			EXPAND: "Expand All",
			SEPARATOR: " | ",
			PLUS: "+",
			MINUS: "-"
		},
		FILTER_REGEXP: (new RegExp("[?&]spec=([^&]*)"))
	};

	/** @type {array.<jasmineTree.Suite>} */
	var rootSuites = [];

	/**
	 * Returns the value of the "spec" parameter in the querystring. Null if it's not specified
	 * @returns {null|string}
	 */
	jasmineTree.getSpecFilter = function(){
		var match = CONST.FILTER_REGEXP.exec(window.location.search);
		return match && decodeURIComponent(match[1].replace(/\+/g, " "));
	};

	/**
	 * Collapse all the suites
	 */
	jasmineTree.collapseAll = function(){
		for(var i = 0; i < rootSuites.length; i++){
			rootSuites[i].collapse();
		}
	};

	/**
	 * Expand all the suites
	 */
	jasmineTree.expandAll = function(){
		for(var i = 0; i < rootSuites.length; i++){
			rootSuites[i].expand();
		}
	};

	/**
	 * Insert toolbar with expand/collapse all buttons
	 * @param {array.<jasmineTree.Suite>} rootSuites
	 */
	jasmineTree.addToolbar = function(rootSuites){

		var toolbar = jQuery("<div></div>").addClass(CONST.CSS_CLASSES.TOOLBAR);
		var collapse = jQuery("<span></span>").addClass(CONST.CSS_CLASSES.BUTTON).text(CONST.TEXT.COLLAPSE);
		toolbar.append(collapse);
		var separator = jQuery("<span></span>").text(CONST.TEXT.SEPARATOR);
		toolbar.append(separator);
		var expand = jQuery("<span></span>").addClass(CONST.CSS_CLASSES.BUTTON).text(CONST.TEXT.EXPAND);
		toolbar.append(expand);

		collapse.click(function(event){
			event.preventDefault();
			jasmineTree.collapseAll();
		});

		expand.click(function(event){
			event.preventDefault();
			jasmineTree.expandAll();
		});

		toolbar.insertBefore(jQuery(CONST.SELECTORS.SUMMARY));
	};

	/**
	 * Check the querystring and expand/collapse suites based on filter criteria (if any)
	 */
	jasmineTree.filterSpec = function(){
		var filter = jasmineTree.getSpecFilter();
		if(filter === null){
			return;
		}
		// We have a filter. First collapse all
		jasmineTree.collapseAll();
		// Then expand only the suites that match
		for(var i = 0; i < rootSuites.length; i++){
			if(rootSuites[i].containsPath(filter) === true){
				rootSuites[i].expand();
			}
		}
	};

	/**
	 * Wrapper around a suite's HTML node. Adds expand/collapse capabilities
	 * @param {jquery} options.rootNode
	 * @constructor
	 */
	jasmineTree.Suite = function(options){
		var config = {
			rootNode: null,
			rootPath: ""
		};
		jQuery.extend(config, options);

		/** @type  {jasmineTree.Suite} */
		var self = this;

		/** @type {array.<jasmineTree.Suite>} */
		var suites = [];
		/** @type {array.<jquery>} */
		var specs = [];

		var fullPath = "";
		var expanded = true;
		var triggerNode = jQuery("<a></a>").text(CONST.TEXT.MINUS).addClass(CONST.CSS_CLASSES.TRIGGER);

		var init = function(){
			config.rootNode.addClass(CONST.CSS_CLASSES.NODE_OPENED);

			var titleNode = config.rootNode.find(CONST.SELECTORS.NODE_TITLE);

			fullPath = config.rootPath + titleNode.text();
			triggerNode.insertBefore(titleNode.find(CONST.SELECTORS.FIRST_CHILD));

			config.rootNode.find(CONST.SELECTORS.NODE_SPECS).each(function(index, item){
				specs.push(jQuery(item));
			});
			config.rootNode.find(CONST.SELECTORS.NODE_SUITES).each(function(index, item){
				var childSuite = new jasmineTree.Suite({
					rootNode: jQuery(item),
					rootPath: fullPath + " "
				});
				suites.push(childSuite);
			});
			attachEvents();
		};

		var attachEvents = function(){
			triggerNode.click(function(event){
				event.preventDefault();
				if(expanded === true){
					self.collapse();
				}
				else{
					self.expand();
				}
			});
		};

		this.getPath = function(){
			return fullPath;
		};

		/**
		 * Given a filter string, coming from the querystring, search if the suite contains specs that match it
		 * @param {string} path
		 * @returns {boolean}
		 */
		this.containsPath = function(path){
			// Matches the suite
			if(self.getPath() === path){
				return true;
			}
			// Search inside child specs
			for(var j = 0; j < specs.length; j++){
				var specPath = self.getPath() + " " + specs[j].text();
				if(specPath === path){
					return true;
				}
			}
			// Search inside child suites
			for(var i = 0; i < suites.length; i++){
				if(suites[i].containsPath(path) === true){
					return true;
				}
			}
			return false;
		};

		this.show = function(){
			config.rootNode.show();
		};

		this.hide = function(){
			config.rootNode.hide();
		};

		this.collapse = function(){
			config.rootNode.removeClass(CONST.CSS_CLASSES.NODE_OPENED);
			triggerNode.text(CONST.TEXT.PLUS);
			for(var i = 0; i < suites.length; i++){
				suites[i].collapse();
				suites[i].hide();
			}
			for(var j = 0; j < specs.length; j++){
				specs[j].hide();
			}
			expanded = false;
		};

		this.expand = function(){
			config.rootNode.addClass(CONST.CSS_CLASSES.NODE_OPENED);
			triggerNode.text(CONST.TEXT.MINUS);
			for(var i = 0; i < suites.length; i++){
				suites[i].expand();
				suites[i].show();
			}
			for(var j = 0; j < specs.length; j++){
				specs[j].show();
			}
			expanded = true;
		};

		init();
	};

	/**
	 * This must be invoked after Jasmine finished executing
	 */
	jasmineTree.init = function(){
		jQuery(CONST.SELECTORS.ROOT_SUITE).each(function(index, item){
			var suite = new jasmineTree.Suite({
					rootNode: jQuery(item)
				}
			);
			rootSuites.push(suite);
		});
		jasmineTree.addToolbar();
		jasmineTree.filterSpec();
	};

	jasmine.getEnv().addReporter({
		jasmineDone: function(){
			jasmineTree.init();
		}
	});

}());