describe("luga.data.region.Base", function(){

	"use strict";

	let testRecords, loadedDs, testDiv, attributesDiv, configRegion, attributesRegion, testObserver;
	window.regionBaseMockTraitOne = function(){
	};
	window.regionBaseMockTraitTwo = function(){
	};

	beforeEach(function(){

		testRecords = jasmineFixtures.read("data/ladies.json");
		loadedDs = new luga.data.DataSet({uuid: "testDs", records: testRecords});

		testDiv = document.createElement("div");
		testDiv.textContent = "Ciao Mamma";

		attributesDiv = document.createElement("div");
		attributesDiv.setAttribute("data-lugaregion", "true");
		attributesDiv.setAttribute("data-lugaregion-datasource-uuid", "testDs");
		attributesDiv.setAttribute("data-lugaregion-template-id", "ladiesTemplate");
		attributesDiv.textContent = "Test";

		configRegion = new luga.data.region.Base({
			node: testDiv,
			ds: loadedDs,
			templateId: "ladiesTemplate"
		});
		attributesRegion = new luga.data.region.Base({node: attributesDiv});

		testObserver = {
			onRegionRenderedHandler: function(){
			}
		};
		configRegion.addObserver(testObserver);
		spyOn(testObserver, "onRegionRenderedHandler");

	});

	afterEach(function(){
		luga.data.dataSourceRegistry = {};
	});

	it("Is the base, abstract class for regions", function(){
		expect(luga.data.region.Base).toBeDefined();
		expect(luga.type(luga.data.region.Base)).toEqual("function");
	});

	it("Implements the luga.Notifier interface", function(){
		const MockNotifier = function(){
			luga.extend(luga.Notifier, this);
		};
		expect(configRegion).toMatchDuckType(new MockNotifier());
	});

	it("Register itself as observer of the associated dataSource", function(){
		expect(loadedDs.observers[0]).toEqual(configRegion);
	});

	it("Attach a reference inside the given node, storing it as the luga-region-reference attribute", function(){
		expect(testDiv[luga.data.region.CONST.CUSTOM_ATTRIBUTES.REGION_REFERENCE]).toEqual(configRegion);
	});

	describe("Accepts an Options object as single argument", function(){

		describe("options.node", function(){

			it("Is mandatory", function(){
				expect(function(){
					new luga.data.region.Base({dsUuid: "testDs"});
				}).toThrow();
			});
			it("Throws an exception if the associated node does not exists", function(){
				expect(function(){
					new luga.data.region.Base({
						node: document.getElementById("missing")
					});
				}).toThrow();
			});

			describe("either:", function(){
				it("Points to the HTML node using the data-lugaregion custom attribute", function(){
					expect(attributesRegion.config.node.textContent).toEqual(attributesDiv.textContent);
				});
				it("Uses the value specified inside the option argument", function(){
					expect(configRegion.config.node.textContent).toEqual(testDiv.textContent);
				});
			});
		});

		describe("options.ds", function(){

			it("Is mandatory if options.dsId is missing", function(){
				expect(function(){
					new luga.data.region.Base({node: testDiv});
				}).toThrow();
			});
			it("Throws an exception if a null value is passed", function(){
				expect(function(){
					new luga.data.region.Base({node: testDiv, ds: null});
				}).toThrow();
			});
			it("Uses the value specified inside the option argument", function(){
				expect(configRegion.config.ds).toEqual(loadedDs);
			});

		});

		describe("options.dsUuid", function(){

			it("Is mandatory if options.ds is missing", function(){
				expect(function(){
					new luga.data.region.Base({node: testDiv});
				}).toThrow();
			});
			it("Throws an exception if the associated dataSource does not exists", function(){
				expect(function(){
					new luga.data.region.Base({node: testDiv, dsUuid: "missing"});
				}).toThrow();
			});

			describe("either:", function(){
				it("Retrieves the value from the node's data-lugaregion-datasource custom attribute", function(){
					expect(attributesRegion.config.dsUuid).toEqual("testDs");
				});
				it("Uses the value specified inside the option argument", function(){
					const testRegion = new luga.data.region.Base({
						node: testDiv,
						dsUuid: "testDs",
						templateId: "ladiesTemplate"
					});
					expect(testRegion.config.dsUuid).toEqual("testDs");
				});
			});

		});

		describe("options.traits", function(){

			describe("either:", function(){

				describe("Retrieves the value from the node's data-lugaregion-traits custom attribute:", function(){

					it("Containing a single function's name", function(){
						const regionNode = document.createElement("div");
						regionNode.setAttribute("data-lugaregion", "true");
						regionNode.setAttribute("data-lugaregion-datasource-uuid", "testDs");
						regionNode.setAttribute("data-lugaregion-traits", "window.regionBaseMockTraitOne");

						const region = new luga.data.region.Base({node: regionNode});
						expect(region.traits.indexOf("window.regionBaseMockTraitOne")).not.toEqual(-1);
					});

					it("Or a comma-delimited list of function's names", function(){
						const regionNode = document.createElement("div");
						regionNode.setAttribute("data-lugaregion", "true");
						regionNode.setAttribute("data-lugaregion-datasource-uuid", "testDs");
						regionNode.setAttribute("data-lugaregion-traits", "window.regionBaseMockTraitOne,window.regionBaseMockTraitTwo");

						const region = new luga.data.region.Base({node: regionNode});
						expect(region.traits.indexOf("window.regionBaseMockTraitOne")).not.toEqual(-1);
						expect(region.traits.indexOf("window.regionBaseMockTraitTwo")).not.toEqual(-1);
					});

				});

				describe("Uses the value specified inside the option argument:", function(){

					it("Containing a single function's name", function(){
						const region = new luga.data.region.Base({
							node: testDiv,
							dsUuid: "testDs",
							templateId: "ladiesTemplate",
							traits: ["window.regionBaseMockTraitOne"]
						});
						expect(region.traits.indexOf("window.regionBaseMockTraitOne")).not.toEqual(-1);
					});
					it("Or a comma-delimited list of function's names", function(){
						const region = new luga.data.region.Base({
							node: testDiv,
							dsUuid: "testDs",
							templateId: "ladiesTemplate",
							traits: ["window.regionBaseMockTraitOne", "window.regionBaseMockTraitTwo"]
						});
						expect(region.traits.indexOf("window.regionBaseMockTraitOne")).not.toEqual(-1);
						expect(region.traits.indexOf("window.regionBaseMockTraitTwo")).not.toEqual(-1);
					});

				});

			});

		});

	});

	describe(".applyTraits()", function(){

		describe("Calls the following default traits (passing {node: config.node, dataSource: this.dataSource}):", function(){

			it("luga.data.region.traits.select()", function(){
				spyOn(luga.data.region.traits, "select");
				configRegion.applyTraits();
				expect(luga.data.region.traits.select).toHaveBeenCalled();
			});

			it("luga.data.region.traits.setRowId()", function(){
				spyOn(luga.data.region.traits, "setRowId");
				configRegion.applyTraits();
				expect(luga.data.region.traits.setRowId).toHaveBeenCalled();
			});

			it("luga.data.region.traits.setRowIndex()", function(){
				spyOn(luga.data.region.traits, "setRowIndex");
				configRegion.applyTraits();
				expect(luga.data.region.traits.setRowIndex).toHaveBeenCalled();
			});

			it("luga.data.region.traits.sort()", function(){
				spyOn(luga.data.region.traits, "sort");
				configRegion.applyTraits();
				expect(luga.data.region.traits.sort).toHaveBeenCalled();
			});

		});

		describe("Throws an exception if:", function(){

			it("options.traits contains an invalid function name", function(){
				const region = new luga.data.region.Base({
					node: testDiv,
					dsUuid: "testDs",
					templateId: "ladiesTemplate",
					traits: "missingFunction"
				});
				expect(function(){
					region.applyTraits();
				}).toThrow();
			});

			it("data-lugaregion-traits contains an invalid function name", function(){
				const regionNode = document.createElement("div");
				regionNode.setAttribute("data-lugaregion", "true");
				regionNode.setAttribute("data-lugaregion-datasource-uuid", "testDs");
				regionNode.setAttribute("data-lugaregion-traits", "window.missingFunction");

				const region = new luga.data.region.Base({node: regionNode});
				expect(function(){
					region.applyTraits();
				}).toThrow();
			});

		});

	});

	describe(".render()", function(){
		it("Is an abstract method that concrete implementations must implement", function(){
			expect(configRegion.render).toBeDefined();
			expect(luga.type(configRegion.render)).toEqual("function");
		});
		it("Triggers a 'regionRendered' notification. Passing along the region's description", function(){
			configRegion.render();
			const desc = luga.data.region.utils.assembleRegionDescription(configRegion);
			expect(testObserver.onRegionRenderedHandler).toHaveBeenCalledWith(desc);
		});
	});

	describe(".onCurrentRowChangedHandler()", function(){
		it("Calls .applyTraits() whenever the associated dataSource triggers a 'currentRowChanged' event", function(){
			spyOn(configRegion, "onCurrentRowChangedHandler").and.callThrough();
			spyOn(configRegion, "applyTraits");
			loadedDs.setCurrentRowIndex(3); // triggers a 'currentRowChanged' event
			expect(configRegion.onCurrentRowChangedHandler).toHaveBeenCalled();
			expect(configRegion.applyTraits).toHaveBeenCalled();
		});
	});

	describe(".onDataChangedHandler()", function(){
		it("Calls .render() whenever the associated dataSource triggers a 'dataChanged' event", function(){
			spyOn(configRegion, "onDataChangedHandler").and.callThrough();
			spyOn(configRegion, "render");
			loadedDs.delete(); // Removes all records, triggers a 'dataChanged' event
			expect(configRegion.onDataChangedHandler).toHaveBeenCalled();
			expect(configRegion.render).toHaveBeenCalled();
		});
	});

	describe(".onStateChangedHandler()", function(){
		it("Calls .render() whenever the associated dataSource triggers a 'stateChanged' event", function(){
			spyOn(configRegion, "onStateChangedHandler").and.callThrough();
			spyOn(configRegion, "render");
			loadedDs.setState("ready");
			expect(configRegion.onStateChangedHandler).toHaveBeenCalled();
			expect(configRegion.render).toHaveBeenCalled();
		});
	});

});