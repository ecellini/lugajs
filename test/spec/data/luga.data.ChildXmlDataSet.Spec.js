describe("luga.data.ChildXmlDataSet", function(){

	"use strict";

	let stateRecords, masterDs, remoteDs;
	beforeEach(function(){
		stateRecords = jasmineFixtures.read("data/usa-states.json");
		masterDs = new luga.data.XmlDataSet({uuid: "masterDs"});
		masterDs.insert(stateRecords);
		remoteDs = new luga.data.ChildXmlDataSet({
			uuid: "remoteDs",
			parentDataSet: masterDs,
			url: "fixtures/data/usa-states-{abbreviation}.xml"
		});
	});

	afterEach(function(){
		luga.data.dataSourceRegistry = {};
	});

	it("Is the ChildXmlDataSet constructor", function(){
		expect(luga.type(luga.data.ChildXmlDataSet)).toEqual("function");
	});

	it("Extends luga.data.XmlDataSet", function(){
		expect(remoteDs).toMatchDuckType(new luga.data.XmlDataSet({uuid: "duck"}));
	});

	it("Register as observer of its parent dataSet", function(){
		expect(masterDs.observers.indexOf(remoteDs)).not.toEqual(-1);

	});

	describe("Its constructor options are the same as luga.data.XmlDataSet plus:", function(){

		describe("options.parentDataSet", function(){

			it("Is the parent XmlDataSet", function(){
				expect(remoteDs.parentDataSet).toEqual(masterDs);
			});
			it("Throws an exception if not specified", function(){
				expect(function(){
					new luga.data.ChildXmlDataSet({
						uuid: "remoteDs",
						url: "fixtures/data/usa-states-{abbreviation}.xml"
					});
				}).toThrow();
			});

		});

		describe("options.url", function(){

			it("Is the pattern that will be used to compose the url", function(){
				expect(remoteDs.urlPattern).toEqual("fixtures/data/usa-states-{abbreviation}.xml");
			});
			it("Throws an exception if not specified", function(){
				expect(function(){
					new luga.data.ChildXmlDataSet({uuid: "remoteDs", parentDataSet: masterDs});
				}).toThrow();
			});

		});

	});

	describe(".fetchData()", function(){

		beforeEach(function(){
			spyOn(remoteDs, "loadData");
		});

		describe("First:", function(){

			it("Use luga.string.populate() to resolve the binding inside options.url", function(){
				spyOn(luga.string, "populate");
				remoteDs.fetchData(stateRecords[2]);
				expect(luga.string.populate).toHaveBeenCalledWith(remoteDs.urlPattern, stateRecords[2]);
			});
			it("Throws an exception if binding fails", function(){
				expect(function(){
					remoteDs.urlPattern = "fixtures/data/usa-states-{invalid.property}.xml";
					remoteDs.fetchData(stateRecords[2]);
				}).toThrow();
			});
			it("Update its .url property", function(){
				remoteDs.fetchData(stateRecords[2]);
				expect(remoteDs.url).toEqual("fixtures/data/usa-states-AS.xml");
			});

		});

		describe("Then:", function(){

			it("Call .loadData()", function(){
				remoteDs.fetchData(stateRecords[2]);
				expect(remoteDs.loadData).toHaveBeenCalled();
			});

		});
	});

	describe(".onCurrentRowChangedHandler()", function(){

		it("Is invoked whenever the masterDataSet's currentRow changes", function(){
			spyOn(remoteDs, "onCurrentRowChangedHandler");
			masterDs.setCurrentRowIndex(2);
			expect(remoteDs.onCurrentRowChangedHandler).toHaveBeenCalled();
		});

		describe("If the the masterDataSet's currentRow is not null:", function(){

			it("Invokes .fetchData(). Passing the masterDataSet's currentRow", function(){
				spyOn(remoteDs, "fetchData");
				masterDs.setCurrentRowIndex(2);
				expect(remoteDs.fetchData).toHaveBeenCalledWith(stateRecords[2]);
			});

		});

		describe("Else:", function(){

			it("Invokes .delete()", function(){
				spyOn(remoteDs, "fetchData");
				spyOn(remoteDs, "delete");
				masterDs.setCurrentRowId(null);
				expect(remoteDs.fetchData).not.toHaveBeenCalled();
				expect(remoteDs.delete).toHaveBeenCalled();
			});

		});

	});

});