# Video Speedup Extension

A Brave browser extension that allows you to control video playback speed on TikTok, YouTube, Vimeo, Twitch, and Instagram by holding left click on different sides of the video player.

## Features

- 🎯 **Multi-platform support**: Works on TikTok, YouTube, Vimeo, Twitch, and Instagram
- ⚡ **Hold-to-speed-up**: Hold left click on the right side of any video to speed it up
- 🐌 **Hold-to-slow-down**: Hold left click on the left side of any video to slow it down
- ⌨️ **Keyboard shortcuts**: Use `+` to increase speed, `-` to decrease slow speed
- 🎯 **Smart detection**: Automatically detects videos on supported platforms
- 📊 **Visual feedback**: Shows current speed indicator on screen while holding
- 🎨 **AMOLED dark theme**: Beautiful minimalistic dark interface
- 🔄 **Temporary speed**: Speed changes are temporary and restore to normal when released
- 🎮 **Unified speed control**: Single speed sequence for both speed-up and slow-down modes
- 🎛️ **Speed sliders**: Fine-tuned control with sliders for precise speed selection
- 🪟 **Floating control panel**: Draggable panel that stays on screen for quick access
- 🔒 **Speed lock**: Maintain speed across video changes
- ⚡ **Lazy loading**: Optimized video detection for better performance
- 🚀 **Debounced interactions**: Smooth performance with rapid speed changes

## Speed Sequence

The extension uses a unified speed sequence that both speed-up and slow-down modes iterate through:

**Speed Sequence**: `[0.1, 0.25, 0.5, 0.8, 1.0, 1.5, 1.8, 2.0, 2.1, 2.5, 3.0, 3.5, 4.0]`

- **Default starting point**: 2.0x (index 7 in the sequence)
- **Speed-up mode**: Uses the selected speed from the sequence
- **Slow-down mode**: Uses the selected speed from the sequence
- **Incremental control**: `+` key moves forward through the sequence
- **Decremental control**: `-` key moves backward through the sequence

## Installation

### Method 1: Load as Unpacked Extension (Recommended)

1. **Download the extension files**
   - Download all files from this repository
   - Extract them to a folder on your computer

2. **Generate icons** (if needed)
   - Open `create_icons.html` in your browser
   - Click "Generate Icons" to create the icon files
   - Download the generated PNG files and place them in the extension folder

3. **Load the extension in Brave**
   - Open Brave browser
   - Go to `brave://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder containing the extension files

4. **Pin the extension**
   - Click the puzzle piece icon in the toolbar
   - Find "Video Speedup" and click the pin icon

### Method 2: Install from Chrome Web Store (when available)

*Coming soon...*

## Usage

### Basic Usage

1. **Navigate to supported platform**
   - Go to [tiktok.com](https://www.tiktok.com), [youtube.com](https://www.youtube.com), [vimeo.com](https://vimeo.com), [twitch.tv](https://www.twitch.tv), or [instagram.com](https://www.instagram.com)
   - Browse to any video

2. **Select your speeds**
   - Click the extension icon to open the popup
   - Use the speed sliders for fine-tuned control (0.1x to 4.0x)
   - Use the `+` button to increase speed (iterate through sequence)
   - Use the `-` button to decrease slow speed (iterate through sequence)
   - Use "Reset Speed" or "Reset Slow" to return to normal speed (1.0x)

3. **Control video speed**
   - **Hold left click on the right side** to speed up the video
   - **Hold left click on the left side** to slow down the video
   - The video will change speed while you're holding
   - **Release** to return to normal speed (1.0x)
   - The video continues playing without pausing

### Advanced Controls

- **Keyboard shortcuts**: 
  - Press `+` to increase speed (iterate through sequence)
  - Press `-` to decrease slow speed (iterate through sequence)
  - Press `Space` for emergency stop (return to normal speed)
  - Press `F` to toggle floating control panel
- **Extension popup**: Click the extension icon to:
  - See current speed-up and slow-down rates
  - Use sliders for precise speed control
  - Toggle floating panel on/off
  - Toggle speed lock on/off
  - Reset to normal speed for both modes
  - Manually cycle to next speed for both modes using `+` and `-` buttons
  - View usage instructions
  - See platform status (TikTok/YouTube/Vimeo/Twitch/Instagram/Not supported)

### Visual Indicators

- **Speed indicator**: Appears in top-right corner showing current speed while holding
- **Popup status**: Shows if extension is active on supported platforms
- **Platform detection**: Automatically detects and adapts to supported platforms
- **Floating panel**: Draggable control panel for quick access to speed controls

## Supported Platforms

### TikTok
- **URL**: `https://www.tiktok.com/*`
- **Video detection**: Multiple CSS selectors for comprehensive coverage
- **Speed control**: Direct HTML5 video API manipulation

### YouTube
- **URL**: `https://www.youtube.com/*`
- **Video detection**: YouTube-specific video element selectors
- **Speed control**: Enhanced persistence with multiple delayed applications
- **Native speed override**: Aggressive speed enforcement to override YouTube's native controls

