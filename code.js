var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
figma.showUI(__html__, { width: 450, height: 800 });
figma.ui.onmessage = function (msg) { return __awaiter(_this, void 0, void 0, function () {
    var componentKey, jsonData, component, data, collection_1, currentMode_1, _loop_1, _i, _a, location_1, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                console.log('Received message:', msg); // Log incoming message
                if (!(msg.type === 'hydrate-cards')) return [3 /*break*/, 8];
                componentKey = msg.componentKey, jsonData = msg.jsonData;
                console.log('Component Key:', componentKey);
                console.log('JSON Data:', jsonData);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                // Get the master component
                console.log('Attempting to import component...');
                return [4 /*yield*/, figma.importComponentByKeyAsync(componentKey)];
            case 2:
                component = _b.sent();
                console.log('Component import result:', component);
                if (!component) {
                    console.error('Component not found');
                    figma.ui.postMessage({
                        type: 'error',
                        message: 'Component not found. Please verify the component key.'
                    });
                    return [2 /*return*/];
                }
                console.log('Parsing JSON data...');
                data = JSON.parse(jsonData);
                console.log('Parsed data:', data);
                if (!data.locations || !Array.isArray(data.locations)) {
                    console.error('Invalid JSON structure');
                    throw new Error('Invalid JSON structure. Expected "locations" array.');
                }
                // Create a collection for our variables if it doesn't exist
                console.log('Getting/creating variable collection...');
                collection_1 = figma.variables.getLocalVariableCollections()
                    .find(function (c) { return c.name === 'CardVariables'; });
                if (!collection_1) {
                    console.log('Creating new variable collection...');
                    collection_1 = figma.variables.createVariableCollection('CardVariables');
                }
                console.log('Variable collection:', collection_1);
                if (!collection_1.modes || collection_1.modes.length === 0) {
                    throw new Error('Variable collection has no modes');
                }
                currentMode_1 = collection_1.modes[0].modeId;
                console.log('Current mode:', currentMode_1);
                _loop_1 = function (location_1) {
                    var instance_1, nameVariable, cardError_1;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                _c.trys.push([0, 2, , 3]);
                                console.log('Processing location:', location_1.name);
                                instance_1 = component.createInstance();
                                // Handle name
                                console.log('Setting up name variable...');
                                return [4 /*yield*/, figma.variables.getVariableByNameAsync('cardName')];
                            case 1:
                                nameVariable = _c.sent();
                                if (!nameVariable) {
                                    console.log('Creating new cardName variable...');
                                    nameVariable = figma.variables.createVariable('cardName', collection_1, 'STRING');
                                }
                                nameVariable.setValueForMode(currentMode_1, location_1.name);
                                instance_1.setBoundVariable('cardName', nameVariable);
                                // Handle facts
                                if (!location_1.facts || !Array.isArray(location_1.facts)) {
                                    throw new Error("Invalid facts array for location: ".concat(location_1.name));
                                }
                                console.log('Processing facts...');
                                location_1.facts.forEach(function (fact, index) {
                                    var factNum = index + 1;
                                    console.log("Processing fact ".concat(factNum, ":"), fact);
                                    // Create/get variables for fact text
                                    var factTextVarName = "fact".concat(factNum, "Text");
                                    var factTextVar = figma.variables.getVariableByNameAsync(factTextVarName);
                                    if (!factTextVar) {
                                        factTextVar = figma.variables.createVariable(factTextVarName, collection_1, 'STRING');
                                    }
                                    factTextVar.setValueForMode(currentMode_1, fact.text);
                                    instance_1.setBoundVariable(factTextVarName, factTextVar);
                                    // Create/get variables for fact points
                                    var factPointsVarName = "fact".concat(factNum, "Points");
                                    var factPointsVar = figma.variables.getVariableByNameAsync(factPointsVarName);
                                    if (!factPointsVar) {
                                        factPointsVar = figma.variables.createVariable(factPointsVarName, collection_1, 'INTEGER');
                                    }
                                    factPointsVar.setValueForMode(currentMode_1, fact.points);
                                    instance_1.setBoundVariable(factPointsVarName, factPointsVar);
                                });
                                // Position the new instance
                                instance_1.x = instance_1.width * figma.currentPage.children.length;
                                console.log('Card instance created successfully');
                                return [3 /*break*/, 3];
                            case 2:
                                cardError_1 = _c.sent();
                                console.error('Error processing card:', cardError_1);
                                figma.ui.postMessage({
                                    type: 'error',
                                    message: "Error processing card \"".concat(location_1.name, "\": ").concat(cardError_1.message)
                                });
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, _a = data.locations;
                _b.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 6];
                location_1 = _a[_i];
                return [5 /*yield**/, _loop_1(location_1)];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                console.log('All cards processed successfully');
                figma.ui.postMessage({
                    type: 'success',
                    message: "Successfully created ".concat(data.locations.length, " card instances")
                });
                // Close the plugin after a short delay to ensure the success message is shown
                setTimeout(function () {
                    console.log('Closing plugin...');
                    figma.closePlugin();
                }, 1000);
                return [3 /*break*/, 8];
            case 7:
                error_1 = _b.sent();
                console.error('Error processing cards:', error_1);
                figma.ui.postMessage({
                    type: 'error',
                    message: error_1.message || 'An unknown error occurred'
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); };
