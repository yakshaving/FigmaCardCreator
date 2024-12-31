figma.showUI(__html__, { width: 450, height: 800 });

// Types
interface Fact {
  text: string;
  points: number;
}

interface Location {
  name: string;
  imageUrl: string;
  appearance: "Green" | "Blue" | "Yellow";
  facts: Fact[];
}

interface LocationData {
  locations: Location[];
}

interface ResizedImageData {
  type: 'resized-image';
  data: number[];
}

// Layout constants
const CARD_SPACING = 24;
const CARDS_PER_ROW = 3;
const ARTBOARD_PADDING = 32;

// Helper functions
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

async function updateCardInstance(instance: InstanceNode, location: Location) {
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
      await loadFontForNode(nameNode).catch(err => {
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
        const factNode = instance.findOne(node => 
          node.type === "TEXT" && node.name === `Fact${factNum}`
        ) as TextNode;
        
        if (factNode) {
          await loadFontForNode(factNode).catch(err => {
            console.warn(`Failed to load font for ${location.name}'s fact ${factNum}:`, err);
          });
          factNode.characters = fact.text;
        }

        // Update points
        const pointsNode = instance.findOne(node => 
          node.type === "TEXT" && node.name === `Points${factNum}`
        ) as TextNode;
        
        if (pointsNode) {
          await loadFontForNode(pointsNode).catch(err => {
            console.warn(`Failed to load font for ${location.name}'s points ${factNum}:`, err);
          });
          pointsNode.characters = fact.points.toString();
        }
      } catch (err) {
        console.error(`Error updating fact ${index + 1} for ${location.name}:`, err);
        // Continue with next fact
      }
    }

    // Update potential points
    try {
      const maxPoints = Math.max(...location.facts.map(fact => fact.points));
      const potentialPointsNode = instance.findOne(node => 
        node.type === "TEXT" && node.name === "Potential Points"
      ) as TextNode;
      
      if (potentialPointsNode) {
        await loadFontForNode(potentialPointsNode).catch(err => {
          console.warn(`Failed to load font for ${location.name}'s potential points:`, err);
        });
        potentialPointsNode.characters = maxPoints.toString();
      }
    } catch (err) {
      console.error(`Error updating potential points for ${location.name}:`, err);
    }

    // Update image
    if (location.imageUrl) {
      try {
        const imageNode = instance.findOne(node => 
          node.type === "RECTANGLE" && node.name === "Image"
        ) as RectangleNode;
        
        if (imageNode) {
          figma.ui.postMessage({ type: 'resize-image', url: location.imageUrl });
          const result: ResizedImageData = await new Promise((resolve) => {
            figma.ui.once('message', (msg) => {
              if (msg.type === 'resized-image') resolve(msg);
            });
          });

          const image = await figma.createImage(new Uint8Array(result.data));
          imageNode.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];
        }
      } catch (err) {
        console.error(`Error updating image for ${location.name}:`, err);
      }
    }
  } catch (err) {
    console.error(`Error in updateCardInstance for ${location.name}:`, err);
    throw err; // Re-throw to handle cleanup in the main loop
  }
}

// Main message handler
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'hydrate-cards') {
    try {
      const { componentKey, jsonData } = msg;
      const component = await figma.importComponentByKeyAsync(componentKey);
      if (!component) {
        throw new Error('Component not found');
      }

      const data = JSON.parse(jsonData) as LocationData;
      if (!data.locations?.length) {
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
          await updateCardInstance(instance, location).catch(err => {
            console.error(`Error processing location "${location.name}":`, err);
            // Remove the problematic instance if there was an error
            instance.remove();
          });
        } catch (err) {
          console.error(`Failed to create card for location "${location?.name || 'unknown'}":`, err);
          // Continue with the next location
          continue;
        }
      }

      // Only proceed if we managed to create at least one card
      if (frame.children.length > 0) {
        // Position frame
        frame.resize(
          (component.width * CARDS_PER_ROW) + 
          (CARD_SPACING * (CARDS_PER_ROW - 1)) + 
          (ARTBOARD_PADDING * 2),
          frame.height
        );

        // Select and zoom to frame
        figma.currentPage.selection = [frame];
        figma.viewport.scrollAndZoomIntoView([frame]);

        // Close plugin
        setTimeout(() => figma.closePlugin(), 1000);
      } else {
        throw new Error('No cards could be created successfully');
      }

    } catch (error) {
      console.error('Error:', error);
      figma.closePlugin((error as Error).message);
    }
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
    }) as ComponentSetNode[];

    console.log('Found valid component sets:', components.length);

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
};