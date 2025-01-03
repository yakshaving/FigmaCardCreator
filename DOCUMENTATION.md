# Card Crafter Documentation

## Quick Start Guide

1. **Install the Plugin**
   - Open Figma
   - Go to Menu > Plugins > Browse Plugins
   - Search for "Card Crafter"
   - Click "Install"

2. **Basic Usage**
   ```
   Step 1: Select your card component
   Step 2: Paste or input your data
   Step 3: Map your fields
   Step 4: Generate cards
   ```

## Component Requirements

### Naming Conventions
- Text layers: Use descriptive names (e.g., "title", "description")
- Image layers: Name should end with "image" or "img"
- Variants: Use consistent naming across variants

### Supported Layer Types
- Text layers
- Image fills
- Rectangle/shape fills
- Auto-layout containers
- Nested components

## Data Format

### Basic Structure
```json
{
  "items": [
    {
      "title": "Example Title",
      "description": "Example description",
      "imageUrl": "https://example.com/image.jpg",
      "variant": "blue"
    }
  ]
}
```

### Supported Data Types
- Text strings
- Image URLs
- Numbers
- Boolean values
- Nested objects
- Arrays

## Advanced Features

### Variant Mapping
- Automatically detects component variants
- Maps data fields to variant properties
- Supports multiple variant combinations

### Grid Layout Options
- Automatic grid arrangement
- Customizable spacing
- Responsive layout adaptation

### Image Handling
- Automatic image sizing
- Fallback for failed images
- Support for various image formats

## Troubleshooting

### Common Issues
1. **Component Not Recognized**
   - Ensure component is properly structured
   - Check layer naming
   - Verify component is published

2. **Data Mapping Fails**
   - Validate JSON format
   - Check for matching field names
   - Ensure data types match

3. **Images Not Loading**
   - Verify image URLs are accessible
   - Check network connectivity
   - Ensure URLs use HTTPS

### Error Messages
- "Invalid Component": Selection is not a valid component
- "Data Format Error": JSON data is malformed
- "Network Error": Unable to load external resources

## Best Practices

1. **Component Design**
   - Use consistent layer naming
   - Keep component structure simple
   - Test with different content lengths

2. **Data Preparation**
   - Validate JSON before importing
   - Use consistent data structure
   - Include fallback values

3. **Performance**
   - Limit batch size to 50 cards
   - Optimize image sizes
   - Use efficient data structures

## Support

For additional support:
- GitHub Issues: [link to repository]
- Email: [support email]
- Documentation: [link to documentation]

## Updates and Versions

### Version History
- 1.0.0: Initial release
  - Basic card generation
  - Component analysis
  - Data mapping

### Planned Features
- Custom grid layouts
- Data validation rules
- Template library
- Batch processing improvements 