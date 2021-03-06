/*! 
Luga Data 0.9.8 2018-11-08T10:01:39.191Z
http://www.lugajs.org
Copyright 2013-2018 Massimo Foti (massimo@massimocorner.com)
Licensed under the Apache License, Version 2.0 | http://www.apache.org/licenses/LICENSE-2.0
 */
/* istanbul ignore if */
if(typeof(luga) === "undefined"){
	throw("Unable to find Luga JS Common");
}

/**
 * @typedef {Object} luga.data.dataSourceChanged
 *
 * @property {luga.data.DataSet|luga.data.DetailSet} dataSource
 */

(function(){
	"use strict";

	luga.namespace("luga.data");

	/** @type {hash.<luga.data.DataSet>} */
	luga.data.dataSourceRegistry = {};

	luga.data.CONST = {
		COL_TYPES: ["date", "number", "string"],
		EVENTS: {
			CURRENT_ROW_CHANGED: "currentRowChanged",
			DATA_CHANGED: "dataChanged",
			DATA_SORTED: "dataSorted",
			DATA_LOADING: "dataLoading",
			PRE_DATA_SORTED: "preDataSorted",
			STATE_CHANGED: "stateChanged",
			XHR_ERROR: "xhrError"
		},
		ERROR_MESSAGES: {
			DUPLICATED_UUID: "Unable to register dataSource. The uuuid was already used: {0}",
			INVALID_FILTER_PARAMETER: "Invalid filter. You must use a function as filter",
			INVALID_FILTER_ACTION: "Invalid action from a filter function. A filter must return either a plain object or null (undefined, primitives etc are not valid return values)",
			INVALID_UPDATER_PARAMETER: "Invalid updater. You must use a function as updater",
			INVALID_UPDATER_ACTION: "Invalid action from an updater function. An updater must return a plain object (null, undefined, primitives etc are not valid return values)",
			INVALID_STATE: "luga.data.utils.assembleStateDescription: Unsupported state: {0}"
		},
		PK_KEY: "lugaRowId",
		PK_KEY_PREFIX: "lugaPk_",
		XHR_TIMEOUT: 10000 // Keep this accessible to everybody
	};

	/**
	 * Returns a dataSource from the registry
	 * Returns null if no source matches the given id
	 * @param {string} uuid
	 * @return {luga.data.DataSet|luga.data.DetailSet}
	 */
	luga.data.getDataSource = function(uuid){
		if(luga.data.dataSourceRegistry[uuid] !== undefined){
			return luga.data.dataSourceRegistry[uuid];
		}
		return null;
	};

	/**
	 * Adds a dataSource inside the registry
	 * @param {string}                                uuid
	 * @param {luga.data.DataSet|luga.data.DetailSet} dataSource
	 * @throw {Exception}
	 */
	luga.data.setDataSource = function(uuid, dataSource){
		if(luga.data.getDataSource(uuid) !== null){
			throw(luga.string.format(luga.data.CONST.ERROR_MESSAGES.DUPLICATED_UUID, [uuid]));
		}
		luga.data.dataSourceRegistry[uuid] = dataSource;
	};

	/**
	 * @typedef {string} luga.data.STATE
	 * @enum {string}
	 */
	luga.data.STATE = {
		ERROR: "error",
		LOADING: "loading",
		READY: "ready"
	};

	luga.namespace("luga.data.utils");

	/**
	 * @typedef {Object} luga.data.stateDescription
	 *
	 * @property {null|luga.data.STATE}  state
	 * @property {boolean}          isStateLoading
	 * @property {boolean}          isStateError
	 * @property {boolean}          isStateReady
	 */

	/**
	 * Given a state string, returns an object containing a boolean field for each possible state
	 * @param {null|luga.data.STATE} state
	 * @throw {Exception}
	 * @return {luga.data.stateDescription}
	 */
	luga.data.utils.assembleStateDescription = function(state){
		if((state !== null) && (luga.data.utils.isValidState(state) === false)){
			throw(luga.string.format(luga.data.CONST.ERROR_MESSAGES.INVALID_STATE, [state]));
		}
		return {
			state: state,
			isStateError: (state === luga.data.STATE.ERROR),
			isStateLoading: (state === luga.data.STATE.LOADING),
			isStateReady: (state === luga.data.STATE.READY)
		};
	};

	/**
	 * Apply the given filter function to each passed row
	 * Return an array of filtered rows
	 * @param {Array.<luga.data.DataSet.row>} rows    Required
	 * @param {Function}                      filter  Required
	 * @param {luga.data.DataSet}             dataset Required
	 * @return {Array.<luga.data.DataSet.row>}
	 * @throw {Exception}
	 */
	luga.data.utils.filter = function(rows, filter, dataset){
		if(luga.type(filter) !== "function"){
			throw(luga.data.CONST.ERROR_MESSAGES.INVALID_FILTER_PARAMETER);
		}
		const retRows = [];
		for(let i = 0; i < rows.length; i++){
			const filteredRow = filter(rows[i], i, dataset);
			// Row to be removed
			if(filteredRow === null){
				continue;
			}
			// Invalid row
			if(luga.isPlainObject(filteredRow) === false){
				throw(luga.data.CONST.ERROR_MESSAGES.INVALID_FILTER_ACTION);
			}
			// Valid row
			retRows.push(filteredRow);
		}
		return retRows;
	};

	/**
	 * Apply the given updater function to each passed row
	 * @param {Array.<luga.data.DataSet.row>} rows      Required
	 * @param {Function}                      formatter Required
	 * @param {luga.data.DataSet}             dataset   Required
	 * @throw {Exception}
	 */
	luga.data.utils.update = function(rows, formatter, dataset){
		if(luga.type(formatter) !== "function"){
			throw(luga.data.CONST.ERROR_MESSAGES.INVALID_UPDATER_ACTION);
		}
		for(let i = 0; i < rows.length; i++){
			const formattedRow = formatter(rows[i], i, dataset);
			if(luga.isPlainObject(formattedRow) === false){
				throw(luga.data.CONST.ERROR_MESSAGES.INVALID_UPDATER_ACTION);
			}
		}
	};

	/**
	 * Return true if the passed state is supported
	 * @param {string}  state
	 * @return {boolean}
	 */
	luga.data.utils.isValidState = function(state){
		for(let key in luga.data.STATE){
			if(luga.data.STATE[key] === state){
				return true;
			}
		}
		return false;
	};

}());
/* global ActiveXObject */

