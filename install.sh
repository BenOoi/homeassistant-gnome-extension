#!/bin/bash

# Home Assistant GNOME Panel Extension Installer

EXTENSION_NAME="homeassistant-panel@user"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_NAME"
SCHEMAS_DIR="$HOME/.local/share/glib-2.0/schemas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please do not run this script as root. Run it as your normal user.${NC}"
    exit 1
fi

# Create extension directory
echo "Creating extension directory..."
mkdir -p "$EXTENSION_DIR"
mkdir -p "$SCHEMAS_DIR"

# Copy files
echo "Copying extension files..."
cp -r extension/* "$EXTENSION_DIR/"
cp metadata.json "$EXTENSION_DIR/"
cp stylesheet.css "$EXTENSION_DIR/"

# Copy schema
echo "Installing schema..."
cp schemas/*.xml "$SCHEMAS_DIR/"

# Compile schemas
echo "Compiling schemas..."
glib-compile-schemas "$SCHEMAS_DIR"

# Check if extension directory exists
if [ -d "$EXTENSION_DIR" ]; then
    echo -e "${GREEN}Extension installed successfully!${NC}"
    echo ""
    echo "To enable the extension:"
    echo "1. Restart GNOME Shell by pressing Alt+F2, typing 'r', and pressing Enter"
    echo "2. Open GNOME Extensions app (gnome-extensions-app)"
    echo "3. Find 'Home Assistant Panel' and enable it"
    echo ""
    echo "To configure the extension:"
    echo "1. Right-click the Home Assistant icon in the panel"
    echo "2. Select 'Settings'"
    echo "3. Enter your Home Assistant URL and access token"
else
    echo -e "${RED}Failed to install extension.${NC}"
    exit 1
fi
