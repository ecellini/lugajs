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

	luga.namespace("luga.ajax.form");

	luga.ajax.CONST = {
		FORM_SELECTOR: "form[data-luga-ajaxform]",
		USER_AGENT: "luga.ajaxform",
		CUSTOM_ATTRIBUTES: {
			AJAX: "data-luga-ajaxform"
		},
		MESSAGES: {
			FORM_MISSING: "luga.ajaxform was unable to load form"
		}
	};

	luga.ajax.Form = function(options){

		if(jQuery(self.config.formNode).length === 0){
			throw(luga.ajax.CONST.MESSAGES.FORM_MISSING);
		}

	};

	luga.ajax.Form.version = "0.1";

	/**
	 * Attach form handlers to onSubmit events
	 */
	luga.ajax.initForms = function(){
		jQuery(luga.validator.CONST.FORM_SELECTOR).each(function(index, item){
			var formNode = jQuery(item);
			if(formNode.attr(luga.ajax.CONST.CUSTOM_ATTRIBUTES.AJAX) === "true"){
				formNode.submit(function(event){
					var formHandler = new luga.ajax.Form({
						formNode: formNode
					});
					formHandler.send(event);
				});
			}
		});
	};

	jQuery(document).ready(function(){
		luga.ajax.initForms();
	});

}());