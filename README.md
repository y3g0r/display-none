# Display None - Element Hider Browser Extension

A powerful browser extension that allows you to hide HTML elements on any webpage with undo/redo functionality. Primarily targeted for mobile devices but works great on desktop too!

## Features

- **Click to Hide**: Simply click on any element to hide it from the page
- **Visual Feedback**: Hover over elements to see what will be hidden (red outline)
- **Undo/Redo**: Full undo/redo support for all hiding actions
- **Accept/Cancel**: Accept changes to keep them, or cancel to restore everything
- **Keyboard Shortcuts**:
  - `Ctrl+Z` (or `Cmd+Z` on Mac) - Undo
  - `Ctrl+Y` (or `Cmd+Y` on Mac) - Redo
- **Mobile Optimized**: Large touch-friendly buttons and responsive design
- **Floating Action Buttons (FABs)**: Easy-to-access controls that stay visible

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked"
5. Select the folder containing this extension
6. The extension is now installed!

### Firefox

#### Temporary Installation (For Testing)
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the extension folder and select the `manifest.json` file
5. The extension is now installed temporarily (will be removed when Firefox closes)

#### Permanent Installation
For permanent installation in Firefox, you need to:
1. Create a ZIP file of all extension files
2. Sign the extension through [Mozilla's Add-on Developer Hub](https://addons.mozilla.org/developers/)
3. Or use [web-ext sign](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign) command

**Note**: The extension uses Manifest V2 for maximum compatibility across all browsers. It uses cross-browser compatible API calls that work with both Firefox and Chrome.

## Usage

### Activating the Extension

1. Navigate to any webpage
2. Click the extension icon in your browser toolbar
3. The element hider mode will activate, showing 4 floating action buttons:
   - **Undo** (curved arrow left) - Undo the last action
   - **Redo** (curved arrow right) - Redo an undone action
   - **Accept** (checkmark) - Accept all changes and exit
   - **Cancel** (X) - Cancel all changes and restore elements

### Hiding Elements

1. Once activated, hover over any element on the page
   - The element will be outlined in red
2. Click on the element to hide it
   - The element will disappear (`display: none`)
3. Continue hiding elements as needed
4. Use Undo/Redo to adjust your changes

### Accepting or Canceling Changes

- **Accept**: Click the green checkmark button
  - All hidden elements will remain hidden
  - The extension will deactivate
  - Changes persist until page reload

- **Cancel**: Click the red X button
  - All hidden elements will be restored
  - The extension will deactivate
  - Everything returns to normal

### Mobile Usage

On mobile devices:
1. Add the extension to your mobile browser (if supported)
2. The FAB buttons are optimized for touch interaction
3. Tap elements to hide them
4. Use the large touch-friendly buttons to control your actions

## File Structure

```
display-none/
├── manifest.json       # Extension configuration (Manifest V2)
├── background.js       # Background script for icon clicks
├── content.js          # Main element hiding logic
├── styles.css          # FAB and UI styling
├── icon.svg            # Extension icon (template)
└── README.md           # This file
```

## Technical Details

### How It Works

1. **Content Script**: Injects JavaScript into every webpage
2. **Event Listeners**: Captures clicks and hover events when activated
3. **State Management**: Maintains history stack for undo/redo
4. **CSS Manipulation**: Sets `display: none` on hidden elements
5. **FAB UI**: Creates floating action buttons with event handlers

### Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave (Chromium-based)
- ✅ Firefox 57+ (fully compatible)
- ✅ Opera (Chromium-based)

The extension uses Manifest V2 with a browser API polyfill to support both Chrome's `chrome.*` API and Firefox's `browser.*` API, ensuring seamless compatibility across all major browsers.

**Note**: Manifest V2 is used for maximum compatibility. While Chrome is phasing out MV2 in favor of MV3, the extension will continue to work until at least 2025, and can be easily upgraded to MV3 when Firefox support improves.

### Permissions

- `activeTab`: Required to interact with the current webpage
- `storage`: Reserved for future features (saving hidden elements)

## Customization

### Changing FAB Colors

Edit `styles.css`:

```css
.fab-button {
  background: #2196F3; /* Change this color */
}

.fab-button.fab-accept {
  background: #4CAF50; /* Accept button color */
}

.fab-button.fab-cancel {
  background: #f44336; /* Cancel button color */
}
```

### Changing FAB Position

Edit `styles.css`:

```css
#element-hider-fab-container {
  bottom: 20px;  /* Distance from bottom */
  right: 20px;   /* Distance from right */
  /* Change to 'left: 20px' for left side */
}
```

### Adding Icons

To add custom icons for the extension:

1. Create PNG images in these sizes:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

2. Add to `manifest.json`:
```json
"icons": {
  "16": "icon16.png",
  "48": "icon48.png",
  "128": "icon128.png"
}
```

## Troubleshooting

### Extension not activating
- Make sure you clicked the extension icon in the toolbar
- Check that the webpage allows content scripts (some pages like chrome:// are restricted)
- Refresh the page and try again

### FAB buttons not visible
- Check z-index conflicts with the webpage
- Try a different webpage to verify it works
- Check browser console for errors

### Elements not hiding
- Ensure you're clicking directly on elements (not on FAB buttons)
- Some elements may have `!important` styles that override hiding
- Try disabling other extensions that might conflict

## Future Enhancements

- [ ] Persist hidden elements across page reloads
- [ ] Export/import hiding rules for specific websites
- [ ] Element selector mode (hide all instances of similar elements)
- [ ] Custom CSS rules beyond `display: none`
- [ ] Sync settings across devices

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use and modify as needed.

## Privacy

This extension:
- ✅ Does NOT collect any data
- ✅ Does NOT track your browsing
- ✅ Does NOT send information to external servers
- ✅ Works entirely locally in your browser

All element hiding is done locally on your device.

---

**Enjoy hiding those annoying elements!** 🎯
