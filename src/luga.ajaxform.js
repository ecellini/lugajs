/*
 Copyright 2013-15 Massimo Foti (massimo@massimocorner.com)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

if(typeof(luga) === "undefined"){
	throw("Unable to find Luga JS Core");
}

(function(){
	"use strict";

	luga.namespace("luga.ajaxform");
	luga.ajaxform.version = "0.1";

	/* Success and error handlers */
	luga.namespace("luga.ajaxform.handlers");

	/**
	 * Replace form with message
	 *
	 * @param {string}   msg          Message to display in the GUI
	 * @param {jquery}   formNode     jQuery object wrapping the form
	 * @param {string}   textStatus   HTTP status
	 * TODO: finish up JSDocs
	 * @param
	 */
	luga.ajaxform.handlers.replaceForm = function(msg, formNode, textStatus, response, jqXHR){
		formNode.empty();
		formNode.html(msg);
	};

	/**
	 * Display error message inside alert
	 */
	luga.ajaxform.handlers.errorAlert = function(msg, formNode, textStatus, errorThrown, jqXHR){
		alert(msg);
	};

	/**
	 * Display errors inside a box above the form
	 */
	luga.ajaxform.handlers.errorBox = function(msg, formNode, textStatus, errorThrown, jqXHR){
		// Clean-up any existing box
		luga.utils.removeDisplayBox(formNode);
		luga.utils.displayErrorMessage(formNode, msg);
	};

	luga.ajaxform.CONST = {
		FORM_SELECTOR: "form[data-lugajax-form='true']",
		USER_AGENT: "luga.ajaxform",
		DEFAULT_METHOD: "GET",
		DEFAULT_TIME_OUT: 30000, // ms
		CUSTOM_ATTRIBUTES: {
			AJAX: "data-lugajax-form",
			ACTION: "data-lugajax-action",
			METHOD: "data-lugajax-method",
			TIME_OUT: "data-lugajax-timeout",
			SUCCESS: "data-lugajax-success",
			SUCCESS_MSG: "data-lugajax-successmsg",
			ERROR: "data-lugajax-error",
			ERROR_MSG: "data-lugajax-errormsg",
			BEFORE: "data-lugajax-before",
			AFTER: "data-lugajax-after"
		},
		MESSAGES: {
			SUCCESS: "Thanks for submitting the form",
			ERROR: "Failed to submit the form",
			MISSING_FORM: "luga.ajaxform was unable to load form",
			MISSING_FUNCTION: "luga.ajaxform was unable to find a function named: {0}"
		},
		HANDLERS: {
			SUCCESS: "luga.ajaxform.handlers.replaceForm",
			ERROR: "luga.ajaxform.handlers.errorAlert"
		}
	};

	/**
	 *
	 * @param options.formNode    {jquery}  Either a jQuery object wrapping the form or the naked DOM object. Required
	 * @param options.action      {string}  URL to where the form will be send. Default to the current URL
	 * @param options.method      {string}  HTTP method to be used. Default to GET
	 * @param options.timeout     {integer} Timeout to be used during the HTTP call (milliseconds). Default to 30000
	 * @param options.success     {string}  Name of the function to be invoked if the form is successfully submitted. Default to luga.ajaxform.handlers.replaceForm
	 * @param options.error       {string}  Name of the function to be invoked if the HTTP call failed. Default to luga.ajaxform.handlers.errorAlert
	 * @param options.successmsg  {string}  Message that will be displayed to the user if the form is successfully submitted. Default to "Thanks for submitting the form"
	 * @param options.errormsg    {string}  Message that will be displayed to the user if the HTTP call failed. Default to "Failed to submit the form"
	 * @param options.before      {string}  Name of the function to be invoked before the form is send. Default to null
	 * @param options.after       {string}  Name of the function to be invoked after the form is send. Default to null
	 *
	 * @constructor
	 */
	luga.ajaxform.Sender = function(options){
		// Ensure it's a jQuery object
		options.formNode = jQuery(options.formNode);
		this.config = {
			// Either: form attribute, custom attribute, incoming option or current URL
			action: options.formNode.attr("action") || options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.ACTION) || document.location.href,
			// Either: form attribute, custom attribute, incoming option or default
			method: options.formNode.attr("method") || options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.METHOD) || luga.ajaxform.CONST.DEFAULT_METHOD,
			// Either: custom attribute, incoming option or default
			timeout: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.TIME_OUT) || luga.ajaxform.CONST.DEFAULT_TIME_OUT,
			success: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.SUCCESS) || luga.ajaxform.CONST.HANDLERS.SUCCESS,
			error: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.ERROR) || luga.ajaxform.CONST.HANDLERS.ERROR,
			successmsg: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.SUCCESS_MSG) || luga.ajaxform.CONST.MESSAGES.SUCCESS,
			errormsg: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.ERROR_MSG) || luga.ajaxform.CONST.MESSAGES.ERROR,
			// Either: custom attribute, incoming option or null
			before: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.BEFORE) || null,
			after: options.formNode.attr(luga.ajaxform.CONST.CUSTOM_ATTRIBUTES.AFTER) || null
		};
		luga.merge(this.config, options);
		this.config.timeout = parseInt(this.config.timeout, 10);
		var self = this;

		if(self.config.formNode.length === 0){
			throw(luga.ajaxform.CONST.MESSAGES.MISSING_FORM);
		}

		var handleAfter = function(){
			if(self.config.after !== null){
				var callBack = luga.lookup(self.config.after);
				if(callBack === null){
					throw(luga.string.format(luga.ajaxform.CONST.MESSAGES.MISSING_FUNCTION, [self.config.after]));
				}
				callBack.apply(null, [self.config.formNode]);
			}
		};

		var handleBefore = function(){
			if(self.config.before !== null){
				var callBack = luga.lookup(self.config.before);
				if(callBack === null){
					throw(luga.string.format(luga.ajaxform.CONST.MESSAGES.MISSING_FUNCTION, [self.config.before]));
				}
				callBack.apply(null, [self.config.formNode]);
			}
		};

		var handleError = function(textStatus, errorThrown, jqXHR){
			var callBack = luga.lookup(self.config.error);
			if(callBack === null){
				throw(luga.string.format(luga.ajaxform.CONST.MESSAGES.MISSING_FUNCTION, [self.config.error]));
			}
			callBack.apply(null, [self.config.errormsg, self.config.formNode, textStatus, errorThrown, jqXHR]);
		};

		var handleSuccess = function(textStatus, response, jqXHR){
			var callBack = luga.lookup(self.config.success);
			if(callBack === null){
				throw(luga.string.format(luga.ajaxform.CONST.MESSAGES.MISSING_FUNCTION, [self.config.success]));
			}
			callBack.apply(null, [self.config.successmsg, self.config.formNode, textStatus, response, jqXHR]);
		};

		/**
		 * Perform the following actions:
		 * 1) Invoke the before handler, if any
		 * 2) Make the HTTP call, sending along the serialized form's content
		 * 3) Invoke either the success or error handler
		 * 4) Invoke the after handler, if any
		 */
		this.send = function(){

			if(self.config.before !== null){
				handleBefore();
			}

			jQuery.ajax({
				data: luga.form.toQueryString(self.config.formNode),
				headers: {
					"X-Requested-With": luga.ajaxform.CONST.USER_AGENT
				},
				error: function(jqXHR, textStatus, errorThrown){
					handleError(textStatus, errorThrown, jqXHR);
				},
				method: self.config.method,
				success: function(response, textStatus, jqXHR){
					handleSuccess(textStatus, response, jqXHR);
				},
				timeout: self.config.timeout,
				url: self.config.action
			});

			if(self.config.after !== null){
				handleAfter();
			}

		};

	};

	/**
	 * Attach form handlers to onSubmit events
	 */
	luga.ajaxform.initForms = function(){
		jQuery(luga.ajaxform.CONST.FORM_SELECTOR).each(function(index, item){
			var formNode = jQuery(item);
			formNode.submit(function(event){
				event.preventDefault();
				var formHandler = new luga.ajaxform.Sender({
					formNode: formNode
				});
				formHandler.send();
			});
		});
	};

	jQuery(document).ready(function(){
		luga.ajaxform.initForms();
	});

}());