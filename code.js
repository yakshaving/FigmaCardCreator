"use strict";
// Remove the export and declare global
figma.showUI(__html__, { width: 400, height: 580 });
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
            // Always analyze the component, even if it's the same one
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
                figma.ui.postMessage({
                    type: 'component-deselected'
                });
            }
        }
        else {
            console.log('Selected node is not a component');
            figma.ui.postMessage({
                type: 'component-deselected'
            });
        }
    }
    else {
        console.log('Multiple items selected');
        figma.ui.postMessage({
            type: 'component-deselected'
        });
    }
}
// Set up selection change listener
figma.on('selectionchange', () => {
    console.log('Selection changed');
    handleSelection(figma.currentPage.selection);
});
// Listen for document changes
figma.on('documentchange', ({ documentChanges }) => {
    console.log('Document changed:', documentChanges);
    // If we have a component selected, reanalyze after a short delay
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && (selection[0].type === "COMPONENT" || selection[0].type === "COMPONENT_SET")) {
        // Use a short delay to allow for the change to complete
        setTimeout(() => {
            console.log('Reanalyzing component after change');
            handleSelection(selection);
        }, 100);
    }
});
// Clean up on plugin close
figma.on('close', () => {
    // Nothing to clean up anymore
});
// Check initial selection when plugin starts
const initialSelection = figma.currentPage.selection;
console.log('Initial selection:', initialSelection);
if (initialSelection.length > 0) {
    handleSelection(initialSelection);
}
else {
    console.log('No initial selection');
    figma.notify('Select a component on your artboard');
    figma.ui.postMessage({
        type: 'component-deselected'
    });
}
async function processImage(url) {
    try {
        console.log('Starting image processing for:', url);
        // Post message to UI for image processing
        figma.ui.postMessage({
            type: 'process-image',
            url
        });
        // Wait for response with timeout
        const result = await Promise.race([
            new Promise((resolve) => {
                figma.ui.once('message', (msg) => {
                    console.log('Received image processing response:', msg);
                    if (msg.type === 'image-processed') {
                        resolve({
                            success: true,
                            data: new Uint8Array(msg.data)
                        });
                    }
                    else if (msg.type === 'image-error') {
                        resolve({
                            success: false,
                            error: msg.error
                        });
                    }
                });
            }),
            new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Image processing timed out');
                    resolve({
                        success: false,
                        error: 'Image loading timed out'
                    });
                }, 10000);
            })
        ]);
        if (result.success) {
            console.log('Image processed successfully');
        }
        else {
            console.warn('Image processing failed:', result.error);
        }
        return result;
    }
    catch (err) {
        console.error('Image processing error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error occurred'
        };
    }
}
// Add these helper functions
async function loadFontForNode(node) {
    try {
        await figma.loadFontAsync(node.fontName);
        return true;
    }
    catch (err) {
        console.warn(`Failed to load font for node "${node.name}":`, err);
        return false;
    }
}
function sortFactsByPoints(facts) {
    return [...facts].sort((a, b) => b.points - a.points);
}
async function updateCardInstance(instance, location) {
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
            await loadFontForNode(nameNode);
            nameNode.characters = location.name;
        }
        // Update facts
        const sortedFacts = sortFactsByPoints(location.facts);
        for (const [index, fact] of sortedFacts.entries()) {
            const factNum = 3 - index;
            // Update fact text
            const factNode = instance.findOne(node => node.type === "TEXT" && node.name === `Fact${factNum}`);
            if (factNode) {
                await loadFontForNode(factNode);
                factNode.characters = fact.text;
            }
            // Update points
            const pointsNode = instance.findOne(node => node.type === "TEXT" && node.name === `Points${factNum}`);
            if (pointsNode) {
                await loadFontForNode(pointsNode);
                pointsNode.characters = fact.points.toString();
            }
        }
        // Update potential points
        const maxPoints = Math.max(...location.facts.map(fact => fact.points));
        const potentialPointsNode = instance.findOne(node => node.type === "TEXT" && node.name === "Potential Points");
        if (potentialPointsNode) {
            await loadFontForNode(potentialPointsNode);
            potentialPointsNode.characters = maxPoints.toString();
        }
        // Update image with new processing
        if (location.imageUrl) {
            const imageNode = instance.findOne(node => node.type === "RECTANGLE" && node.name === "Image");
            if (imageNode) {
                const imageResult = await processImage(location.imageUrl);
                if (imageResult.success && imageResult.data) {
                    const image = await figma.createImage(imageResult.data);
                    imageNode.fills = [{
                            type: 'IMAGE',
                            imageHash: image.hash,
                            scaleMode: 'FILL'
                        }];
                }
                else {
                    console.warn(`Image failed for ${location.name}:`, imageResult.error);
                    imageNode.fills = [{
                            type: 'SOLID',
                            color: { r: 0.9, g: 0.9, b: 0.9 }
                        }];
                }
            }
        }
        return true;
    }
    catch (err) {
        console.error('Error in updateCardInstance:', err);
        return false;
    }
}
/**
 * Analyzes a Figma component or component set to extract its structure and fields
 * @param node - The component or component set to analyze
 * @returns ComponentInfo object or null if analysis fails
 */
