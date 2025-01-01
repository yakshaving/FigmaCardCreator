// Remove the export and declare global
figma.showUI(__html__, { width: 400, height: 580 });

// Add initial selection check
function handleSelection(selection: readonly SceneNode[]) {
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
      } else {
        console.log('Component missing required layers');
        figma.notify('Selected component is missing required layers', { error: true });
        figma.ui.postMessage({
          type: 'component-deselected'
        });
      }
    } else {
      console.log('Selected node is not a component');
      figma.ui.postMessage({
        type: 'component-deselected'
      });
    }
  } else {
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
} else {
  console.log('No initial selection');
  figma.notify('Select a component on your artboard');
  figma.ui.postMessage({
    type: 'component-deselected'
  });
}

// Types
interface Fact {
  text: string;
  points: number;
}

interface DataItem {
  name: string;
  imageUrl: string;
  appearance: "Green" | "Blue" | "Yellow" | "Red";
  facts: Fact[];
}

// Create a separate image handling module
interface ImageProcessingResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
}

async function processImage(url: string): Promise<ImageProcessingResult> {
  try {
    console.log('Starting image processing for:', url);
    
    // Post message to UI for image processing
    figma.ui.postMessage({ 
      type: 'process-image', 
      url 
    });

    // Wait for response with timeout
    const result = await Promise.race([
      new Promise<ImageProcessingResult>((resolve) => {
        figma.ui.once('message', (msg) => {
          console.log('Received image processing response:', msg);
          if (msg.type === 'image-processed') {
            resolve({
              success: true,
              data: new Uint8Array(msg.data)
            });
          } else if (msg.type === 'image-error') {
            resolve({
              success: false,
              error: msg.error as string
            });
          }
        });
      }),
      new Promise<ImageProcessingResult>((resolve) => {
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
    } else {
      console.warn('Image processing failed:', result.error);
    }

    return result;
  } catch (err) {
    console.error('Image processing error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Add these helper functions
async function loadFontForNode(node: TextNode): Promise<boolean> {
  try {
    await figma.loadFontAsync(node.fontName as FontName);
    return true;
  } catch (err) {
    console.warn(`Failed to load font for node "${node.name}":`, err);
    return false;
  }
}

function sortFactsByPoints(facts: Fact[]): Fact[] {
  return [...facts].sort((a, b) => b.points - a.points);
}

async function updateCardInstance(instance: InstanceNode, location: DataItem) {
  try {
    // Set the color variant based on the appearance in the JSON
    const properties = instance.componentProperties;
    if (properties && "Color" in properties) {
      instance.setProperties({ Color: location.appearance });
    } else {
      console.warn(`Component doesn't have a 'Color' property for ${location.name}, skipping appearance setting`);
    }

    // Update name
    const nameNode = instance.findOne(node => 
      node.type === "TEXT" && node.name === "Name"
    ) as TextNode;
    
    if (nameNode) {
      await loadFontForNode(nameNode);
      nameNode.characters = location.name;
    }

    // Update facts
    const sortedFacts = sortFactsByPoints(location.facts);
    for (const [index, fact] of sortedFacts.entries()) {
      const factNum = 3 - index;
      
      // Update fact text
      const factNode = instance.findOne(node => 
        node.type === "TEXT" && node.name === `Fact${factNum}`
      ) as TextNode;
      
      if (factNode) {
        await loadFontForNode(factNode);
        factNode.characters = fact.text;
      }

      // Update points
      const pointsNode = instance.findOne(node => 
        node.type === "TEXT" && node.name === `Points${factNum}`
      ) as TextNode;
      
      if (pointsNode) {
        await loadFontForNode(pointsNode);
        pointsNode.characters = fact.points.toString();
      }
    }

    // Update potential points
    const maxPoints = Math.max(...location.facts.map(fact => fact.points));
    const potentialPointsNode = instance.findOne(node => 
      node.type === "TEXT" && node.name === "Potential Points"
    ) as TextNode;
    
    if (potentialPointsNode) {
      await loadFontForNode(potentialPointsNode);
      potentialPointsNode.characters = maxPoints.toString();
    }

    // Update image with new processing
    if (location.imageUrl) {
      const imageNode = instance.findOne(node => 
        node.type === "RECTANGLE" && node.name === "Image"
      ) as RectangleNode;
      
      if (imageNode) {
        const imageResult = await processImage(location.imageUrl);
        
        if (imageResult.success && imageResult.data) {
          const image = await figma.createImage(imageResult.data);
          imageNode.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];
        } else {
          console.warn(`Image failed for ${location.name}:`, imageResult.error);
          imageNode.fills = [{
            type: 'SOLID',
            color: { r: 0.9, g: 0.9, b: 0.9 }
          }];
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Error in updateCardInstance:', err);
    return false;
  }
}

// Add new message types
interface ComponentInfo {
  key: string;
  name: string;
  variants: string[];
  fields: {
    name: string;
    type: string;
    description: string;
  }[];
  hasDuplicates: boolean;
  duplicateFields: string[];
}

// Update the message handler
figma.ui.onmessage = async (msg) => {
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
      if (node.type !== "COMPONENT_SET") return false;

      // Check if the first variant has all required layers
      const firstVariant = node.children[0] as ComponentNode;
      if (!firstVariant) return false;

      const hasNameLayer = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Name");
      const hasImageLayer = !!firstVariant.findOne(n => n.type === "RECTANGLE" && n.name === "Image");
      const hasFact1 = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Fact1");
      const hasFact2 = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Fact2");
      const hasFact3 = !!firstVariant.findOne(n => n.type === "TEXT" && n.name === "Fact3");

      // Component must have all required layers
      return hasNameLayer && hasImageLayer && hasFact1 && hasFact2 && hasFact3;
    }) as ComponentSetNode[];

    // Send components list back to UI
    figma.ui.postMessage({
      type: 'components-list',
      components: components.map(component => {
        const firstVariant = component.children[0];
        if (firstVariant.type !== "COMPONENT") {
          console.warn("First child is not a component:", firstVariant.type);
          return null;
        }
        return {
          key: component.defaultVariant?.key || firstVariant.key,
          name: component.name
        };
      }).filter(Boolean) // Remove any null entries
    });
  }
  
  if (msg.type === 'hydrate-cards') {
    try {
      console.log('Starting card generation with data:', msg.jsonData);
      const { componentKey, jsonData } = msg;
      
      const component = await figma.importComponentByKeyAsync(componentKey);
      if (!component) {
        throw new Error('Component not found');
      }

      // Create container frame with updated settings
      const frame = figma.createFrame();
      frame.name = "Generated Cards";
      frame.layoutMode = "HORIZONTAL";
      frame.counterAxisSizingMode = "AUTO";
      frame.layoutWrap = "WRAP";
      frame.itemSpacing = 24; // Fixed gap
      frame.counterAxisSpacing = 24; // Gap between rows
      frame.horizontalPadding = 32;
      frame.verticalPadding = 32;
      frame.fills = [{ type: 'SOLID', color: { r: 0.267, g: 0.267, b: 0.267 } }]; // #444444
      frame.primaryAxisAlignItems = "MIN"; // Start from left
      frame.counterAxisAlignItems = "MIN"; // Start from top
      
      console.log('Created frame with settings:', {
        width: frame.width,
        height: frame.height,
        layoutMode: frame.layoutMode,
        wrap: frame.layoutWrap,
        spacing: frame.itemSpacing
      });

      // Parse data and handle different structures
      const data = JSON.parse(jsonData);
      let items: DataItem[] = [];

      if (Array.isArray(data)) {
        items = data;
      } else if (typeof data === 'object' && data !== null) {
        const arrayItems = findFirstArray(data);
        if (arrayItems) {
          items = arrayItems;
        } else {
          // If no array found, treat the object itself as a single item
          items = [data];
        }
      }

      console.log('Processing', items.length, 'cards');

      // Create and update cards
      let successCount = 0;
      let failCount = 0;
      for (const item of items) {
        try {
          console.log('Creating card for:', item.name);
          const instance = component.createInstance();
          frame.appendChild(instance);
          
          // Log frame size after each card
          console.log('Frame size after adding card:', {
            width: frame.width,
            height: frame.height,
            children: frame.children.length
          });

          const success = await updateCardInstance(instance, item);
          if (success) {
            successCount++;
          } else {
            failCount++;
            instance.remove();
          }
        } catch (cardError) {
          console.error(`Failed to create card for ${item.name}:`, cardError);
          failCount++;
        }
      }

      // Adjust frame width to show max 10 cards per row
      const cardWidth = component.width;
      const maxCardsPerRow = 10;
      const maxWidth = (cardWidth * maxCardsPerRow) + (24 * (maxCardsPerRow - 1)) + (32 * 2);
      frame.resize(Math.min(maxWidth, frame.width), frame.height);

      console.log('Final frame dimensions:', {
        width: frame.width,
        height: frame.height,
        cards: successCount,
        failed: failCount
      });

      // Show summary and close
      const message = failCount > 0 
        ? `Created ${successCount} cards. ${failCount} cards failed.`
        : `Successfully created ${successCount} cards.`;
      figma.notify(message);
      
      setTimeout(() => figma.closePlugin(), 1000);

    } catch (error) {
      console.error('Error in card generation:', error);
      figma.notify((error as Error).message, { error: true });
      figma.closePlugin();
    }
  }
};

function analyzeComponent(node: ComponentNode | ComponentSetNode): ComponentInfo | null {
  console.log('Starting component analysis for:', {
    id: node.id,
    name: node.name,
    type: node.type
  });
  
  const component = node.type === "COMPONENT_SET" ? node.children[0] as ComponentNode : node;
  
  if (!component) return null;

  // Get variant information
  const variants = node.type === "COMPONENT_SET" ? 
    node.children.map(child => child.name) : 
    [node.name];

  // Find all text layers and their names, preserving their vertical order
  const textLayers = component.findAll(n => n.type === "TEXT")
    .sort((a, b) => {
      const aY = a.absoluteBoundingBox?.y || 0;
      const bY = b.absoluteBoundingBox?.y || 0;
      return aY - bY;
    });
  console.log('Found text layers:', textLayers.map(l => ({ name: l.name, id: l.id })));

  // Build fields array dynamically
  const fields: {name: string; type: string; description: string}[] = [];

  // Add text fields
  textLayers.forEach(layer => {
    fields.push({
      name: layer.name,
      type: "text",
      description: `Current text: "${(layer as TextNode).characters}"`
    });
  });

  // Find all image layers (rectangles with fills)
  const imageLayers = component.findAll(n => 
    n.type === "RECTANGLE" && 
    'fills' in n &&
    Array.isArray(n.fills) &&
    n.fills.some(fill => fill.type === "IMAGE")
  ).sort((a, b) => {
    const aY = a.absoluteBoundingBox?.y || 0;
    const bY = b.absoluteBoundingBox?.y || 0;
    return aY - bY;
  });

  // Add image fields
  imageLayers.forEach(layer => {
    fields.push({
      name: layer.name,
      type: "image",
      description: "Image placeholder"
    });
  });

  // Add variant property if it's a component set
  if (node.type === "COMPONENT_SET") {
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

  // Check for exact duplicates after all fields are collected
  const seenNames = new Set<string>();
  const duplicateNames = new Set<string>();
  
  fields.forEach(field => {
    const name = field.name;
    if (seenNames.has(name)) {
      duplicateNames.add(name);
    }
    seenNames.add(name);
  });

  console.log('Duplicate detection:', {
    seenNames: Array.from(seenNames),
    duplicateNames: Array.from(duplicateNames)
  });

  return {
    key: node.type === "COMPONENT_SET" ? component.key : node.key,
    name: node.name,
    variants: variants,
    fields: fields,
    hasDuplicates: duplicateNames.size > 0,
    duplicateFields: Array.from(duplicateNames)
  };
}

// Make sure we're listening to selection changes
figma.on('selectionchange', () => {
  console.log('Selection changed');
  handleSelection(figma.currentPage.selection);
});

// Add image resizing utility
async function resizeImage(arrayBuffer: ArrayBuffer, maxSize: number = 2048): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
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

function findFirstArray(obj: any): any[] | null {
  if (Array.isArray(obj)) return obj;
  
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Array.isArray(obj[key])) return obj[key];
      const nested = findFirstArray(obj[key]);
      if (nested) return nested;
    }
  }
  
  return null;
}