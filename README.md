# Location Cards Generator - Figma Plugin

A Figma plugin that automatically generates location cards from JSON data, applying the correct variant styles based on location type.

<img width="1441" alt="image" src="https://github.com/user-attachments/assets/d9c80873-eaac-415e-9394-00106c9bf8c0" />


## Overview

This plugin helps designers quickly populate a card component system with location data. It takes a JSON input containing location information and automatically:
- Creates instances of the card component
- Sets the correct color variant based on location type (Blue/Green/Yellow)
- Populates text fields (name, facts, points)
- Adds location images
- Arranges cards in a clean grid layout

## Setup Requirements

1. **Component Structure**
   Your Figma file needs a component set with:
   - Name: "PlaceCard" (or similar)
   - Color variants: Blue, Green, Yellow, Red
   - Required layers:
     - "Name" (Text layer)
     - "Image" (Rectangle layer)
     - "Fact1", "Fact2", "Fact3" (Text layers)
     - "Points1", "Points2", "Points3" (Text layers)
     - "Potential Points" (Text layer)

2. **JSON Structure**
   ```json
   {
     "locations": [
       {
         "name": "Location Name",
         "imageUrl": "https://image-url.com/image.jpg",
         "appearance": "Blue", // or "Green" or "Yellow"
         "facts": [
           {
             "text": "Fact description",
             "points": 5
           },
           // ... more facts
         ]
       },
       // ... more locations
     ]
   }
   ```

## Features

- **Automatic Variant Selection**: Automatically applies the correct color variant based on the location type
- **Smart Layout**: Arranges cards in a grid with consistent spacing
- **Error Handling**: Gracefully handles missing data or failed image loads
- **Responsive UI**: Clean interface for component selection and JSON input
- **Auto-sorting**: Automatically sorts facts by points value
- **Image Processing**: Handles image resizing and optimization

## Usage

1. Open your Figma file containing the card component
2. Run the Location Cards Generator plugin
3. Select your card component from the dropdown
4. Paste your location JSON data
5. Click "Generate Cards"

The plugin will create a new frame containing all your cards, properly styled and arranged.

## Technical Details

- Built with TypeScript
- Uses Figma's Plugin API
- Handles component variants through properties
- Processes images client-side for optimization
- Uses auto-layout for consistent spacing
- Implements error handling and logging

## Development

To modify this plugin:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make your changes
4. Build the plugin:
   ```bash
   npm run build
   ```

## Error Handling

The plugin includes comprehensive error handling for:
- Invalid JSON data
- Missing component properties
- Failed image loads
- Missing text layers
- Font loading issues

Errors are logged to the console and displayed to the user when appropriate.

## Contributing

Feel free to submit issues and pull requests for new features or improvements.

## License

MIT License
