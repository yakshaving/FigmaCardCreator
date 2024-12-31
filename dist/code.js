"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 450, height: 800 });
// Layout constants
const CARD_SPACING = 24;
const CARDS_PER_ROW = 3;
const ARTBOARD_PADDING = 32;
// Helper functions
function loadFontForNode(node) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield figma.loadFontAsync(node.fontName);
            return true;
        }
        catch (err) {
            console.warn(`Failed to load font for node "${node.name}":`, err);
            return false;
        }
    });
}
function sortFactsByPoints(facts) {
    return [...facts].sort((a, b) => b.points - a.points);
}
function updateCardInstance(instance, location) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Set the color variant based on the appearance in the JSON
            const properties = instance.componentProperties;
            if (properties && "Color" in properties) {
                instance.setProperties({ Color: location.appearance });
            }
            else {
                console.warn(`Component doesn't have a 'Color' property for ${location.name}, skipping appearance setting`);
            }
            // Update name
            const nameNode = instance.findOne(node => node.type === "TEXT" && node.name === "Name");
            if (nameNode) {
                yield loadFontForNode(nameNode).catch(err => {
                    console.warn(`Failed to load font for ${location.name}'s name:`, err);
                });
                nameNode.characters = location.name;
            }
            // Update facts
            const sortedFacts = sortFactsByPoints(location.facts);
            for (const [index, fact] of sortedFacts.entries()) {
                try {
                    const factNum = 3 - index;
                    // Update fact text
                    const factNode = instance.findOne(node => node.type === "TEXT" && node.name === `Fact${factNum}`);
                    if (factNode) {
                        yield loadFontForNode(factNode).catch(err => {
                            console.warn(`Failed to load font for ${location.name}'s fact ${factNum}:`, err);
                        });
                        factNode.characters = fact.text;
                    }
                    // Update points
                    const pointsNode = instance.findOne(node => node.type === "TEXT" && node.name === `Points${factNum}`);
                    if (pointsNode) {
                        yield loadFontForNode(pointsNode).catch(err => {
                            console.warn(`Failed to load font for ${location.name}'s points ${factNum}:`, err);
                        });
                        pointsNode.characters = fact.points.toString();
                    }
                }
                catch (err) {
                    console.error(`Error updating fact ${index + 1} for ${location.name}:`, err);
                    // Continue with next fact
                }
            }
            // Update potential points
            try {
                const maxPoints = Math.max(...location.facts.map(fact => fact.points));
                const potentialPointsNode = instance.findOne(node => node.type === "TEXT" && node.name === "Potential Points");
                if (potentialPointsNode) {
                    yield loadFontForNode(potentialPointsNode).catch(err => {
                        console.warn(`Failed to load font for ${location.name}'s potential points:`, err);
                    });
                    potentialPointsNode.characters = maxPoints.toString();
                }
            }
            catch (err) {
                console.error(`Error updating potential points for ${location.name}:`, err);
            }
            // Update image
            if (location.imageUrl) {
                try {
                    const imageNode = instance.findOne(node => node.type === "RECTANGLE" && node.name === "Image");
                    if (imageNode) {
                        figma.ui.postMessage({ type: 'resize-image', url: location.imageUrl });
                        const result = yield new Promise((resolve) => {
                            figma.ui.once('message', (msg) => {
                                if (msg.type === 'resized-image')
                                    resolve(msg);
                            });
                        });
                        const image = yield figma.createImage(new Uint8Array(result.data));
                        imageNode.fills = [{
                                type: 'IMAGE',
                                imageHash: image.hash,
                                scaleMode: 'FILL'
                            }];
                    }
                }
                catch (err) {
                    console.error(`Error updating image for ${location.name}:`, err);
                }
            }
        }
        catch (err) {
            console.error(`Error in updateCardInstance for ${location.name}:`, err);
            throw err; // Re-throw to handle cleanup in the main loop
        }
    });
}
// Main message handler
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (msg.type === 'hydrate-cards') {
        try {
            const { componentKey, jsonData } = msg;
            const component = yield figma.importComponentByKeyAsync(componentKey);
            if (!component) {
                throw new Error('Component not found');
            }
            const data = JSON.parse(jsonData);
            if (!((_a = data.locations) === null || _a === void 0 ? void 0 : _a.length)) {
                throw new Error('No locations found in data');
            }
            // Create container frame
            const frame = figma.createFrame();
            frame.name = "Location Cards";
            frame.layoutMode = "HORIZONTAL";
            frame.counterAxisSizingMode = "AUTO";
            frame.layoutWrap = "WRAP";
            frame.itemSpacing = CARD_SPACING; // Horizontal spacing
            frame.horizontalPadding = ARTBOARD_PADDING;
            frame.verticalPadding = ARTBOARD_PADDING;
            frame.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
            // Set equal spacing for both directions
            frame.itemSpacing = CARD_SPACING; // Space between items in the primary axis
            frame.counterAxisSpacing = CARD_SPACING; // Space between rows/columns
            // Auto-layout alignment
            frame.layoutAlign = "STRETCH";
            frame.primaryAxisAlignItems = "SPACE_BETWEEN";
            frame.counterAxisAlignItems = "CENTER";
            // Find a clear space to place the frame
            const page = figma.currentPage;
            const existingNodes = page.children;
            let clearX = 0;
            let clearY = 0;
            const padding = 100; // Space between existing content and new frame
            // Find the bounds of existing content
            if (existingNodes.length > 0) {
                const bounds = {
                    minX: Math.min(...existingNodes.map(node => node.x)),
                    maxX: Math.max(...existingNodes.map(node => node.x + node.width)),
                    minY: Math.min(...existingNodes.map(node => node.y)),
                    maxY: Math.max(...existingNodes.map(node => node.y + node.height))
                };
                // Place the new frame below all existing content
                clearX = bounds.minX;
                clearY = bounds.maxY + padding;
            }
            // Position frame in the clear space
            frame.x = clearX;
            frame.y = clearY;
            // Create and update all cards
            for (const location of data.locations) {
                try {
                    const instance = component.createInstance();
                    frame.appendChild(instance);
                    yield updateCardInstance(instance, location).catch(err => {
                        console.error(`Error processing location "${location.name}":`, err);
                        // Remove the problematic instance if there was an error
                        instance.remove();
                    });
                }
                catch (err) {
                    console.error(`Failed to create card for location "${(location === null || location === void 0 ? void 0 : location.name) || 'unknown'}":`, err);
                    // Continue with the next location
                    continue;
                }
            }
            // Only proceed if we managed to create at least one card
            if (frame.children.length > 0) {
                // Position frame
                frame.resize((component.width * CARDS_PER_ROW) +
                    (CARD_SPACING * (CARDS_PER_ROW - 1)) +
                    (ARTBOARD_PADDING * 2), frame.height);
                // Select and zoom to frame
                figma.currentPage.selection = [frame];
                figma.viewport.scrollAndZoomIntoView([frame]);
                // Close plugin
                setTimeout(() => figma.closePlugin(), 1000);
            }
            else {
                throw new Error('No cards could be created successfully');
            }
        }
        catch (error) {
            console.error('Error:', error);
            figma.closePlugin(error.message);
        }
    }
    if (msg.type === 'get-components') {
        // Look for component sets that contain our card variants
        const components = figma.currentPage.findAll(node => {
            // Only look for component sets
            if (node.type !== "COMPONENT_SET")
                return false;
            // Check if the first variant has all required layers
            const firstVariant = node.children[0];
            if (!firstVariant)
                return false;
            const hasNameLayer = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Name");
            const hasImageLayer = !!firstVariant.findOne(n => n.type === "RECTANGLE" && n.name === "Image");
            const hasFact1 = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Fact1");
            const hasFact2 = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Fact2");
            const hasFact3 = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Fact3");
            // Log what we found for debugging
            console.log('Checking component set:', node.name, {
                hasNameLayer,
                hasImageLayer,
                hasFact1,
                hasFact2,
                hasFact3
            });
            // Component must have all required layers
            return hasNameLayer && hasImageLayer && hasFact1 && hasFact2 && hasFact3;
        });
        console.log('Found valid component sets:', components.length);
        // Send components list back to UI
        figma.ui.postMessage({
            type: 'components-list',
            components: components.map(component => {
                var _a;
                const firstVariant = component.children[0];
                if (firstVariant.type !== "COMPONENT") {
                    console.warn("First child is not a component:", firstVariant.type);
                    return null;
                }
                return {
                    key: ((_a = component.defaultVariant) === null || _a === void 0 ? void 0 : _a.key) || firstVariant.key,
                    name: component.name
                };
            }).filter(Boolean) // Remove any null entries
        });
    }
});
