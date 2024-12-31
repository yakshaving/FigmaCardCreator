# Card Crafter - Figma Plugin

A Figma plugin that automatically generates cards from JSON data, with support for component variants and data mapping.

## Overview

This plugin helps designers quickly populate any card component with data. It provides a simple wizard interface to:
1. Select any component with text and image layers
2. Map JSON data to component fields
3. Generate multiple instances with proper styling and layout

## Features

- **Component Analysis**: Automatically detects text layers, images, and variants
- **Flexible Data Mapping**: Works with any component structure that has text and image layers
- **Variant Support**: Automatically handles component variants
- **Smart Layout**: Arranges cards in a grid with consistent spacing
- **Error Handling**: Gracefully handles missing data or failed image loads
- **JSON Template**: Provides correct data structure based on component analysis

## Usage

1. **Select Component**
   - Open the plugin
   - Select any component in your Figma file
   - The plugin analyzes available fields and variants

2. **Add Data**
   - Use the provided JSON template
   - Paste your data matching the structure
   - The plugin validates your input

3. **Generate Cards**
   - Click Generate to create card instances
   - Cards are arranged in a responsive grid
   - Failed cards are skipped with notifications

## Component Requirements

Your component should have:
- Text layers for content
- Optional image layers
- Optional variants
- Consistent layer naming

## JSON Structure Example

```json
{
  "locations": [
    {
      "name": "Item Name",
      "imageUrl": "https://example.com/image.jpg",
      "appearance": "Blue",  // matches variant name
      "facts": [
        {
          "text": "Fact text",
          "points": 10
        }
      ]
    }
  ]
}
```

## Technical Details

- Built with TypeScript and Figma's Plugin API
- No external dependencies
- Uses client-side image processing
- Implements auto-layout for spacing
- Includes comprehensive error handling

## Development

The plugin is built using:
- TypeScript for type safety
- Figma Plugin API
- HTML/CSS for the UI
- No external dependencies

To develop:
1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Import into Figma as a development plugin

## Error Handling

The plugin includes robust error handling for:
- Invalid component selection
- Malformed JSON data
- Failed image loading
- Missing required layers
- Network timeouts

## License

MIT License - feel free to modify and reuse this code.
