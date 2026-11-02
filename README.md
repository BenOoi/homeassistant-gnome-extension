# Home Assistant GNOME Panel Extension

A GNOME Shell extension that connects to your Home Assistant instance and displays entity values in the top bar. It also allows you to trigger automations directly from the panel menu.

## Features

- **Display Entity States**: Show the current state of any Home Assistant entity in your GNOME top bar
- **Trigger Automations**: Quickly trigger Home Assistant automations from the panel menu
- **Configurable Refresh**: Set how often entity states are refreshed
- **Customizable Display**: Choose which entities to display and how they appear
- **Connection Testing**: Test your Home Assistant connection from the settings

## Installation

### Prerequisites

1. GNOME Shell 42 or later
2. Home Assistant instance with API access enabled
3. A long-lived access token from Home Assistant

### Steps

1. **Get a Long-Lived Access Token** from Home Assistant:
   - Go to your Home Assistant profile (click your user icon in the bottom-left)
   - Scroll down to "Long-lived access tokens"
   - Click "Create Token"
   - Give it a name (e.g., "GNOME Extension") and copy the token

2. **Install the Extension**:
   ```bash
   # Clone this repository
   git clone https://github.com/BenOoi/homeassistant-gnome-extension.git
   cd homeassistant-gnome-extension

   # Copy to GNOME extensions directory
   mkdir -p ~/.local/share/gnome-shell/extensions/homeassistant-panel@user
   cp -r * ~/.local/share/gnome-shell/extensions/homeassistant-panel@user/

   # Compile the schemas
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/homeassistant-panel@user/schemas/
