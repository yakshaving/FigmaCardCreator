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
// Remove the export and declare global
figma.showUI(__html__, { width: 450, height: 800 });
// Add initial selection check
function handleSelection(selection) {
    console.log('Handling selection:', selection);
    if (selection.length === 0) {
        console.log('No selection, sending deselect message');
        figma.ui.postMessage({
            type: 'component-deselected'
        });
        return;
    }
    if (selection.length === 1) {
        const node = selection[0];
        console.log('Selected node type:', node.type);
        if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
            console.log('Valid component selected, analyzing structure...');
            const componentInfo = analyzeComponent(node);
            if (componentInfo) {
                console.log('Component analysis successful:', componentInfo);
                figma.ui.postMessage({
                    type: 'component-selected',
                    component: componentInfo
                });
            }
            else {
                console.log('Component missing required layers');
                figma.notify('Selected component is missing required layers', { error: true });
            }
        }
    }
}
// Check initial selection when plugin starts
const initialSelection = figma.currentPage.selection;
if (initialSelection.length > 0) {
    handleSelection(initialSelection);
}
else {
    figma.notify('Select a component on your artboard');
}
// Add error handling for image loading
function resizeImage(imageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const img = document.createElement('img');
            return new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = (event) => {
                    console.warn(`Failed to load image from ${imageUrl}`);
                    reject(new Error(`Failed to load image: ${event}`));
                };
                img.src = imageUrl;
            });
        }
        catch (error) {
            console.error('Error in image processing:', error);
            throw error;
        }
    });
}
// Add these helper functions
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
                yield loadFontForNode(nameNode);
                nameNode.characters = location.name;
            }
            // Update facts
            const sortedFacts = sortFactsByPoints(location.facts);
            for (const [index, fact] of sortedFacts.entries()) {
                const factNum = 3 - index;
                // Update fact text
                const factNode = instance.findOne(node => node.type === "TEXT" && node.name === `Fact${factNum}`);
                if (factNode) {
                    yield loadFontForNode(factNode);
                    factNode.characters = fact.text;
                }
                // Update points
                const pointsNode = instance.findOne(node => node.type === "TEXT" && node.name === `Points${factNum}`);
                if (pointsNode) {
                    yield loadFontForNode(pointsNode);
                    pointsNode.characters = fact.points.toString();
                }
            }
            // Update potential points
            const maxPoints = Math.max(...location.facts.map(fact => fact.points));
            const potentialPointsNode = instance.findOne(node => node.type === "TEXT" && node.name === "Potential Points");
            if (potentialPointsNode) {
                yield loadFontForNode(potentialPointsNode);
                potentialPointsNode.characters = maxPoints.toString();
            }
            // Update image with better error handling
            if (location.imageUrl) {
                const imageNode = instance.findOne(node => node.type === "RECTANGLE" && node.name === "Image");
                if (imageNode) {
                    try {
                        figma.ui.postMessage({ type: 'resize-image', url: location.imageUrl });
                        const result = yield Promise.race([
                            new Promise((resolve) => {
                                figma.ui.once('message', (msg) => {
                                    if (msg.type === 'resized-image')
                                        resolve(msg);
                                    if (msg.type === 'error')
                                        resolve(null);
                                });
                            }),
                            // Timeout after 10 seconds
                            new Promise((resolve) => setTimeout(() => resolve(null), 10000))
                        ]);
                        if (result) {
                            const image = yield figma.createImage(new Uint8Array(result.data));
                            imageNode.fills = [{
                                    type: 'IMAGE',
                                    imageHash: image.hash,
                                    scaleMode: 'FILL'
                                }];
                        }
                        else {
                            // Set a fallback fill if image fails
                            imageNode.fills = [{
                                    type: 'SOLID',
                                    color: { r: 0.9, g: 0.9, b: 0.9 }
                                }];
                            console.warn(`Failed to load image for ${location.name}, using fallback fill`);
                        }
                    }
                    catch (imgError) {
                        console.error(`Error setting image for ${location.name}:`, imgError);
                        // Set fallback fill
                        imageNode.fills = [{
                                type: 'SOLID',
                                color: { r: 0.9, g: 0.9, b: 0.9 }
                            }];
                    }
                }
            }
        }
        catch (err) {
            console.error(`Error in updateCardInstance for ${location.name}:`, err);
            // Don't throw the error, just log it and continue
            return false;
        }
        return true;
    });
}
// Update the message handler
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (msg.type === 'select-component') {
        console.log('Selection mode activated');
        // Set up the selection change listener
        const handler = () => {
            handleSelection(figma.currentPage.selection);
        };
        figma.on('selectionchange', handler);
        figma.once('close', () => figma.off('selectionchange', handler));
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
            // Component must have all required layers
            return hasNameLayer && hasImageLayer && hasFact1 && hasFact2 && hasFact3;
        });
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
            frame.itemSpacing = 24; // Spacing between cards
            frame.horizontalPadding = 32;
            frame.verticalPadding = 32;
            frame.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
            frame.counterAxisSpacing = 24; // Space between rows
            frame.layoutAlign = "STRETCH";
            frame.primaryAxisAlignItems = "SPACE_BETWEEN";
            frame.counterAxisAlignItems = "CENTER";
            // Create and update all cards with error handling
            let successCount = 0;
            let failCount = 0;
            for (const location of data.locations) {
                try {
                    const instance = component.createInstance();
                    frame.appendChild(instance);
                    const success = yield updateCardInstance(instance, location);
                    if (success) {
                        successCount++;
                    }
                    else {
                        failCount++;
                        // Remove failed instance
                        instance.remove();
                    }
                }
                catch (cardError) {
                    console.error(`Failed to create card for ${location.name}:`, cardError);
                    failCount++;
                    continue;
                }
            }
            // Only proceed if we managed to create at least one card
            if (successCount > 0) {
                // Position frame
                frame.resize((component.width * 3) + (24 * 2) + (32 * 2), frame.height);
                // Select and zoom to frame
                figma.currentPage.selection = [frame];
                figma.viewport.scrollAndZoomIntoView([frame]);
                // Show summary message
                const message = failCount > 0
                    ? `Created ${successCount} cards. ${failCount} cards failed.`
                    : `Successfully created ${successCount} cards.`;
                figma.notify(message);
                // Close plugin
                setTimeout(() => figma.closePlugin(), 1000);
            }
            else {
                throw new Error('No cards could be created successfully');
            }
        }
        catch (error) {
            console.error('Error:', error);
            figma.notify(error.message, { error: true });
            figma.closePlugin();
        }
    }
});
function analyzeComponent(node) {
    const component = node.type === "COMPONENT_SET" ? node.children[0] : node;
    // Get variant information
    const variants = node.type === "COMPONENT_SET" ?
        node.children.map(child => child.name) :
        [node.name];
    // Check for required layers
    const nameLayer = component.findOne(n => n.type === "TEXT" && n.name === "Name");
    const imageLayer = component.findOne(n => n.type === "RECTANGLE" && n.name === "Image");
    const factLayers = [
        component.findOne(n => n.type === "TEXT" && n.name === "Fact1"),
        component.findOne(n => n.type === "TEXT" && n.name === "Fact2"),
        component.findOne(n => n.type === "TEXT" && n.name === "Fact3")
    ];
    if (!nameLayer || !imageLayer || factLayers.some(l => !l)) {
        return null;
    }
    return {
        key: node.type === "COMPONENT_SET" ? component.key : node.key,
        name: node.name,
        variants: variants,
        fields: [
            {
                name: "Name",
                type: "text",
                description: "Location name displayed at the top"
            },
            {
                name: "Image",
                type: "image",
                description: "Background image URL"
            },
            {
                name: "Appearance",
                type: "variant",
                description: "Card color variant (Blue, Green, Yellow, Red)"
            },
            {
                name: "Facts",
                type: "array",
                description: "List of facts with text and point values"
            }
        ]
    };
}
// Make sure we're listening to selection changes immediately
figma.on('selectionchange', () => {
    handleSelection(figma.currentPage.selection);
});