### Vimeo
- **URL**: `https://vimeo.com/*`
- **Video detection**: Vimeo-specific video element selectors
- **Speed control**: Direct HTML5 video API manipulation

### Twitch
- **URL**: `https://www.twitch.tv/*`
- **Video detection**: Twitch-specific video element selectors
- **Speed control**: Direct HTML5 video API manipulation

### Instagram
- **URL**: `https://www.instagram.com/*`
- **Video detection**: Instagram-specific video element selectors
- **Speed control**: Direct HTML5 video API manipulation

## File Structure

```
video-speedup-extension/
├── manifest.json          # Extension configuration
├── content.js             # Main functionality script
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── icon16.png             # 16x16 icon
├── icon48.png             # 48x48 icon
├── icon128.png            # 128x128 icon
├── create_icons.html      # Icon generator tool
├── install.md             # Quick installation guide
└── README.md              # This file
```

## How It Works

The extension works by:

1. **Detecting videos** using platform-specific CSS selectors
2. **Listening for mouse events** on video elements (mousedown, mouseup, mouseleave)
3. **Modifying playback rate** using the HTML5 video API
4. **Providing visual feedback** through on-screen indicators
5. **Managing state** across page navigation and new videos
6. **Platform adaptation** with specific logic for each supported platform

### Technical Implementation

- **Event handling**: Uses `mousedown`, `mouseup`, and `mouseleave` for precise hold detection
- **Speed persistence**: Multiple delayed speed applications for YouTube compatibility
- **State management**: Tracks original speeds, current speeds, and active states
- **DOM observation**: MutationObserver for detecting new videos in SPAs
- **Memory management**: WeakSet for tracking processed videos, cleanup intervals
- **Lazy loading**: Debounced video detection for optimal performance
- **Floating panel**: Draggable interface with real-time speed control
- **Speed lock**: Persistent speed application across video changes

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: 
  - `activeTab`: Access to current tab
  - `scripting`: Execute scripts in tabs
- **Host Permissions**: 
  - `https://www.tiktok.com/*`
  - `https://www.youtube.com/*`
  - `https://vimeo.com/*`
  - `https://www.twitch.tv/*`
  - `https://www.instagram.com/*`
- **Content Script**: Injected into all supported platform pages
- **Popup**: Provides user interface and controls

## Troubleshooting

### Extension not working?

1. **Check if you're on a supported platform**
   - The extension works on `tiktok.com`, `youtube.com`, `vimeo.com`, `twitch.tv`, and `instagram.com`
   - Make sure you're on the correct domain

2. **Verify installation**
   - Go to `brave://extensions/`
   - Ensure "Video Speedup" is enabled
   - Check for any error messages

3. **Refresh the page**
   - Sometimes the extension needs a page refresh to activate
   - Try refreshing the page after installing

4. **Check console for errors**
   - Press F12 to open developer tools
   - Look for any error messages in the Console tab

### Videos not speeding up?

1. **Click location**
   - Make sure you're clicking on the **right side** for speed-up
   - Make sure you're clicking on the **left side** for slow-down
   - The clickable areas are the outer 30% of the video

2. **Hold duration**
   - You must **hold** the left click, not just click
   - The speed indicator should appear while holding

3. **Video detection**
   - The extension may need time to detect new videos
   - Try scrolling to a different video and back

4. **Platform-specific issues**
   - **YouTube**: The extension aggressively overrides native speed controls
   - **TikTok**: Works with direct video element manipulation
   - **Other platforms**: Uses standard HTML5 video API

### Keyboard shortcuts not working?

1. **Input field focus**
   - Shortcuts are disabled when typing in input fields
   - Make sure you're not in a text input or textarea

2. **Browser shortcuts**
   - Some browsers may intercept `+` and `-` keys
   - Try using the popup buttons instead

### Floating panel not appearing?

1. **Enable floating panel**
   - Toggle the "Floating Panel" switch in the popup
   - Or press `F` key to toggle

2. **Panel positioning**
   - The panel is draggable - click and drag to reposition
   - Make sure it's not hidden behind other elements

## Development

### Making Changes

1. **Edit files** as needed
2. **Reload extension** in `brave://extensions/`
3. **Refresh the page** to see changes

### Adding Features

- **New speeds**: Modify the `speedSequence` array in `content.js`
- **UI changes**: Edit `popup.html` and `popup.js`
- **Functionality**: Modify `content.js` for core features
- **Platform support**: Add new host permissions and detection logic

## Privacy & Security

- **No data collection**: The extension doesn't collect or transmit any data
- **Local only**: All functionality runs locally in your browser
- **Minimal permissions**: Only requests necessary permissions for supported platforms
- **Open source**: Code is transparent and auditable

## Contributing

Feel free to contribute by:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Improving documentation

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the console for error messages
3. Create an issue in the repository
4. Contact the developer (Unnamed10110 - trojan.v6@gmail.com / sergiobritos@gmail.com)

---

**Enjoy faster video browsing! 🚀** 