(function(){
	"use strict";

	luga.namespace("luga.data.xml");

	luga.data.xml.MIME_TYPE = "application/xml";
	luga.data.xml.ATTRIBUTE_PREFIX = "_";
	luga.data.xml.DOM_ACTIVEX_NAME = "MSXML2.DOMDocument.6.0";

	/**
	 * Given a DOM node, evaluate an XPath expression against it
	 * Results are returned as an array of nodes. An empty array is returned in case there is no match
	 * @param {Node} node
	 * @param {string} path
	 * @return {Array<Node>}
	 */
	luga.data.xml.evaluateXPath = function(node, path){
		const retArray = [];
		/* istanbul ignore else IE-only */
		if(window.XPathEvaluator !== undefined){
			const evaluator = new XPathEvaluator();
			const result = evaluator.evaluate(path, node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
			let currentNode = result.iterateNext();
			// Iterate and populate the array
			while(currentNode !== null){
				retArray.push(currentNode);
				currentNode = result.iterateNext();
			}
		}
		else if(window.ActiveXObject !== undefined){
			const selectedNodes = node.selectNodes(path);
			// Extract the nodes out of the nodeList returned by selectNodes and put them into an array
			// We could directly use the nodeList returned by selectNodes, but this would cause inconsistencies across browsers
			for(let i = 0; i < selectedNodes.length; i++){
				retArray.push(selectedNodes[i]);
			}
		}
		return retArray;
	};

	/**
	 * Convert an XML node into a JavaScript object
	 * @param {Node} node
	 * @return {Object}
	 */
	luga.data.xml.nodeToHash = function(node){
		const obj = {};
		attributesToProperties(node, obj);
		childrenToProperties(node, obj);
		return obj;
	};

	/**
	 * Map attributes to properties
	 * @param {Node}   node
	 * @param {Object} obj
	 */
	function attributesToProperties(node, obj){
		if((node.attributes === null) || (node.attributes === undefined)){
			return;
		}
		for(let i = 0; i < node.attributes.length; i++){
			const attr = node.attributes[i];
			obj[luga.data.xml.ATTRIBUTE_PREFIX + attr.name] = attr.value;
		}
	}

	/**
	 * Map child nodes to properties
	 * @param {Node}   node
	 * @param {Object} obj
	 */
	function childrenToProperties(node, obj){
		for(let i = 0; i < node.childNodes.length; i++){
			const child = node.childNodes[i];

			if(child.nodeType === 1 /* Node.ELEMENT_NODE */){
				let isArray = false;
				const tagName = child.nodeName;

				if(obj[tagName] !== undefined){
					// If the property exists already, turn it into an array
					if(obj[tagName].constructor !== Array){
						const curValue = obj[tagName];
						obj[tagName] = [];
						obj[tagName].push(curValue);
					}
					isArray = true;
				}

				if(nodeHasText(child) === true){
					// This may potentially override an existing property
					obj[child.nodeName] = getTextValue(child);
				}
				else{
					const childObj = luga.data.xml.nodeToHash(child);
					if(isArray === true){
						obj[tagName].push(childObj);
					}
					else{
						obj[tagName] = childObj;
					}
				}
			}
		}
	}

	/**
	 * Extract text out of a TEXT or CDATA node
	 * @param {Node} node
	 * @return {string}
	 */
	function getTextValue(node){
		const child = node.childNodes[0];
		/* istanbul ignore else */
		if((child.nodeType === 3) /* TEXT_NODE */ || (child.nodeType === 4) /* CDATA_SECTION_NODE */){
			return child.data;
		}
	}

	/**
	 * Return true if a node contains value, false otherwise
	 * @param {Node}   node
	 * @return {boolean}
	 */
	function nodeHasText(node){
		const child = node.childNodes[0];
		if((child !== null) && (child.nextSibling === null) && (child.nodeType === 3 /* Node.TEXT_NODE */ || child.nodeType === 4 /* CDATA_SECTION_NODE */)){
			return true;
		}
		return false;
	}

	/**
	 * Serialize a DOM node into a string
	 * @param {Node}   node
	 * @return {string}
	 */
	luga.data.xml.nodeToString = function(node){
		/* istanbul ignore if IE-only */
		if(window.ActiveXObject !== undefined){
			// IE11 supports XMLSerializer but fails on serializeToString()
			return node.xml;
		}
		else{
			const serializer = new XMLSerializer();
			return serializer.serializeToString(node, luga.data.xml.MIME_TYPE);
		}
	};

	/**
	 * Create a DOM Document out of a string
	 * @param {string} xmlStr
	 * @return {Document}
	 */
	luga.data.xml.parseFromString = function(xmlStr){
		let xmlParser;
		/* istanbul ignore if IE-only */
		if(window.ActiveXObject !== undefined){
			// IE11 supports DOMParser but fails on parseFromString()
			const xmlDOMObj = new ActiveXObject(luga.data.xml.DOM_ACTIVEX_NAME);
			xmlDOMObj.async = false;
			xmlDOMObj.setProperty("SelectionLanguage", "XPath");
			xmlDOMObj.loadXML(xmlStr);
			return xmlDOMObj;
		}
		else{
			xmlParser = new DOMParser();
			const domDoc = xmlParser.parseFromString(xmlStr, luga.data.xml.MIME_TYPE);
			return domDoc;
		}
	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.DataSet.row
	 *
	 * @property {string} rowID  Artificial PK
	 */

	/**
	 * @typedef {Object} luga.data.DataSet.currentRowChanged
	 *
	 * @property {string}                oldRowId
	 * @property {luga.data.DataSet.row} oldRow
	 * @property {string}                currentRowId
	 * @property {luga.data.DataSet.row} currentRow
	 * @property {luga.data.DataSet}     dataSet
	 */

	/**
	 * @typedef {Object} luga.data.DataSet.dataSorted
	 *
	 * @property {luga.data.DataSet}    dataSet
	 * @property {Array<String>}        oldSortColumns
	 * @property {luga.data.sort.ORDER} oldSortOrder
	 * @property {Array<String>}        newSortColumns
	 * @property {luga.data.sort.ORDER} newSortOrder
	 */

	/**
	 * @typedef {Object} luga.data.DataSet.stateChanged
	 *
	 * @property {luga.data.DataSet}     dataSet
	 * @property {null|luga.data.STATE}  currentState
	 * @property {null|luga.data.STATE}  oldState
	 */

	/**
	 * @typedef {Object} luga.data.DataSet.context
	 * @extend luga.data.stateDescription
	 *
	 * @property {number}                         recordCount
	 * @property {Array.<luga.data.DataSet.row>}  entities
	 */

	/**
	 * @typedef {Object} luga.data.DataSet.options
	 *
	 * @property {string}                uuid       Unique identifier. Required
	 * @property {Array.<object>|object} records    Records to be loaded, either one single object containing value/name pairs, or an array of name/value pairs
	 * @property {Function}              formatter  A formatting functions to be called once for each row in the dataSet. Default to null
	 * @property {Function}              filter     A filter functions to be called once for each row in the dataSet. Default to null
	 */

	/**
	 * Base DataSet class
	 *
	 * @param {luga.data.DataSet.options} options
	 * @constructor
	 * @extend luga.Notifier
	 * @fire dataChanged
	 * @fire currentRowChanged
	 * @fire dataSorted
	 * @fire preDataSorted
	 * @throw {Exception}
	 */
	luga.data.DataSet = function(options){

		const CONST = {
			ERROR_MESSAGES: {
				INVALID_COL_TYPE: "luga.DataSet.setColumnType(): Invalid type passed {0}",
				INVALID_UUID_PARAMETER: "luga.DataSet: uuid parameter is required",
				INVALID_FORMATTER_PARAMETER: "luga.DataSet: invalid formatter. You must use a function as formatter",
				INVALID_FILTER_PARAMETER: "luga.DataSet: invalid filter. You must use a function as filter",
				INVALID_PRIMITIVE: "luga.DataSet: records can be either an array of objects or a single object. Primitives are not accepted",
				INVALID_PRIMITIVE_ARRAY: "luga.DataSet: records can be either an array of name/value pairs or a single object. Array of primitives are not accepted",
				INVALID_ROW_PARAMETER: "luga.DataSet: invalid row parameter. No available record matches the given row",
				INVALID_ROW_ID_PARAMETER: "luga.DataSet: invalid rowId parameter",
				INVALID_ROW_INDEX_PARAMETER: "luga.DataSet: invalid parameter. Row index is out of range",
				INVALID_SORT_COLUMNS: "luga.DataSet.sort(): Unable to sort dataSet. You must supply one or more column name",
				INVALID_SORT_ORDER: "luga.DataSet.sort(): Unable to sort dataSet. Invalid sort order passed {0}",
				INVALID_STATE: "luga.DataSet: Unsupported state: {0}"
			}
		};

		if(options.uuid === undefined){
			throw(CONST.ERROR_MESSAGES.INVALID_UUID_PARAMETER);
		}
		if((options.formatter !== undefined) && (luga.type(options.formatter) !== "function")){
			throw(CONST.ERROR_MESSAGES.INVALID_FORMATTER_PARAMETER);
		}
		if((options.filter !== undefined) && (luga.type(options.filter) !== "function")){
			throw(CONST.ERROR_MESSAGES.INVALID_FILTER_PARAMETER);
		}
		luga.extend(luga.Notifier, this);

		/** @type {luga.data.DataSet} */
		const self = this;

		this.uuid = options.uuid;

		/** @type {Array.<luga.data.DataSet.row>} */
		this.records = [];

		/** @type {hash.<luga.data.DataSet.row>} */
		this.recordsHash = {};

		/** @type {null|function} */
		this.formatter = null;
		if(options.formatter !== undefined){
			this.formatter = options.formatter;
		}

		/** @type {null|Array.<luga.data.DataSet.row>} */
		this.filteredRecords = null;

		/** @type {null|function} */
		this.filter = null;

		/** @type {null|luga.data.STATE} */
		this.state = null;

		this.currentRowId = null;
		this.columnTypes = {};
		this.lastSortColumns = [];
		this.lastSortOrder = "";

		luga.data.setDataSource(this.uuid, this);

		/* Private methods */

		const deleteAll = function(){
			self.filteredRecords = null;
			self.records = [];
			self.recordsHash = {};
		};

		const applyFilter = function(){
			if(hasFilter() === true){
				self.filteredRecords = luga.data.utils.filter(self.records, self.filter, self);
				self.resetCurrentRow();
			}
		};

		const applyFormatter = function(){
			if(hasFormatter() === true){
				luga.data.utils.update(self.records, self.formatter, self);
			}
		};

		const hasFilter = function(){
			return (self.filter !== null);
		};

		const hasFormatter = function(){
			return (self.formatter !== null);
		};

		const selectAll = function(){
			if(hasFilter() === true){
				return self.filteredRecords;
			}
			return self.records;
		};

		/* Public methods */

		/**
		 * Remove the current filter function
		 * Triggers a "dataChanged" notification
		 * @fire dataChanged
		 */
		this.clearFilter = function(){
			this.filter = null;
			this.filteredRecords = null;
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/**
		 * Delete records matching the given filter
		 * If no filter is passed, delete all records
		 * @param {Function} [filter]    A filter function. If specified only records matching the filter will be returned. Optional
		 *                               The function is going to be called with this signature: myFilter(row, rowIndex, dataSet)
		 * @fire currentRowChanged
		 * @fire stateChanged
		 * @fire dataChanged
		 * @throw {Exception}
		 */
		this.delete = function(filter){
			if(filter === undefined){
				deleteAll();
			}
			else{
				if(luga.type(filter) !== "function"){
					throw(CONST.ERROR_MESSAGES.INVALID_FILTER_PARAMETER);
				}
				const orig = this.records;
				for(let i = 0; i < orig.length; i++){
					if(filter(orig[i], i, this) === null){
						// If matches, delete from array and hash
						const rowToDelete = orig[i];
						this.records.splice(i, 1);
						delete this.recordsHash[rowToDelete[luga.data.CONST.PK_KEY]];
					}
				}
				applyFilter();
			}
			this.resetCurrentRow();
			this.setState(luga.data.STATE.READY);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/**
		 * Returns the column type of the specified column. Either "date", "number" or "string"
		 * @param {string} columnName
		 * @return {string}
		 */
		this.getColumnType = function(columnName){
			if(this.columnTypes[columnName] !== undefined){
				return this.columnTypes[columnName];
			}
			return "string";
		};

		/**
		 * @return {luga.data.DataSet.context}
		 */
		this.getContext = function(){
			const context = {
				entities: self.select(),
				recordCount: self.getRecordsCount()
			};
			const stateDesc = luga.data.utils.assembleStateDescription(self.getState());
			luga.merge(context, stateDesc);
			return context;
		};

		/**
		 * Returns the current row object
		 * By default, the current row is the first row of the dataSet, but this can be changed by calling setCurrentRow() or setCurrentRowIndex().
		 * @return {luga.data.DataSet.row|null}
		 */
		this.getCurrentRow = function(){
			return this.getRowById(this.getCurrentRowId());
		};

		/**
		 * Returns the rowId of the current row
		 * Do not confuse the rowId of a row with the index of the row
		 * RowId is a column that contains a unique identifier for the row
		 * This identifier does not change if the rows of the dataSet are sorted
		 * @return {string}
		 */
		this.getCurrentRowId = function(){
			return this.currentRowId;
		};

		/**
		 * Returns a zero-based index at which the current row can be found, or -1 if the dataSet is empty
		 * @return {number}
		 */
		this.getCurrentRowIndex = function(){
			const row = this.getCurrentRow();
			return this.getRowIndex(row);
		};

		/**
		 * Returns the number of records in the dataSet
		 * If the dataSet has a filter, returns the number of filtered records
		 * @return {number}
		 */
		this.getRecordsCount = function(){
			return selectAll().length;
		};

		/**
		 * Returns the row object associated with the given unique identifier
		 * @param {string} rowId  Required
		 * @return {null|luga.data.DataSet.row}
		 */
		this.getRowById = function(rowId){
			const targetRow = this.recordsHash[rowId];
			if(targetRow === undefined){
				// Nothing matches
				return null;
			}
			if(hasFilter() === true){
				if(this.filteredRecords.indexOf(targetRow) !== -1){
					return targetRow;
				}
				return null;
			}
			// No filter, return the matching row
			return targetRow;
		};

		/**
		 * Returns the row object associated with the given index
		 * Throws an exception if the index is out of range
		 * @param {number} index  Required
		 * @return {luga.data.DataSet.row}
		 * @throw {Exception}
		 */
		this.getRowByIndex = function(index){
			let fetchedRow;
			if(hasFilter() === true){
				fetchedRow = this.filteredRecords[index];
			}
			else{
				fetchedRow = this.records[index];
			}
			if(fetchedRow === undefined){
				throw(CONST.ERROR_MESSAGES.INVALID_ROW_INDEX_PARAMETER);
			}
			return fetchedRow;
		};

		/**
		 * Returns the index at which a row can be found in the dataSet, or -1 if no available record matches the given row
		 * @param {luga.data.DataSet.row} row
		 * @return {number}
		 */
		this.getRowIndex = function(row){
			if(hasFilter() === true){
				return this.filteredRecords.indexOf(row);
			}
			return this.records.indexOf(row);
		};

		/**
		 * Returns the name of the column used for the most recent sort
		 * Returns an empty string if no sort has been performed yet
		 * @return {string}
		 */
		this.getSortColumn = function(){
			return (this.lastSortColumns && this.lastSortColumns.length > 0) ? this.lastSortColumns[0] : "";
		};

		/**
		 * Returns the order used for the most recent sort
		 * Returns an empty string if no sort has been performed yet
		 * @return {string}
		 */
		this.getSortOrder = function(){
			return this.lastSortOrder ? this.lastSortOrder : "";
		};

		/**
		 * Returns the dataSet's current state
		 * @return {null|luga.data.STATE}
		 */
		this.getState = function(){
			return this.state;
		};

		/**
		 * Adds rows to a dataSet
		 * Be aware that the dataSet use passed data by reference
		 * That is, it uses those objects as its row object internally. It does not make a copy
		 * @param  {Array.<Object>|Object} records   Records to be loaded, either one single object containing value/name pairs, or an array of objects. Required
		 * @fire stateChanged
		 * @fire dataChanged
		 * @throw {Exception}
		 */
		this.insert = function(records){
			// If we only get one record, we put it inside an array anyway,
			let recordsHolder = [];
			if(Array.isArray(records) === true){
				recordsHolder = records;
			}
			else{
				// Ensure we don't have primitive values
				if(luga.isPlainObject(records) === false){
					throw(CONST.ERROR_MESSAGES.INVALID_PRIMITIVE);
				}
				recordsHolder.push(records);
			}
			for(let i = 0; i < recordsHolder.length; i++){
				// Ensure we don't have primitive values
				if(luga.isPlainObject(recordsHolder[i]) === false){
					throw(CONST.ERROR_MESSAGES.INVALID_PRIMITIVE_ARRAY);
				}
				// Create new PK
				const recordID = luga.data.CONST.PK_KEY_PREFIX + this.records.length;
				recordsHolder[i][luga.data.CONST.PK_KEY] = recordID;
				this.recordsHash[recordID] = recordsHolder[i];
				this.records.push(recordsHolder[i]);
			}
			applyFormatter();
			applyFilter();
			this.resetCurrentRow();
			this.setState(luga.data.STATE.READY);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/**
		 * Reset the currentRowId. Persist previous selection if possible
		 * @fire currentRowChanged
		 */
		this.resetCurrentRow = function(){
			// If we have previous selection
			if(this.currentRowId !== null){
				// Try to persist
				const targetRow = this.getRowById(this.currentRowId);
				if(targetRow !== null){
					this.setCurrentRowId(this.currentRowId);
					return;
				}
			}
			// No previous selection
			this.resetCurrentRowToFirst();
		};

		/**
		 * Reset the currentRowId to the first record available
		 * @fire currentRowChanged
		 */
		this.resetCurrentRowToFirst = function(){
			// We have a filter
			if(hasFilter() === true){
				if((this.filteredRecords === null) || (this.filteredRecords.length === 0)){
					this.setCurrentRowId(null);
					return;
				}
				else {
					// First among the filtered records
					this.setCurrentRowId(this.filteredRecords[0][luga.data.CONST.PK_KEY]);
					return;
				}
			}
			// No filter
			if(this.records.length > 0){
				// First record
				this.setCurrentRowId(this.records[0][luga.data.CONST.PK_KEY]);
			}
			else{
				this.setCurrentRowId(null);
			}
		};

		/**
		 * Returns an array of the internal row objects that store the records in the dataSet
		 * Be aware that modifying any property of a returned object results in a modification of the internal records (since records are passed by reference)
		 * @param {Function} [filter]    An optional filter function. If specified only records matching the filter will be returned. Optional
		 *                               The function is going to be called with this signature: myFilter(row, rowIndex, dataSet)
		 * @return {Array.<luga.data.DataSet.row>}
		 * @throw {Exception}
		 */
		this.select = function(filter){
			if(filter === undefined){
				return selectAll();
			}
			if(luga.type(filter) !== "function"){
				throw(CONST.ERROR_MESSAGES.INVALID_FILTER_PARAMETER);
			}
			return luga.data.utils.filter(selectAll(), filter, self);
		};

		/**
		 * Set a column type for a column. Required for proper sorting of numeric or date data.
		 * By default data is sorted alpha-numerically, if you want it sorted numerically or by date, set the proper columnType
		 * @param {string|Array<string>} columnNames
		 * @param {string}               columnType   Either "date", "number" or "string"
		 */
		this.setColumnType = function(columnNames, columnType){
			if(Array.isArray(columnNames) === false){
				columnNames = [columnNames];
			}
			for(let i = 0; i < columnNames.length; i++){
				const colName = columnNames[i];
				if(luga.data.CONST.COL_TYPES.indexOf(columnType) === -1){
					throw(luga.string.format(CONST.ERROR_MESSAGES.INVALID_COL_TYPE, [colName]));
				}
				this.columnTypes[colName] = columnType;
			}
		};

		/**
		 * Sets the current row of the data set to the row matching the given rowId
		 * Throws an exception if the given rowId is invalid
		 * If null is passed, no row is selected
		 * Triggers a "currentRowChanged" notification
		 * @param {string|null} rowId  Required
		 * @fire currentRowChanged
		 * @throw {Exception}
		 */
		this.setCurrentRowId = function(rowId){
			// No need to do anything
			if(this.currentRowId === rowId){
				return;
			}
			/**
			 * @type {luga.data.DataSet.currentRowChanged}
			 */
			const notificationData = {
				oldRowId: this.getCurrentRowId(),
				oldRow: this.getRowById(this.currentRowId),
				currentRowId: rowId,
				currentRow: this.getRowById(rowId),
				dataSet: this
			};
			// Set to null
			if((rowId === null) && (this.currentRowId !== null)){
				this.currentRowId = null;
				this.notifyObservers(luga.data.CONST.EVENTS.CURRENT_ROW_CHANGED, notificationData);
				return;
			}
			// Validate input
			if(this.getRowById(rowId) === null){
				throw(CONST.ERROR_MESSAGES.INVALID_ROW_ID_PARAMETER);
			}
			this.currentRowId = rowId;
			this.notifyObservers(luga.data.CONST.EVENTS.CURRENT_ROW_CHANGED, notificationData);
		};

		/**
		 * Set the passed row as currentRow
		 * Throws an exception if no available record matches the given row
		 * @param {luga.data.DataSet.row} row
		 * @fire currentRowChanged
		 * @throw {Exception}
		 */
		this.setCurrentRow = function(row){
			const fetchedRowId = this.getRowIndex(row);
			if(fetchedRowId === -1){
				throw(CONST.ERROR_MESSAGES.INVALID_ROW_PARAMETER);
			}
			this.setCurrentRowId(luga.data.CONST.PK_KEY_PREFIX + fetchedRowId);
		};

		/**
		 * Sets the current row of the dataSet to the one matching the given index
		 * Throws an exception if the index is out of range
		 * @param {number} index  New index. Required
		 * @fire currentRowChanged
		 * @throw {Exception}
		 */
		this.setCurrentRowIndex = function(index){
			this.setCurrentRow(this.getRowByIndex(index));
		};

		/**
		 * Replace current filter with a new filter functions and apply the new filter
		 * Triggers a "dataChanged" notification
		 * @param {Function} filter   A filter functions to be called once for each row in the data set. Required
		 *                            The function is going to be called with this signature: myFilter(row, rowIndex, dataSet)
		 * @fire currentRowChanged
		 * @fire dataChanged
		 * @throw {Exception}
		 */
		this.setFilter = function(filter){
			if(luga.type(filter) !== "function"){
				throw(CONST.ERROR_MESSAGES.INVALID_FILTER_PARAMETER);
			}
			this.filter = filter;
			applyFilter();
			this.setState(luga.data.STATE.READY);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/**
		 * Set current state
		 * This method is not intended to be called outside the dataSet. It's public only to be accessible to subclasses
		 * @param {null|luga.data.STATE} newState
		 * @fire stateChanged
		 */
		this.setState = function(newState){
			if(luga.data.utils.isValidState(newState) === false){
				throw(luga.string.format(CONST.ERROR_MESSAGES.INVALID_STATE, [newState]));
			}
			const oldState = this.state;
			this.state = newState;

			/** @type {luga.data.DataSet.stateChanged} */
			const notificationData = {
				oldState: oldState,
				currentState: this.state,
				dataSet: this
			};

			this.notifyObservers(luga.data.CONST.EVENTS.STATE_CHANGED, notificationData);
		};

		/**
		 * Sorts the dataSet using the given column(s) and sort order
		 * @param {string|Array<string>}  columnNames             Required, either a single column name or an array of names
		 * @param {luga.data.sort.ORDER} [sortOrder="toggle"]     Either "ascending", "descending" or "toggle". Optional, default to "toggle"
		 * @fire preDataSorted
		 * @fire dataSorted
		 * @fire dataChanged
		 */
		this.sort = function(columnNames, sortOrder){
			/*
			 Very special thanks to Kin Blas https://github.com/jblas
			 */
			if((columnNames === undefined) || (columnNames === null)){
				throw(CONST.ERROR_MESSAGES.INVALID_SORT_COLUMNS);
			}
			if(sortOrder === undefined){
				sortOrder = luga.data.sort.ORDER.TOG;
			}
			if(luga.data.sort.isValidSortOrder(sortOrder) === false){
				throw(luga.string.format(CONST.ERROR_MESSAGES.INVALID_SORT_ORDER, [sortOrder]));
			}

			const sortColumns = assembleSortColumns(columnNames);

			if(sortOrder === luga.data.sort.ORDER.TOG){
				sortOrder = defineToggleSortOrder(sortColumns);
			}

			/** @type {luga.data.DataSet.dataSorted} */
			const notificationData = {
				dataSet: this,
				oldSortColumns: this.lastSortColumns,
				oldSortOrder: this.lastSortOrder,
				newSortColumns: sortColumns,
				newSortOrder: sortOrder
			};

			this.notifyObservers(luga.data.CONST.EVENTS.PRE_DATA_SORTED, notificationData);

			const sortColumnName = sortColumns[sortColumns.length - 1];
			const sortColumnType = this.getColumnType(sortColumnName);
			let sortFunction = luga.data.sort.getSortStrategy(sortColumnType, sortOrder);

			for(let i = sortColumns.length - 2; i >= 0; i--){
				const columnToSortName = sortColumns[i];
				const columnToSortType = this.getColumnType(columnToSortName);
				const sortStrategy = luga.data.sort.getSortStrategy(columnToSortType, sortOrder);
				sortFunction = buildSecondarySortFunction(sortStrategy(columnToSortName), sortFunction);
			}

			this.records.sort(sortFunction);
			applyFilter();
			this.resetCurrentRowToFirst();
			this.setState(luga.data.STATE.READY);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_SORTED, notificationData);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});

			// Keep track of sorting criteria
			this.lastSortColumns = sortColumns.slice(0); // Copy the array.
			this.lastSortOrder = sortOrder;

		};

		const buildSecondarySortFunction = function(funcA, funcB){
			return function(a, b){
				let ret = funcA(a, b);
				if(ret === 0){
					ret = funcB(a, b);
				}
				return ret;
			};
		};

		const assembleSortColumns = function(columnNames){
			// If only one column name was specified for sorting
			// Do a secondary sort on PK so we get a stable sort order
			if(Array.isArray(columnNames) === false){
				return [columnNames, luga.data.CONST.PK_KEY];
			}
			else if(columnNames.length < 2 && columnNames[0] !== luga.data.CONST.PK_KEY){
				columnNames.push(luga.data.CONST.PK_KEY);
				return columnNames;
			}
			return columnNames;
		};

		const defineToggleSortOrder = function(sortColumns){
			if((self.lastSortColumns.length > 0) && (self.lastSortColumns[0] === sortColumns[0]) && (self.lastSortOrder === luga.data.sort.ORDER.ASC)){
				return luga.data.sort.ORDER.DESC;
			}
			else{
				return luga.data.sort.ORDER.ASC;
			}
		};

		/**
		 * Updates rows inside the dataSet
		 * @param {Function} filter   Filter function to be used as search criteria. Required
		 *                            The function is going to be called with this signature: myFilter(row, rowIndex, dataSet)
		 * @param {Function} updater  Updater function. Required
		 *                            The function is going to be called with this signature: myUpdater(row, rowIndex, dataSet)
		 * @fire stateChanged
		 * @fire dataChanged
		 * @throw {Exception}
		 */
		this.update = function(filter, updater){
			/** @type {Array.<luga.data.DataSet.row>} */
			const filteredRecords = luga.data.utils.filter(this.records, filter, this);
			luga.data.utils.update(filteredRecords, updater, this);
			this.resetCurrentRow();
			this.setState(luga.data.STATE.READY);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/* Constructor */

		if(options.filter !== undefined){
			this.setFilter(options.filter);
		}
		if(options.records !== undefined){
			this.insert(options.records);
		}

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.DetailSet.context
	 * @extend luga.data.stateDescription
	 *
	 * @property {null|luga.data.DataSet.row} entity
	 */

	/**
	 * @typedef {Object} luga.data.DetailSet.options
	 *
	 * @property {string}            uuid           Unique identifier. Required
	 * @property {luga.data.DataSet} parentDataSet  Master dataSet. Required
	 */

	/**
	 * DetailSet class
	 * Register itself as observer of the passed dataSet and act as the details in a master/details scenario
	 *
	 * @param {luga.data.DetailSet.options} options
	 * @constructor
	 * @extend luga.Notifier
	 * @fire dataChanged
	 * @listen dataChanged
	 * @listen currentRowChanged
	 */
	luga.data.DetailSet = function(options){

		const CONST = {
			ERROR_MESSAGES: {
				INVALID_UUID_PARAMETER: "luga.data.DetailSet: id parameter is required",
				INVALID_DS_PARAMETER: "luga.data.DetailSet: parentDataSet parameter is required"
			}
		};

		if(options.uuid === undefined){
			throw(CONST.ERROR_MESSAGES.INVALID_UUID_PARAMETER);
		}
		if(options.parentDataSet === undefined){
			throw(CONST.ERROR_MESSAGES.INVALID_DS_PARAMETER);
		}

		luga.extend(luga.Notifier, this);

		/** @type {luga.data.DetailSet} */
		const self = this;

		this.uuid = options.uuid;
		this.parentDataSet = options.parentDataSet;
		this.parentDataSet.addObserver(this);

		/** @type {luga.data.DataSet.row} */
		this.row = null;

		luga.data.setDataSource(this.uuid, this);

		/**
		 * @return {luga.data.DetailSet.context}
		 */
		this.getContext = function(){
			const context = {
				entity: self.row
			};
			const stateDesc = luga.data.utils.assembleStateDescription(self.getState());
			luga.merge(context, stateDesc);
			return context;
		};

		/**
		 * Returns the detailSet's current state
		 * @return {null|luga.data.STATE}
		 */
		this.getState = function(){
			return self.parentDataSet.getState();
		};

		this.fetchRow = function(){
			self.row = self.parentDataSet.getCurrentRow();
			self.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/* Events Handlers */

		/**
		 * @param {luga.data.dataSourceChanged} data
		 */
		this.onDataChangedHandler = function(data){
			self.fetchRow();
		};

		/**
		 * @param {luga.data.DataSet.currentRowChanged} data
		 */
		this.onCurrentRowChangedHandler = function(data){
			self.fetchRow();
		};

		/**
		 * @param {luga.data.DataSet.stateChanged} data
		 */
		this.onStateChangedHandler = function(data){
			self.fetchRow();
		};

		/* Fetch row without notifying observers */
		self.row = self.parentDataSet.getCurrentRow();

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.DataSet.dataLoading
	 *
	 * @property {luga.data.DataSet} dataSet
	 */

	/**
	 * @typedef {Object} luga.data.HttpDataSet.options
	 *
	 * @extend luga.data.DataSet.options
	 * @property {string}    url              URL to be fetched. Default to null
	 * @property {number}    timeout          Timeout (in milliseconds) for the HTTP request. Default to 10 seconds
	 * @property {Object}    headers          A set of name/value pairs to be used as custom HTTP headers
	 * @property {boolean}   incrementalLoad  By default calling once .loadData() is called the dataSet discard all the previous records.
	 *                                        Set this to true to keep the old records. Default to false
	 * @property {boolean}   cache            If set to false, it will force requested pages not to be cached by the browser.
	 *                                        It works by appending "_={timestamp}" to the querystring. Default to true
	 */

	/**
	 * Base HttpDataSet class
	 * @param {luga.data.HttpDataSet.options} options
	 * @constructor
	 * @extend luga.data.DataSet
	 * @abstract
	 * @fire dataLoading
	 * @fire xhrError
	 * @throw {Exception}
	 */
	luga.data.HttpDataSet = function(options){
		luga.extend(luga.data.DataSet, this, [options]);
		/** @type {luga.data.HttpDataSet} */
		const self = this;

		const CONST = {
			ERROR_MESSAGES: {
				HTTP_DATA_SET_ABSTRACT: "luga.data.HttpDataSet is an abstract class",
				XHR_FAILURE: "Failed to retrieve: {0}. HTTP status: {1}. Error: {2}",
				NEED_URL_TO_LOAD: "Unable to call loadData(). DataSet is missing a URL"
			}
		};

		if(this.constructor === luga.data.HttpDataSet){
			throw(CONST.ERROR_MESSAGES.HTTP_DATA_SET_ABSTRACT);
		}

		this.url = null;
		if(options.url !== undefined){
			this.url = options.url;
		}

		this.timeout = luga.data.CONST.XHR_TIMEOUT;
		if(options.timeout !== undefined){
			this.timeout = options.timeout;
		}

		this.cache = true;
		if(options.cache !== undefined){
			this.cache = options.cache;
		}

		this.headers = [];
		if(options.headers !== undefined){
			this.headers = options.headers;
		}

		this.incrementalLoad = false;
		if(options.incrementalLoad !== undefined){
			this.incrementalLoad = options.incrementalLoad;
		}

		// Concrete implementations can override this
		this.contentType = "text/plain";
		this.xhrRequest = null;

		/* Private methods */

		const loadUrl = function(){
			const xhrOptions = {
				url: self.url,
				success: function(response){
					if(self.incrementalLoad === false){
						self.delete();
					}
					self.loadRecords(response);
				},
				contentType: self.contentType,
				timeout: self.timeout,
				cache: self.cache,
				headers: self.headers,
				error: self.xhrError
			};
			self.xhrRequest = new luga.xhr.Request(xhrOptions);
			self.xhrRequest.send(self.url);
		};

		/* Public methods */

		/**
		 * Abort any pending XHR request
		 */
		this.cancelRequest = function(){
			if(this.xhrRequest !== null){
				this.xhrRequest.abort();
				this.xhrRequest = null;
			}
		};

		/**
		 * Returns the URL that will be used to fetch the data. Returns null if URL is not set
		 * @return {string|null}
		 */
		this.getUrl = function(){
			return this.url;
		};

		/**
		 * Fires an XHR request to fetch and load the data, notify observers ("dataLoading" first, "dataChanged" after records are loaded).
		 * Throws an exception if URL is not set
		 * @fire dataLoading
		 * @throw {Exception}
		 */
		this.loadData = function(){
			if(this.url === null){
				throw(CONST.ERROR_MESSAGES.NEED_URL_TO_LOAD);
			}
			this.setState(luga.data.STATE.LOADING);
			this.notifyObservers(luga.data.CONST.EVENTS.DATA_LOADING, {dataSet: this});
			this.cancelRequest();
			loadUrl();
		};

		/**
		 * Abstract method, concrete classes must implement it to extract records from XHR response
		 * @param {luga.xhr.response} response
		 * @abstract
		 */
		/* istanbul ignore next */
		this.loadRecords = function(response){
		};

		/**
		 * Set the URL that will be used to fetch the data.
		 * This method does not load the data into the data set, it merely sets the internal URL.
		 * The developer must call loadData() to actually trigger the data loading
		 * @param {string} newUrl
		 */
		this.setUrl = function(newUrl){
			this.url = newUrl;
		};

		/**
		 * Is called whenever an XHR request fails, set state to error, notify observers ("xhrError")
		 * @param {luga.xhr.response} response
		 * @fire xhrError
		 */
		this.xhrError = function(response){
			self.setState(luga.data.STATE.ERROR);
			self.notifyObservers(luga.data.CONST.EVENTS.XHR_ERROR, {
				dataSet: self,
				message: luga.string.format(CONST.ERROR_MESSAGES.XHR_FAILURE, [self.url, response.status]),
				response: response
			});
		};

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.JsonDataSet.options
	 *
	 * @extend luga.data.HttpDataSet.options
	 * @property {string|null}   path      Specifies the path to the data within the JSON structure.
	 *                                     The path is expressed as a set of property names on the objects, separated by dots. Default to null
	 */

	/**
	 * JSON dataSet class
	 * @param {luga.data.JsonDataSet.options} options
	 * @constructor
	 * @extend luga.data.HttpDataSet
	 */
	luga.data.JsonDataSet = function(options){
		luga.extend(luga.data.HttpDataSet, this, [options]);
		/** @type {luga.data.JsonDataSet} */
		const self = this;
		/** @override */
		this.contentType = "application/json";

		this.path = null;
		if(options.path !== undefined){
			this.path = options.path;
		}

		/** @type {null|json} */
		this.rawJson = null;

		/* Public methods */

		/**
		 * Returns the raw JSON data structure
		 * @return {null|json}
		 */
		this.getRawJson = function(){
			return this.rawJson;
		};

		/**
		 * Returns the path to be used to extract data out of the JSON data structure
		 * @return {null|string}
		 */
		this.getPath = function(){
			return this.path;
		};

		/**
		 * First delete any existing records, then load data from the given JSON, without XHR calls
		 * @param {json} json
		 */
		this.loadRawJson = function(json){
			self.delete();
			loadFromJson(json);
		};

		/**
		 * Retrieves JSON data from an HTTP response, apply the path, if any, extract and load records out of it
		 * @param {luga.xhr.response} response
		 * @override
		 */
		this.loadRecords = function(response){
			loadFromJson(JSON.parse(response.responseText));
		};

		const loadFromJson = function(json){
			self.rawJson = json;
			if(self.path === null){
				self.insert(json);
			}
			else{
				const records = luga.lookupProperty(json, self.path);
				if(records !== undefined){
					self.insert(records);
				}
			}
		};

		/**
		 * Set the path to be used to extract data out of the JSON data structure
		 * @param {string} path   Data path, expressed as a set of property names on the objects, separated by dots. Required
		 */
		this.setPath = function(path){
			this.path = path;
		};

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.XmlDataSet.options
	 *
	 * @extend luga.data.HttpDataSet.options
	 * @property {string} path  Specifies the XPath expression to be used to extract nodes from the XML document. Default to: "/"
	 */

	/**
	 * XML dataSet class
	 * @param {luga.data.XmlDataSet.options} options
	 * @constructor
	 * @extend luga.data.HttpDataSet
	 */
	luga.data.XmlDataSet = function(options){
		luga.extend(luga.data.HttpDataSet, this, [options]);
		/** @type {luga.data.XmlDataSet} */
		const self = this;
		/** @override */
		this.contentType = "application/xml";

		this.path = "/";
		if(options.path !== undefined){
			this.path = options.path;
		}

		/** @type {null|Node} */
		this.rawXml = null;

		/* Public methods */

		/**
		 * Returns the raw XML data
		 * @return {null|Node}
		 */
		this.getRawXml = function(){
			return this.rawXml;
		};

		/**
		 * Returns the XPath expression to be used to extract data out of the XML
		 * @return {null|string}
		 */
		this.getPath = function(){
			return this.path;
		};

		/**
		 * First delete any existing records, then load data from the given XML, without XHR calls
		 * @param {string} xmlStr
		 */
		this.loadRawXml = function(xmlStr){
			self.delete();
			self.loadRecords({
				responseText: xmlStr
			});
		};

		/**
		 * Retrieves XML data from an HTTP response, apply the path, if any, extract and load records out of it
		 * @param {luga.xhr.response} response
		 * @override
		 */
		this.loadRecords = function(response){
			const xmlDoc = luga.data.xml.parseFromString(response.responseText);
			self.rawXml = xmlDoc;
			const nodes = luga.data.xml.evaluateXPath(xmlDoc, self.path);
			const records = [];
			for(let i = 0; i < nodes.length; i++){
				records.push(luga.data.xml.nodeToHash(nodes[i]));
			}
			self.insert(records);
		};

		/**
		 * Set the the XPath expression to be used to extract data out of the XML
		 * @param {string} path   XPath expression. Required
		 */
		this.setPath = function(path){
			this.path = path;
		};

	};

}());
/**
 * @typedef {Object} luga.data.DataSet.context
 * @extend luga.data.stateDescription
 *
 * @property {number}                         recordCount
 * @property {Array.<luga.data.DataSet.row>}  items
 */

(function(){
	"use strict";

	/**
	 * RSS 2.0 dataSet class
	 * @param {luga.data.HttpDataSet.options} options
	 * @constructor
	 * @extend luga.data.HttpDataSet
	 */
	luga.data.Rss2Dataset = function(options){
		luga.extend(luga.data.XmlDataSet, this, [options]);
		/** @type {luga.data.Rss2Dataset} */
		const self = this;

		/** @type {null|string} */
		this.rawXml = null;

		/** @type {Array.<String>} */
		this.channelElements = ["title", "link", "description", "language", "copyright", "managingEditor", "webMaster", "pubDate", "lastBuildDate", "category", "generator", "docs", "cloud", "ttl", "image", "textInput", "skipHours", "skipDays"];

		/** @type {Array.<String>} */
		this.itemElements = ["title", "link", "description", "author", "category", "comments", "enclosure", "guid", "pubDate", "source"];

		// Store metadata extracted from <channel>
		this.channelMeta = {};

		/**
		 * Given an <item> node, extract its content inside a JavaScript object
		 * @param {Node} item
		 * @return {Object}
		 */
		const itemToHash = function(item){
			const rec = {};
			for(let i = 0; i < self.itemElements.length; i++){
				const element = self.itemElements[i];
				const nodes = luga.data.xml.evaluateXPath(item, element);
				if(nodes.length > 0){
					rec[element] = getTextValue(nodes[0]);
				}

			}
			return rec;
		};

		/**
		 * Extract metadata from <channel>
		 * @param {Node} channel
		 */
		const setChannelMeta = function(channel){
			for(let i = 0; i < self.channelElements.length; i++){
				const element = self.channelElements[i];
				const nodes = luga.data.xml.evaluateXPath(channel, element);
				if(nodes.length > 0){
					self.channelMeta[element] = getTextValue(nodes[0]);
				}
			}
		};

		/**
		 * Turn an array of <items> nodes into an array of records
		 * @param {Array.<Node>} nodes
		 * @return {Array.<Object>}
		 */
		const extractRecords = function(nodes){
			const records = [];
			nodes.forEach(function(element){
				records.push(itemToHash(element));
			});
			return records;
		};

		/* Utilities */

		/**
		 * Extract text out of a TEXT or CDATA node
		 * @param {HTMLElement} node
		 * @return {string}
		 */
		function getTextValue(node){
			const child = node.childNodes[0];
			/* istanbul ignore else */
			if((child.nodeType === 3) /* TEXT_NODE */){
				return child.data;
			}
		}

		/* Public methods */

		/**
		 * @return {luga.data.Rss2Dataset.context}
		 * @override
		 */
		this.getContext = function(){
			const context = {
				items: self.select(),
				recordCount: self.getRecordsCount()
			};
			const stateDesc = luga.data.utils.assembleStateDescription(self.getState());
			luga.merge(context, stateDesc);
			luga.merge(context, self.channelMeta);
			return context;
		};

		/**
		 * Retrieves XML data from an HTTP response
		 * @param {luga.xhr.response} response
		 * @override
		 */
		this.loadRecords = function(response){
			const xmlDoc = luga.data.xml.parseFromString(response.responseText);
			self.rawXml = xmlDoc;
			// Extract metadata
			const channelNodes = luga.data.xml.evaluateXPath(xmlDoc, "//channel");
			setChannelMeta(channelNodes[0]);
			// Insert all records
			const items = luga.data.xml.evaluateXPath(xmlDoc, "//item");
			const records = extractRecords(items);
			self.insert(records);
		};

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.ChildJsonDataSet.options
	 *
	 * @extend luga.data.JsonDataSet.options
	 * @property {luga.data.DataSet}  parentDataSet   Parent dataSet to be used in a master-detail scenario
	 * @property {string}             url             Unlike JsonDataSet the url here is required and is expected to be a string template like:
	 *                                                http://www.ciccio.com/api/products/{uuid}
	 *
	 */

	/**
	 * Binded JSON dataSet class
	 * @param {luga.data.ChildJsonDataSet.options} options
	 * @constructor
	 * @extend luga.data.JsonDataSet
	 */
	luga.data.ChildJsonDataSet = function(options){

		const CONST = {
			ERROR_MESSAGES: {
				MISSING_PARENT_DS: "luga.data.ChildJsonDataSet: parentDataSet parameter is required",
				MISSING_URL: "luga.data.ChildJsonDataSet: url parameter is required",
				FAILED_URL_BINDING: "luga.data.ChildJsonDataSet: unable to generate valid URL: {0}"
			}
		};

		if(options.parentDataSet === undefined){
			throw(CONST.ERROR_MESSAGES.MISSING_PARENT_DS);
		}

		if(options.url === undefined){
			throw(CONST.ERROR_MESSAGES.MISSING_URL);
		}

		luga.extend(luga.data.JsonDataSet, this, [options]);

		/** @type {luga.data.ChildJsonDataSet} */
		const self = this;

		/** @type {luga.data.JsonDataSet} */
		this.parentDataSet = options.parentDataSet;
		this.parentDataSet.addObserver(this);
		this.url = null;
		this.urlPattern = options.url;

		/**
		 * @param {luga.data.DataSet.row} row
		 */
		this.fetchData = function(row){
			const bindUrl = luga.string.populate(self.urlPattern, row);
			if(bindUrl === self.urlPattern){
				throw(luga.string.format(CONST.ERROR_MESSAGES.FAILED_URL_BINDING, [bindUrl]));
			}
			self.setUrl(bindUrl);
			self.loadData();
		};

		/* Events Handlers */

		/**
		 * @param {luga.data.DataSet.currentRowChanged} data
		 */
		this.onCurrentRowChangedHandler = function(data){
			if(data.currentRow !== null){
				self.fetchData(data.currentRow);
			}
			else{
				self.delete();
			}

		};

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.ChildXmlDataSet.options
	 *
	 * @extend luga.data.XmlDataSet.options
	 * @property {luga.data.DataSet}  parentDataSet   Parent dataSet to be used in a master-detail scenario
	 * @property {string}             url             Unlike XmlDataSet the url here is required and is expected to be a string template like:
	 *                                                http://www.ciccio.com/api/products/{uuid}
	 *
	 */

	/**
	 * Binded XML dataSet class
	 * @param {luga.data.ChildXmlDataSet.options} options
	 * @constructor
	 * @extend luga.data.XmlDataSet
	 */
	luga.data.ChildXmlDataSet = function(options){

		const CONST = {
			ERROR_MESSAGES: {
				MISSING_PARENT_DS: "luga.data.ChildXmlDataSet: parentDataSet parameter is required",
				MISSING_URL: "luga.data.ChildXmlDataSet: url parameter is required",
				FAILED_URL_BINDING: "luga.data.ChildXmlDataSet: unable to generate valid URL: {0}"
			}
		};

		if(options.parentDataSet === undefined){
			throw(CONST.ERROR_MESSAGES.MISSING_PARENT_DS);
		}

		if(options.url === undefined){
			throw(CONST.ERROR_MESSAGES.MISSING_URL);
		}

		luga.extend(luga.data.XmlDataSet, this, [options]);

		/** @type {luga.data.ChildXmlDataSet} */
		const self = this;

		/** @type {luga.data.XmlDataSet} */
		this.parentDataSet = options.parentDataSet;
		this.parentDataSet.addObserver(this);
		this.url = null;
		this.urlPattern = options.url;

		/**
		 * @param {luga.data.DataSet.row} row
		 */
		this.fetchData = function(row){
			const bindUrl = luga.string.populate(self.urlPattern, row);
			if(bindUrl === self.urlPattern){
				throw(luga.string.format(CONST.ERROR_MESSAGES.FAILED_URL_BINDING, [bindUrl]));
			}
			self.setUrl(bindUrl);
			self.loadData();
		};

		/* Events Handlers */

		/**
		 * @param {luga.data.DataSet.currentRowChanged} data
		 */
		this.onCurrentRowChangedHandler = function(data){
			if(data.currentRow !== null){
				self.fetchData(data.currentRow);
			}
			else{
				self.delete();
			}

		};

	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.PagedView.context
	 *
	 * @extend luga.data.DataSet.context
	 * @property {number} currentPageNumber        The current page index. Starting at 1
	 * @property {number} currentPageRecordCount   The total number of records in the current page
	 * @property {number} pageCount                The total number of pages required to display all of the data
	 * @property {number} pageSize                 The maximum number of items that can be in a page
	 * @property {number} currentOffsetStart       Zero-based offset of the first record inside the current page
	 * @property {number} currentOffsetEnd         Zero-based offset of the last record inside the current page
	 */

	/**
	 * @typedef {Object} luga.data.PagedView.options
	 *
	 * @property {string}            uuid           Unique identifier. Required
	 * @property {luga.data.DataSet} parentDataSet  Instance of a dataSet. Required
	 * @property {number}            pageSize       The max number of rows in a given page. Default to 10
	 */

	/*
	 *  PagedView class
	 *  Works by reading a dataSet and extracting information out of it in order to generate additional information that can be used for paging
	 *
	 * @param {luga.data.PagedView.options} options
	 * @constructor
	 * @extend luga.Notifier
	 */
	luga.data.PagedView = function(options){

		const CONST = {
			ERROR_MESSAGES: {
				INVALID_UUID_PARAMETER: "luga.data.PagedView: id parameter is required",
				INVALID_DS_PARAMETER: "luga.data.PagedView: parentDataSet parameter is required"
			}
		};

		if(options.uuid === undefined){
			throw(CONST.ERROR_MESSAGES.INVALID_UUID_PARAMETER);
		}
		if(options.parentDataSet === undefined){
			throw(CONST.ERROR_MESSAGES.INVALID_DS_PARAMETER);
		}

		luga.extend(luga.Notifier, this);

		/** @type {luga.data.PagedView} */
		const self = this;

		this.uuid = options.uuid;
		this.parentDataSet = options.parentDataSet;
		this.parentDataSet.addObserver(this);

		luga.data.setDataSource(this.uuid, this);

		let pageSize = 10;
		if(options.pageSize !== undefined){
			pageSize = options.pageSize;
		}

		let currentPage = 1;
		let currentOffsetStart = 0;

		/**
		 * @return {luga.data.PagedView.context}
		 */
		this.getContext = function(){
			const context = self.parentDataSet.getContext();
			context.entities = context.entities.slice(self.getCurrentOffsetStart(), self.getCurrentOffsetEnd() + 1);
			// Additional fields
			context.currentPageNumber = self.getCurrentPageIndex();
			context.currentPageRecordCount = context.entities.length;
			context.currentOffsetEnd = self.getCurrentOffsetEnd();
			context.currentOffsetStart = self.getCurrentOffsetStart();
			context.pageSize = self.getPageSize();
			context.pageCount = self.getPagesCount();
			return context;
		};

		/**
		 * Return the zero-based offset of the last record inside the current page
		 * @return {number}
		 */
		this.getCurrentOffsetEnd = function(){
			let offSet = self.getCurrentOffsetStart() + self.getPageSize() - 1;
			if(offSet > self.getRecordsCount()){
				offSet = self.getRecordsCount();
			}
			return offSet;
		};

		/**
		 * Return the zero-based offset of the first record inside the current page
		 * @return {number}
		 */
		this.getCurrentOffsetStart = function(){
			return currentOffsetStart;
		};

		/**
		 * Return the current page index. Starting at 1
		 * @return {number}
		 */
		this.getCurrentPageIndex = function(){
			return currentPage;
		};

		/**
		 * Return the total number of pages required to display all of the data
		 * @return {number}
		 */
		this.getPagesCount = function(){
			return parseInt((self.parentDataSet.getRecordsCount() + self.getPageSize() - 1) / self.getPageSize());
		};

		/**
		 * Return the maximum number of items that can be in a page
		 * @return {number}
		 */
		this.getPageSize = function(){
			return pageSize;
		};

		/**
		 * Navigate to the given page number
		 * Fails silently if the given page number is out of range
		 * It also change the index of the current row to match the first record in the page
		 * @param {number} pageNumber
		 * @fire dataChanged
		 */
		this.goToPage = function(pageNumber){
			if(self.isPageInRange(pageNumber) === false){
				return;
			}
			if(pageNumber === self.getCurrentPageIndex()){
				return;
			}
			currentPage = pageNumber;
			currentOffsetStart = ((pageNumber - 1) * self.getPageSize());

			self.setCurrentRowIndex(self.getCurrentOffsetStart());
			self.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/**
		 * Navigate to the next page
		 * Fails silently if the current page is the last one
		 */
		this.goToNextPage = function(){
			self.goToPage(self.getCurrentPageIndex() + 1);
		};

		/**
		 * Navigate to the previous page
		 * Fails silently if the current page is the first one
		 */
		this.goToPrevPage = function(){
			self.goToPage(self.getCurrentPageIndex() - 1);
		};

		/**
		 * Return true if the given page is within range. False otherwise
		 * @param {number} pageNumber
		 * @return {boolean}
		 */
		this.isPageInRange = function(pageNumber){
			if(pageNumber < 1 || pageNumber > self.getPagesCount()){
				return false;
			}
			return true;
		};

		/**
		 * To be used for type checking
		 * @return {boolean}
		 */
		this.isPagedView = function(){
			return true;
		};

		/* Proxy methods */

		/**
		 * Call the parent dataSet
		 * @return {number}
		 */
		this.getCurrentRowIndex = function(){
			return self.parentDataSet.getCurrentRowIndex();
		};

		/**
		 * Call the parent dataSet
		 * @return {number}
		 */
		this.getRecordsCount = function(){
			return self.parentDataSet.getRecordsCount();
		};

		/**
		 * Call the parent dataSet .loadData() method, if any
		 * @fire dataLoading
		 * @throw {Exception}
		 */
		this.loadData = function(){
			if(self.parentDataSet.loadData !== undefined){
				self.parentDataSet.loadData();
			}
		};

		/**
		 * Call the parent dataSet
		 * @param {string|null} rowId  Required
		 * @fire currentRowChanged
		 * @throw {Exception}
		 */
		this.setCurrentRowId = function(rowId){
			self.parentDataSet.setCurrentRowId(rowId);
		};

		/**
		 * Call the parent dataSet
		 * @param {number} index  New index. Required
		 * @fire currentRowChanged
		 * @throw {Exception}
		 */
		this.setCurrentRowIndex = function(index){
			self.parentDataSet.setCurrentRowIndex(index);
		};

		/**
		 * Call the parent dataSet
		 * @param {null|luga.data.STATE} newState
		 * @fire stateChanged
		 */
		this.setState = function(newState){
			self.parentDataSet.setState(newState);
		};

		/**
		 * Call the parent dataSet
		 * Be aware this only sort the data, it does not affects pagination
		 * @param {string|Array<string>}  columnNames             Required, either a single column name or an array of names
		 * @param {luga.data.sort.ORDER} [sortOrder="toggle"]     Either "ascending", "descending" or "toggle". Optional, default to "toggle"
		 * @fire preDataSorted
		 * @fire dataSorted
		 * @fire dataChanged
		 */
		this.sort = function(columnNames, sortOrder){
			self.parentDataSet.sort(columnNames, sortOrder);
			self.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/* Events Handlers */

		/**
		 * @param {luga.data.dataSourceChanged} data
		 */
		this.onDataChangedHandler = function(data){
			self.notifyObservers(luga.data.CONST.EVENTS.DATA_CHANGED, {dataSource: this});
		};

		/**
		 * @param {luga.data.stateChanged} data
		 */
		this.onStateChangedHandler = function(data){
			self.notifyObservers(luga.data.CONST.EVENTS.STATE_CHANGED, {dataSource: this});
		};

	};

}());
(function(){
	"use strict";

	luga.namespace("luga.data.region");

	luga.data.region.CONST = {
		CUSTOM_ATTRIBUTES: {
			DATA_SOURCE_UUID: "data-lugaregion-datasource-uuid",
			REGION: "data-lugaregion",
			REGION_TYPE: "data-lugaregion-type",
			TEMPLATE_ID: "data-lugaregion-template-id",
			TRAITS: "data-lugaregion-traits",
			REGION_REFERENCE: "luga-region-reference"
		},
		DEFAULT_REGION_TYPE: "luga.data.region.Handlebars",
		DEFAULT_TRAITS: [
			"luga.data.region.traits.select",
			"luga.data.region.traits.setRowId",
			"luga.data.region.traits.setRowIndex",
			"luga.data.region.traits.sort"
		],
		ERROR_MESSAGES: {
			MISSING_DATA_SOURCE_ATTRIBUTE: "Missing required data-lugaregion-datasource-uuid attribute inside region",
			MISSING_DATA_SOURCE: "Unable to find datasource {0}",
			MISSING_REGION_TYPE_FUNCTION: "Failed to create region. Unable to find a constructor function named: {0}"
		},
		EVENTS: {
			REGION_RENDERED: "regionRendered"
		},
		SELECTORS: {
			REGION: "*[data-lugaregion='true']"
		}
	};

	/**
	 * @typedef {Object} luga.data.region.options
	 *
	 * @property {boolean} autoregister  Determine if we call luga.data.region.init() on luga.dom.ready()
	 */

	/**
	 * @type {luga.data.region.options}
	 */
	const config = {
		autoregister: true
	};

	/**
	 * Change current configuration
	 * @param {luga.data.region.options} options
	 * @return {luga.data.region.options}
	 */
	luga.data.region.setup = function(options){
		luga.merge(config, options);
		return config;
	};

	/**
	 * Given a DOM node, returns the region object associated to it
	 * Returns undefined if the node is not associated to a region
	 * @param {HTMLElement} node
	 * @return {undefined|luga.data.region.Base}
	 */
	luga.data.region.getReferenceFromNode = function(node){
		return node[luga.data.region.CONST.CUSTOM_ATTRIBUTES.REGION_REFERENCE];
	};

	/**
	 * Given a DOM node, initialize the relevant Region handler
	 * @param {HTMLElement} node
	 * @throw {Exception}
	 */
	luga.data.region.init = function(node){
		const dataSourceId = node.getAttribute(luga.data.region.CONST.CUSTOM_ATTRIBUTES.DATA_SOURCE_UUID);
		if(dataSourceId === null){
			throw(luga.data.region.CONST.ERROR_MESSAGES.MISSING_DATA_SOURCE_ATTRIBUTE);
		}
		const dataSource = luga.data.getDataSource(dataSourceId);
		if(dataSource === null){
			throw(luga.string.format(luga.data.region.CONST.ERROR_MESSAGES.MISSING_DATA_SOURCE, [dataSourceId]));
		}
		let regionType = node.getAttribute(luga.data.region.CONST.CUSTOM_ATTRIBUTES.REGION_TYPE);
		if(regionType === null){
			regionType = luga.data.region.CONST.DEFAULT_REGION_TYPE;
		}
		const RegionClass = luga.lookupFunction(regionType);
		if(RegionClass === undefined){
			throw(luga.string.format(luga.data.region.CONST.ERROR_MESSAGES.MISSING_REGION_TYPE_FUNCTION, [regionType]));
		}
		new RegionClass({node: node});
	};

	/**
	 * Bootstrap any region contained within the given node
	 * @param {HTMLElement|undefined} [rootNode]   Optional, default to <body>
	 */
	luga.data.region.initRegions = function(rootNode){
		if(rootNode === undefined){
			rootNode = document.querySelector("body");
		}
		/* istanbul ignore else */
		if(rootNode !== null){
			const nodes = rootNode.querySelectorAll(luga.data.region.CONST.SELECTORS.REGION);
			for(let i = 0; i < nodes.length; i++){
				luga.data.region.init(nodes[i]);
			}
		}
	};

	luga.namespace("luga.data.region.utils");

	/**
	 * @typedef {Object} luga.data.region.description
	 *
	 * @property {HTMLElement}                           node   A DOM node containing the region.
	 * @property {luga.data.DataSet|luga.data.DetailSet} ds     DataSource
	 */

	/**
	 * Given a region instance, returns an object containing its critical data
	 * @param {luga.data.region.Base} region
	 * @return {luga.data.region.description}
	 */
	luga.data.region.utils.assembleRegionDescription = function(region){
		return {
			node: region.config.node,
			ds: region.dataSource
		};
	};

	luga.dom.ready(function(){
		/* istanbul ignore else */
		if(config.autoregister === true){
			luga.data.region.initRegions();
		}
	});

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.region.options
	 *
	 * @property {HTMLElement } node                          The DOM node that will contain the region. Required
	 * @property {luga.data.DataSet|luga.data.DetailSet} ds   DataSource. Required if dsUuid is not specified
	 * @property {string} dsUuid                              DataSource's uuid. Can be specified inside the data-lugaregion-datasource attribute too. Required if ds is not specified
	 * @property {Array.<string>} [undefined]  traits         An array of function names that will be called every time the Region is rendered. Optional
	 * @property {string} templateId                          Id of HTML element containing the template. Can be specified inside the data-lugaregion-template attribute too.
	 *                                                        If not available it assumes the node contains the template
	 */

	/**
	 * Abstract Region class
	 * Concrete implementations must extend this and implement the .render() method
	 * @param {luga.data.Region.options} options
	 * @constructor
	 * @abstract
	 * @extend luga.Notifier
	 * @fire regionRendered
	 * @listen dataChanged
	 * @listen stateChanged
	 * @throw {Exception}
	 */
	luga.data.region.Base = function(options){

		luga.extend(luga.Notifier, this);

		this.CONST = {
			ERROR_MESSAGES: {
				INVALID_TRAIT: "luga.data.region invalid trait: {0} is not a function",
				MISSING_NODE: "luga.data.region was unable find the region node"
			}
		};

		if(options.node === undefined){
			throw(this.CONST.ERROR_MESSAGES.MISSING_NODE);
		}

		this.config = {
			node: null, // Required
			// Either: custom attribute or incoming option
			dsUuid: options.node.getAttribute(luga.data.region.CONST.CUSTOM_ATTRIBUTES.DATA_SOURCE_UUID) || null,
			templateId: options.node.getAttribute(luga.data.region.CONST.CUSTOM_ATTRIBUTES.TEMPLATE_ID) || null,
			// Either: incoming option or null
			traits: options.traits || null,
			ds: null
		};
		luga.merge(this.config, options);
		const self = this;

		/** @type {luga.data.DataSet|luga.data.DetailSet} */
		this.dataSource = null;
		if(this.config.ds !== null){
			// We've got a direct reference from the options
			this.dataSource = this.config.ds;
		}
		else{
			// We've got a dataSource Id
			this.dataSource = luga.data.getDataSource(this.config.dsUuid);
		}
		if(this.dataSource === null){
			throw(luga.string.format(luga.data.region.CONST.ERROR_MESSAGES.MISSING_DATA_SOURCE, [this.config.dsId]));
		}
		this.dataSource.addObserver(this);

		/** @type {Array.<string>} */
		this.traits = luga.data.region.CONST.DEFAULT_TRAITS;
		// Extract traits from custom attribute, if any
		const attrTraits = this.config.node.getAttribute(luga.data.region.CONST.CUSTOM_ATTRIBUTES.TRAITS);
		if(attrTraits !== null){
			this.traits = this.traits.concat(attrTraits.split(","));
		}
		if(this.config.traits !== null){
			this.traits = this.traits.concat(this.config.traits);
		}

		// Store reference inside node
		this.config.node[luga.data.region.CONST.CUSTOM_ATTRIBUTES.REGION_REFERENCE] = this;

		this.applyTraits = function(){
			const traitData = {
				node: this.config.node,
				dataSource: this.dataSource
			};
			for(let i = 0; i < this.traits.length; i++){
				const func = luga.lookupFunction(this.traits[i]);
				if(func !== undefined){
					func(traitData);
				}
				else{
					throw(luga.string.format(this.CONST.ERROR_MESSAGES.INVALID_TRAIT, [this.traits[i]]));
				}
			}
		};

		/**
		 * @abstract
		 * @fire regionRendered
		 */
		this.render = function(){
			// Concrete implementations must overwrite this
			const desc = luga.data.region.utils.assembleRegionDescription(this);
			this.notifyObservers(luga.data.region.CONST.EVENTS.REGION_RENDERED, desc);
		};

		/* Events Handlers */

		/**
		 * @param {luga.data.currentRowChanged} data
		 */
		this.onCurrentRowChangedHandler = function(data){
			self.applyTraits();
		};

		/**
		 * @param {luga.data.dataSourceChanged} data
		 */
		this.onDataChangedHandler = function(data){
			self.render();
		};

		/**
		 * @param {luga.data.stateChanged} data
		 */
		this.onStateChangedHandler = function(data){
			self.render();
		};

	};

}());
(function(){
	"use strict";

	/**
	 * Handlebars Region class
	 * @param {luga.data.Region.options} options
	 * @constructor
	 * @extend luga.data.region.Base
	 * @fire regionRendered
	 * @throw {Exception}
	 */
	luga.data.region.Handlebars = function(options){

		luga.extend(luga.data.region.Base, this, [options]);
		const self = this;

		// The messages below are specific to this implementation
		self.CONST.HANDLEBARS_ERROR_MESSAGES = {
			MISSING_HANDLEBARS: "Unable to find Handlebars",
			MISSING_TEMPLATE_FILE: "luga.data.region.Handlebars was unable to retrieve file: {0} containing an Handlebars template",
			MISSING_TEMPLATE_NODE: "luga.data.region.Handlebars was unable find an HTML element with id: {0} containing an Handlebars template"
		};

		this.template = "";

		/**
		 * @param {HTMLElement} node
		 */
		const fetchTemplate = function(node){
			// Inline template
			if(self.config.templateId === null){
				self.template = Handlebars.compile(node.innerHTML);
			}
			else{
				const templateNode = document.getElementById(self.config.templateId);
				if(templateNode === null){
					throw(luga.string.format(self.CONST.HANDLEBARS_ERROR_MESSAGES.MISSING_TEMPLATE_NODE, [self.config.templateId]));
				}
				const templateSrc = templateNode.getAttribute("src");
				if(templateSrc === null){
					// Embed template
					self.template = Handlebars.compile(templateNode.innerHTML);
				}
				else{
					// External template
					const xhrOptions = {
						success: function(response){
							self.template = Handlebars.compile(response.responseText);
							self.render();
						},
						error: function(response){
							throw(luga.string.format(self.CONST.HANDLEBARS_ERROR_MESSAGES.MISSING_TEMPLATE_FILE, [templateSrc]));
						}
					};
					const xhr = new luga.xhr.Request(xhrOptions);
					xhr.send(templateSrc);
				}
			}
		};

		/**
		 * @return {string}
		 */
		this.generateHtml = function(){
			return this.template(this.dataSource.getContext());
		};

		/*
		 @override
		 @fire regionRendered
		 */
		this.render = function(){
			/* istanbul ignore else */
			if(this.template !== ""){
				this.config.node.innerHTML = this.generateHtml();
				this.applyTraits();
				const desc = luga.data.region.utils.assembleRegionDescription(this);
				this.notifyObservers(luga.data.region.CONST.EVENTS.REGION_RENDERED, desc);
			}
		};

		/* Constructor */
		fetchTemplate(this.config.node);

	};

}());
(function(){
	"use strict";

	luga.namespace("luga.data.region.traits");

	/**
	 * @typedef {Object} luga.data.region.traits.options
	 *
	 * @property {HTMLElement}                            node          A DOM node. Required
	 * @property {luga.data.DataSet|luga.data.DetailSet}  dataSource    DataSource. Required
	 */

	const CONST = {
		CUSTOM_ATTRIBUTES: {
			SELECT: "data-lugaregion-select",
			SET_ROW_ID: "data-lugaregion-setrowid",
			SET_ROW_INDEX: "data-lugaregion-setrowindex",
			SORT: "data-lugaregion-sort"
		},
		SELECTORS: {
			SELECT: "*[data-lugaregion-select]",
			SET_ROW_ID: "*[data-lugaregion-setrowid]",
			SET_ROW_INDEX: "*[data-lugaregion-setrowindex]",
			SORT: "*[data-lugaregion-sort]"
		}
	};

	const removeCssClass = function(nodeList, className){
		nodeList.forEach(function(item){
			item.classList.remove(className);
		});
	};

	/**
	 * Handles data-lugaregion-select
	 * @param {luga.data.region.traits.options} options
	 */
	luga.data.region.traits.select = function(options){
		if(options.dataSource.getCurrentRowIndex === undefined){
			// It's a detailSet, abort
			return;
		}

		let nodes = options.node.querySelectorAll(CONST.SELECTORS.SELECT);
		nodes = Array.prototype.slice.call(nodes);

		if(nodes.length > 0){
			const cssClass = nodes[0].getAttribute(CONST.CUSTOM_ATTRIBUTES.SELECT);
			nodes[0].classList.remove(cssClass);
			// Default to first row
			let index = 0;

			if(options.dataSource.getCurrentRowIndex() === -1){
				// Remove class from everyone
				removeCssClass(nodes, cssClass);
			}
			else{
				index = options.dataSource.getCurrentRowIndex();
				// Apply CSS
				nodes[index].classList.add(cssClass);
			}

			// Attach click event to all nodes
			nodes.forEach(function(item){
				item.addEventListener("click", function(event){
					event.preventDefault();
					removeCssClass(nodes, cssClass);
					item.classList.add(cssClass);
				}, false);
			});

		}
	};

	/**
	 * Handles data-lugaregion-setrowid
	 * @param {luga.data.region.traits.options} options
	 */
	luga.data.region.traits.setRowId = function(options){
		let nodes = options.node.querySelectorAll(CONST.SELECTORS.SET_ROW_ID);
		nodes = Array.prototype.slice.call(nodes);

		nodes.forEach(function(item){
			item.addEventListener("click", function(event){
				event.preventDefault();
				const rowId = item.getAttribute(CONST.CUSTOM_ATTRIBUTES.SET_ROW_ID);
				options.dataSource.setCurrentRowId(rowId);
			}, false);
		});

	};

	/**
	 * Handles data-lugaregion-setrowindex
	 * @param {luga.data.region.traits.options} options
	 */
	luga.data.region.traits.setRowIndex = function(options){
		let nodes = options.node.querySelectorAll(CONST.SELECTORS.SET_ROW_INDEX);
		nodes = Array.prototype.slice.call(nodes);

		nodes.forEach(function(item){
			item.addEventListener("click", function(event){
				event.preventDefault();
				const rowIndex = parseInt(item.getAttribute(CONST.CUSTOM_ATTRIBUTES.SET_ROW_INDEX), 10);
				options.dataSource.setCurrentRowIndex(rowIndex);
			}, false);
		});
	};

	/**
	 * Handles data-lugaregion-sort
	 * @param {luga.data.region.traits.options} options
	 */
	luga.data.region.traits.sort = function(options){
		let nodes = options.node.querySelectorAll(CONST.SELECTORS.SORT);
		nodes = Array.prototype.slice.call(nodes);

		nodes.forEach(function(item){
			item.addEventListener("click", function(event){
				event.preventDefault();
				const sortCol = item.getAttribute(CONST.CUSTOM_ATTRIBUTES.SORT);
				options.dataSource.sort(sortCol);
			}, false);
		});

	};

}());
(function(){
	"use strict";

	luga.namespace("luga.data.sort");

	/**
	 * @typedef {string} luga.data.sort.ORDER
	 * @enum {string}
	 */
	luga.data.sort.ORDER = {
		ASC: "ascending",
		DESC: "descending",
		TOG: "toggle"
	};

	const CONST = {
		ERROR_MESSAGES: {
			UNSUPPORTED_DATA_TYPE: "luga.data.sort. Unsupported dataType: {0",
			UNSUPPORTED_SORT_ORDER: "luga.data.sort. Unsupported sortOrder: {0}"
		}
	};

	/**
	 * Return true if the passed order is supported
	 * @param {string}  sortOrder
	 * @return {boolean}
	 */
	luga.data.sort.isValidSortOrder = function(sortOrder){
		for(let key in luga.data.sort.ORDER){
			if(luga.data.sort.ORDER[key] === sortOrder){
				return true;
			}
		}
		return false;
	};

	/**
	 * Retrieve the relevant sort function matching the given combination of dataType and sortOrder
	 * @param {string}               dataType
	 * @param {luga.data.sort.ORDER} sortOrder
	 * @return {Function}
	 */
	luga.data.sort.getSortStrategy = function(dataType, sortOrder){
		if(luga.data.sort[dataType] === undefined){
			throw(luga.string.format(CONST.ERROR_MESSAGES.UNSUPPORTED_DATA_TYPE, [dataType]));
		}
		if(luga.data.sort[dataType][sortOrder] === undefined){
			throw(luga.string.format(CONST.ERROR_MESSAGES.UNSUPPORTED_SORT_ORDER, [sortOrder]));
		}
		return luga.data.sort[dataType][sortOrder];
	};

	/*
	 Lovingly adapted from Spry
	 Very special thanks to Kin Blas https://github.com/jblas
	 */

	luga.namespace("luga.data.sort.date");

	luga.data.sort.date.ascending = function(prop){
		return function(a, b){
			let dA = luga.lookupProperty(a, prop);
			let dB = luga.lookupProperty(b, prop);
			dA = dA ? (new Date(dA)) : 0;
			dB = dB ? (new Date(dB)) : 0;
			return dA - dB;
		};
	};

	luga.data.sort.date.descending = function(prop){
		return function(a, b){
			let dA = luga.lookupProperty(a, prop);
			let dB = luga.lookupProperty(b, prop);
			dA = dA ? (new Date(dA)) : 0;
			dB = dB ? (new Date(dB)) : 0;
			return dB - dA;
		};
	};

	luga.namespace("luga.data.sort.number");

	luga.data.sort.number.ascending = function(prop){
		return function(a, b){
			a = luga.lookupProperty(a, prop);
			b = luga.lookupProperty(b, prop);
			if(a === undefined || b === undefined){
				return (a === b) ? 0 : (a ? 1 : -1);
			}
			return a - b;
		};
	};

	luga.data.sort.number.descending = function(prop){
		return function(a, b){
			a = luga.lookupProperty(a, prop);
			b = luga.lookupProperty(b, prop);
			if(a === undefined || b === undefined){
				return (a === b) ? 0 : (a ? -1 : 1);
			}
			return b - a;
		};
	};

	luga.namespace("luga.data.sort.string");

	luga.data.sort.string.ascending = function(prop){
		return function(a, b){
			a = luga.lookupProperty(a, prop);
			b = luga.lookupProperty(b, prop);
			if(a === undefined || b === undefined){
				return (a === b) ? 0 : (a ? 1 : -1);
			}
			const tA = a.toString();
			const tB = b.toString();
			const tAlower = tA.toLowerCase();
			const tBlower = tB.toLowerCase();
			const minLen = tA.length > tB.length ? tB.length : tA.length;

			for(let i = 0; i < minLen; i++){
				const aLowerChar = tAlower.charAt(i);
				const bLowerChar = tBlower.charAt(i);
				const aChar = tA.charAt(i);
				const bChar = tB.charAt(i);
				if(aLowerChar > bLowerChar){
					return 1;
				}
				else if(aLowerChar < bLowerChar){
					return -1;
				}
				else if(aChar > bChar){
					return 1;
				}
				else if(aChar < bChar){
					return -1;
				}
			}
			if(tA.length === tB.length){
				return 0;
			}
			else if(tA.length > tB.length){
				return 1;
			}
			return -1;
		};
	};

	luga.data.sort.string.descending = function(prop){
		return function(a, b){
			a = luga.lookupProperty(a, prop);
			b = luga.lookupProperty(b, prop);
			if(a === undefined || b === undefined){
				return (a === b) ? 0 : (a ? -1 : 1);
			}
			const tA = a.toString();
			const tB = b.toString();
			const tAlower = tA.toLowerCase();
			const tBlower = tB.toLowerCase();
			const minLen = tA.length > tB.length ? tB.length : tA.length;
			for(let i = 0; i < minLen; i++){
				const aLowerChar = tAlower.charAt(i);
				const bLowerChar = tBlower.charAt(i);
				const aChar = tA.charAt(i);
				const bChar = tB.charAt(i);
				if(aLowerChar > bLowerChar){
					return -1;
				}
				else if(aLowerChar < bLowerChar){
					return 1;
				}
				else if(aChar > bChar){
					return -1;
				}
				else if(aChar < bChar){
					return 1;
				}
			}
			if(tA.length === tB.length){
				return 0;
			}
			else if(tA.length > tB.length){
				return -1;
			}
			return 1;
		};
	};

}());
(function(){
	"use strict";

	/**
	 * @typedef {Object} luga.data.widgets.PagingBar.options
	 *
	 * @property {luga.data.PagedView}     pagedView  Instance of a pagedView that will be controlled by the widget. Required
	 * @property {Element}                 node       DOM element that will contain the widget. Required
	 * @property {luga.data.PAGING_STYLE}  style      Style to be used for the widget, either "luga-pagingBarLinks" or "luga-pagingBarPages". Default to "luga-pagingBarLinks"
	 * @property {string}                  nextText   Text to be used for "next" links. Default to ">"
	 * @property {string}                  prevText   Text to be used for "previous" links. Default to "<"
	 * @property {string}                  separator  Text to be used to separate links. Default to " | "
	 * @property {number}                  maxLinks   Maximum number of links to show. Default to 10
	 */

	luga.namespace("luga.data.widgets");

	/**
	 * @typedef {string} luga.data.PAGING_STYLE
	 * @enum {string}
	 */
	luga.data.PAGING_STYLE = {
		LINKS: "luga-pagingBarLinks",
		PAGES: "luga-pagingBarPages"
	};

	/**
	 * Return true if the passed style is supported
	 * @param {string}  style
	 * @return {boolean}
	 */
	const isValidStyle = function(style){
		for(let key in luga.data.PAGING_STYLE){
			if(luga.data.PAGING_STYLE[key] === style){
				return true;
			}
		}
		return false;
	};

	/**
	 * PagingBar widget
	 * Given a pagedView, create a fully fledged pagination bar
	 *
	 * @param {luga.data.widgets.PagingBar.options} options
	 * @constructor
	 */
	luga.data.widgets.PagingBar = function(options){

		const CONST = {
			CSS_BASE_CLASS: "luga-pagingBar",
			SAFE_HREF: "javascript:;",
			LINKS_SEPARATOR: " - ",
			ERROR_MESSAGES: {
				INVALID_PAGED_VIEW_PARAMETER: "luga.data.widgets.PagingBar: pagedView parameter is required. Must be an instance of luga.data.PagedView",
				INVALID_NODE_PARAMETER: "luga.data.widgets.PagingBar: node parameter is required. Must be a DOM Element",
				INVALID_STYLE_PARAMETER: "luga.data.widgets.PagingBar: style parameter must be of type luga.data.PAGING_STYLE"
			}
		};

		if(options.pagedView === undefined || (options.pagedView.isPagedView === undefined || options.pagedView.isPagedView() === false)){
			throw(CONST.ERROR_MESSAGES.INVALID_PAGED_VIEW_PARAMETER);
		}

		if(options.node === undefined || options.node instanceof Element === false){
			throw(CONST.ERROR_MESSAGES.INVALID_NODE_PARAMETER);
		}

		if(options.style !== undefined && isValidStyle(options.style) === false){
			throw(CONST.ERROR_MESSAGES.INVALID_STYLE_PARAMETER);
		}

		this.config = {
			/** @type {luga.data.PagedView} */
			pagedView: undefined,
			/** @type {Element} */
			node: undefined,
			style: luga.data.PAGING_STYLE.LINKS,
			nextText: ">",
			prevText: "<",
			separator: " | ",
			maxLinks: 10
		};
		luga.merge(this.config, options);

		/**
		 * @type {luga.data.widgets.PagingBar}
		 */
		const self = this;
		// Alias/shortcuts
		const pagedView = self.config.pagedView;
		const node = self.config.node;

		pagedView.addObserver(this);

		// Add CSS
		node.classList.add(CONST.CSS_BASE_CLASS);
		node.classList.add(self.config.style);

		const render = function(){
			// Reset UI
			node.innerHTML = "";
			const currentPageIndex = pagedView.getCurrentPageIndex();

			if(pagedView.getPagesCount() > 1){
				renderPrevLink(self.config.prevText, currentPageIndex);
				renderMainLinks(self.config.maxLinks, self.config.style);
				renderNextLink(self.config.nextText, currentPageIndex);
			}
		};

		const renderPrevLink = function(text, pageIndex){

			const textNode = document.createTextNode(text);
			const linkNode = document.createElement("a");
			linkNode.setAttribute("href", CONST.SAFE_HREF);
			linkNode.appendChild(textNode);
			addGoToPageEvent(linkNode, pageIndex - 1);

			if(pageIndex !== 1){
				node.appendChild(linkNode);
			}
			else{
				node.appendChild(textNode);
			}

			node.appendChild(document.createTextNode(" "));
		};

		const renderNextLink = function(text, pageIndex){
			node.appendChild(document.createTextNode(" "));
			const textNode = document.createTextNode(text);
			const linkNode = document.createElement("a");
			linkNode.setAttribute("href", CONST.SAFE_HREF);
			linkNode.appendChild(textNode);
			addGoToPageEvent(linkNode, pageIndex + 1);

			if(pageIndex !== pagedView.getPagesCount()){
				node.appendChild(linkNode);
			}
			else{
				node.appendChild(textNode);
			}
		};

		const renderMainLinks = function(maxLinks, style){
			const pageSize = pagedView.getPageSize();
			const recordsCount = pagedView.getRecordsCount();
			const pagesCount = pagedView.getPagesCount();
			const currentPageIndex = pagedView.getCurrentPageIndex();
			const endIndex = getEndIndex(currentPageIndex, maxLinks, pagesCount);

			// Page numbers are between 1 and n. So the loop start from 1
			for(let i = 1; i < (endIndex + 1); i++){

				const labelText = getLabelText(i, style, pageSize, pagesCount, recordsCount);
				if(i !== currentPageIndex){
					renderCurrentLink(i, labelText);
				}
				else{
					// No link on current page
					renderCurrentText(labelText);
				}
				// No separator on last entry
				if(i < endIndex){
					renderSeparator();
				}
			}

		};

		const renderCurrentLink = function(i, linkText){
			const textNode = document.createTextNode(linkText);
			const linkNode = document.createElement("a");
			linkNode.appendChild(textNode);
			linkNode.setAttribute("href", CONST.SAFE_HREF);
			addGoToPageEvent(linkNode, i);
			node.appendChild(linkNode);
		};

		const renderCurrentText = function(labelText){
			const textNode = document.createTextNode(labelText);
			const strongNode = document.createElement("strong");
			strongNode.appendChild(textNode);
			node.appendChild(strongNode);
		};

		const renderSeparator = function(){
			const separatorNode = document.createTextNode(self.config.separator);
			node.appendChild(separatorNode);
		};

		const addGoToPageEvent = function(linkNode, pageNumber){
			linkNode.addEventListener("click", function(event){
				event.preventDefault();
				pagedView.goToPage(pageNumber);
			});
		};

		const getEndIndex = function(currentPageIndex, maxLinks, pagesCount){
			let startIndex = parseInt(currentPageIndex - parseInt(maxLinks / 2));
			/* istanbul ignore else */
			if(startIndex < 1){
				startIndex = 1;
			}
			const tempPos = startIndex + maxLinks - 1;
			let endIndex = pagesCount;
			if(tempPos < pagesCount){
				endIndex = tempPos;
			}
			return endIndex;
		};

		const getLabelText = function(i, style, pageSize, pagesCount, recordsCount){
			let labelText = "";

			if(style === luga.data.PAGING_STYLE.PAGES){
				labelText = i;
			}

			/* istanbul ignore else */
			if(style === luga.data.PAGING_STYLE.LINKS){
				let startText = "";
				let endText = "";
				if(i !== 1){
					startText = (pageSize * (i - 1)) + 1;
				}
				else{
					// First link
					startText = 1;
				}
				if(i < pagesCount){
					endText = startText + pageSize - 1;
				}
				else{
					// Last link
					endText = recordsCount;
				}
				labelText = startText + CONST.LINKS_SEPARATOR + endText;
			}

			return labelText;
		};

		/* Events Handlers */

		/**
		 * @param {luga.data.dataSourceChanged} data
		 */
		this.onDataChangedHandler = function(data){
			render();
		};

	};

}());
(function(){
	"use strict";

	luga.namespace("luga.data.widgets");

	/**
	 * @typedef {Object} luga.data.widgets.ShowMore.options
	 *
	 * @property {luga.data.DataSet} dataSet   DataSet. Required
	 * @property {string|undefined} paramPath  Path to retrieve url template params from the JSON. Optional. If not specified the whole returned JSON will be used
	 * @property {string} url                  Url to be used by the dataSet to fetch more data. It can contain template placeholders. Required
	 */

	/**
	 * Abstract ShowMore class
	 * Concrete implementations must extend this
	 * @param {luga.data.widgets.ShowMore.options} options
	 * @constructor
	 * @abstract
	 * @listen stateChanged
	 * @throw {Exception}
	 */
	luga.data.widgets.ShowMore = function(options){

		this.CONST = {
			ERROR_MESSAGES: {
				INVALID_DATASET_PARAMETER: "luga.data.widgets.ShowMore: dataSet parameter is required",
				INVALID_URL_PARAMETER: "luga.data.widgets.ShowMore: url parameter is required"
			}
		};

		this.config = {
			/** @type {luga.data.dataSet} */
			dataSet: undefined,
			paramPath: "",
			url: undefined
		};
		luga.merge(this.config, options);

		/** @type {luga.data.widgets.ShowMore} */
		const self = this;

		if(this.config.dataSet === undefined){
			throw(this.CONST.ERROR_MESSAGES.INVALID_DATASET_PARAMETER);
		}
		if(this.config.url === undefined){
			throw(this.CONST.ERROR_MESSAGES.INVALID_URL_PARAMETER);
		}

		let isEnabled = false;
		this.config.dataSet.addObserver(this);

		this.assembleUrl = function(){
			let bindingObj = this.config.dataSet.getRawJson();
			/* istanbul ignore else */
			if(this.config.paramPath !== ""){
				bindingObj = luga.lookupProperty(bindingObj, this.config.paramPath);
			}
			return luga.string.populate(this.config.url, bindingObj);
		};

		/**
		 * @abstract
		 */
		this.disable = function(){
		};

		/**
		 * @abstract
		 */
		this.enable = function(){
		};

		this.fetch = function(){
			const newUrl = this.assembleUrl();
			if(newUrl !== this.config.url){
				this.config.dataSet.setUrl(newUrl);
				this.config.dataSet.loadData();
			}
			else{
				this.disable();
			}
		};

		this.isEnabled = function(){
			return isEnabled;
		};

		this.updateState = function(){
			if(this.config.dataSet.getState() === luga.data.STATE.READY){
				isEnabled = true;
				this.enable();
			}
			else{
				isEnabled = false;
				this.disable();
			}
		};

		/**
		 * @param {luga.data.DataSet.stateChanged} data
		 */
		this.onStateChangedHandler = function(data){
			self.updateState();
		};

		/* Constructor */
		this.updateState();

	};

	/**
	 * @typedef {Object} luga.data.ShowMoreButton.options
	 *
	 * @extend luga.data.widgets.ShowMore.options
	 * @property {HTMLElement}  button     Button that will trigger the showMore. Required
	 * @property {string}  disabledClass   Name of CSS class that will be applied to the button while it's disabled. Optional, default to "disabled"
	 */

	/**
	 * ShowMore button class
	 * @param {luga.data.widgets.ShowMoreButton.options} options
	 * @constructor
	 * @extend luga.data.widgets.ShowMore
	 * @listen stateChanged
	 * @throw {Exception}
	 */
	luga.data.widgets.ShowMoreButton = function(options){
		this.config = {
			/** @type {luga.data.dataSet} */
			dataSet: undefined,
			paramPath: "",
			url: undefined,
			/** @type {HTMLElement} */
			button: undefined,
			disabledClass: "disabled"
		};
		luga.merge(this.config, options);
		luga.extend(luga.data.widgets.ShowMore, this, [this.config]);

		/** @type {luga.data.widgets.ShowMoreButton} */
		const self = this;

		// The messages below are specific to this implementation
		self.CONST.BUTTON_ERROR_MESSAGES = {
			MISSING_BUTTON: "luga.data.widgets.ShowMoreButton was unable find the button node"
		};

		if(self.config.button === null){
			throw(this.CONST.BUTTON_ERROR_MESSAGES.MISSING_BUTTON);
		}

		this.attachEvents = function(){

			self.config.button.addEventListener("click", function(event){
				event.preventDefault();
				if(self.isEnabled() === true){
					self.fetch();
				}
			}, false);

		};

		this.disable = function(){
			self.config.button.classList.add(this.config.disabledClass);
		};

		this.enable = function(){
			self.config.button.classList.remove(this.config.disabledClass);
		};

		/* Constructor */
		this.attachEvents();

	};

}());