function analyzeComponent(node) {
    console.log('Starting component analysis for:', {
        id: node.id,
        name: node.name,
        type: node.type
    });
    // Get the main component (first variant if it's a component set)
    const component = node.type === "COMPONENT_SET" ? node.children[0] : node;
    if (!component)
        return null;
    // Extract variant information
    const variants = getVariantInfo(node);
    // Collect all fields with their hierarchy
    const fields = collectComponentFields(component);
    // Add variant property for component sets
    if (node.type === "COMPONENT_SET") {
        addVariantField(fields, node, variants);
    }
    // Check for duplicate field names
    const { duplicates, hasDuplicates } = findDuplicateFields(fields);
    console.log('Component analysis complete:', {
        fields: fields,
        duplicates
    });
    return {
        key: node.type === "COMPONENT_SET" ? component.key : node.key,
        name: node.name,
        variants,
        fields,
        hasDuplicates,
        duplicateFields: duplicates
    };
}
/**
 * Gets variant information from a component or component set
 */
function getVariantInfo(node) {
    return node.type === "COMPONENT_SET"
        ? node.children.map(child => child.name)
        : [node.name];
}
/**
 * Collects all fields from a component, preserving hierarchy
 */
function collectComponentFields(component) {
    const fields = [];
    /**
     * Recursively processes a node and its children to extract fields
     * @param node - The current node to process
     * @param parentFrame - The name of the parent frame (if any)
     */
    function processNode(node, parentFrame) {
        // Determine if this node is a frame that groups facts with points
        const isFactFrame = node.type === "FRAME" && node.name.includes("WithPoints");
        const currentParent = isFactFrame ? node.name : parentFrame;
        // Process text layers
        if (node.type === "TEXT") {
            fields.push({
                name: node.name,
                type: "text",
                description: `Current text: "${node.characters}"`,
                parentFrame: currentParent
            });
        }
        // Process image layers
        else if (isImageLayer(node)) {
            fields.push({
                name: node.name,
                type: "image",
                description: "Image placeholder",
                parentFrame: currentParent
            });
        }
        // Recursively process children
        if ('children' in node) {
            node.children.forEach(child => processNode(child, currentParent));
        }
    }
    processNode(component);
    return fields;
}
/**
 * Checks if a node is an image layer (rectangle with image fills)
 */
function isImageLayer(node) {
    return node.type === "RECTANGLE" &&
        'fills' in node &&
        Array.isArray(node.fills) &&
        node.fills.some(fill => fill.type === "IMAGE");
}
/**
 * Adds variant field information to the fields array
 */
function addVariantField(fields, node, variants) {
    const variantGroupProperties = node.variantGroupProperties || {};
    const variantOptions = Object.entries(variantGroupProperties)
        .map(([prop, values]) => `${prop}: ${values.values.join(" | ")}`)
        .join(", ");
    fields.push({
        name: "variant",
        type: "string",
        description: `Available variants: ${variantOptions || variants.join(" | ")}`
    });
}
/**
 * Finds duplicate field names in the component
 */
function findDuplicateFields(fields) {
    const seenNames = new Set();
    const duplicateNames = new Set();
    fields.forEach(field => {
        if (seenNames.has(field.name)) {
            duplicateNames.add(field.name);
        }
        seenNames.add(field.name);
    });
    return {
        duplicates: Array.from(duplicateNames),
        hasDuplicates: duplicateNames.size > 0
    };
}
// Make sure we're listening to selection changes
figma.on('selectionchange', () => {
    console.log('Selection changed');
    handleSelection(figma.currentPage.selection);
});
// Add image resizing utility
async function resizeImage(arrayBuffer, maxSize = 2048) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            // Calculate new dimensions while maintaining aspect ratio
            if (width > height && width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
            }
            else if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            // Convert to blob with reduced quality
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create blob from canvas'));
                    return;
                }
                blob.arrayBuffer().then(buffer => {
                    resolve(new Uint8Array(buffer));
                }).catch(err => {
                    reject(new Error('Failed to convert blob to array buffer'));
                });
            }, 'image/jpeg', 0.8);
        };
        img.onerror = () => reject(new Error('Failed to load image for resizing'));
        // Create object URL from array buffer
        const blob = new Blob([arrayBuffer]);
        img.src = URL.createObjectURL(blob);
    });
}
function findFirstArray(obj) {
    if (Array.isArray(obj))
        return obj;
    if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            if (Array.isArray(obj[key]))
                return obj[key];
            const nested = findFirstArray(obj[key]);
            if (nested)
                return nested;
        }
    }
    return null;
}
