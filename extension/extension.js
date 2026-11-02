const { Gio, GLib, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain('homeassistant-panel');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const INDICATOR_NAME = 'HomeAssistantPanelIndicator';

let haClient = null;
let indicator = null;
let refreshTimeout = null;

const HomeAssistantClient = GObject.registerClass(
    class HomeAssistantClient extends GObject.Object {
        _init(settings) {
            super._init();
            this.settings = settings;
            this.baseUrl = this.settings.get_string('ha-url');
            this.token = this.settings.get_string('ha-token');
            this.entities = {};
        }

        async fetchStates() {
            try {
                // Remove trailing slash if present
                const cleanUrl = this.baseUrl.replace(/\/$/, '');
                const url = `${cleanUrl}/api/states`;

                const session = new Gio.Session();

                const request = new Gio.HttpRequest({
                    method: 'GET',
                    uri: url,
                });

                const headers = new Gio.HttpHeaders({
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                });
                request.set_headers(headers);

                const [response, stream] = await session.send_async(request, Gio.Cancellable.current);

                if (response.get_status() === 200) {
                    const bytes = await stream.read_all_async(null, Gio.Cancellable.current);
                    const data = ByteArray.toString(bytes);
                    const states = JSON.parse(data);

                    this.entities = {};
                    for (const state of states) {
                        this.entities[state.entity_id] = state;
                    }

                    return this.entities;
                } else {
                    logError(`Home Assistant API error: ${response.get_status()}`);
                    return null;
                }
            } catch (e) {
                logError(`Error fetching Home Assistant states: ${e}`);
                return null;
            }
        }

        async callService(serviceDomain, serviceName, entityId = null) {
            try {
                const cleanUrl = this.baseUrl.replace(/\/$/, '');
                const url = `${cleanUrl}/api/services/${serviceDomain}/${serviceName}`;

                const session = new Gio.Session();

                const payload = entityId ? { entity_id: entityId } : {};

                const request = new Gio.HttpRequest({
                    method: 'POST',
                    uri: url,
                    headers: new Gio.HttpHeaders({
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    }),
                });

                const body = new Gio.MemoryInputStream.from_bytes(
                    new GLib.Bytes(JSON.stringify(payload))
                );
                request.set_request_body_from_stream(body, null, null);

                const [response] = await session.send_async(request, Gio.Cancellable.current);

                if (response.get_status() === 200) {
                    return true;
                } else {
                    logError(`Error calling service: ${response.get_status()}`);
                    return false;
                }
            } catch (e) {
                logError(`Error calling Home Assistant service: ${e}`);
                return false;
            }
        }

        getEntityState(entityId) {
            return this.entities[entityId] || null;
        }
    }
);

const EntityDisplay = GObject.registerClass(
    class EntityDisplay extends St.Label {
        _init(entityId, haClient) {
            super._init({
                text: entityId,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.START,
            });
            this.entityId = entityId;
            this.haClient = haClient;
            this.updateDisplay();
        }

        updateDisplay() {
            const state = this.haClient.getEntityState(this.entityId);
            if (state) {
                const friendlyName = state.attributes?.friendly_name || this.entityId.split('.').pop().replace(/_/g, ' ');
                const stateValue = state.state;
                const unit = state.attributes?.unit_of_measurement || '';

                let displayText = `${friendlyName}: ${stateValue}`;
                if (unit) {
                    displayText += ` ${unit}`;
                }

                this.set_text(displayText.trim());
            } else {
                this.set_text(`${this.entityId}: N/A`);
            }
        }
    }
);

const AutomationMenuItem = GObject.registerClass(
    class AutomationMenuItem extends PopupMenu.PopupMenuItem {
        _init(automationEntity, haClient) {
            const displayName = automationEntity.split('.').pop().replace(/_/g, ' ');
            super._init(`Trigger: ${displayName}`);
            this.automationEntity = automationEntity;
            this.haClient = haClient;

            this.connect('activate', () => this.triggerAutomation());
        }

        async triggerAutomation() {
            const success = await this.haClient.callService('automation', 'trigger', this.automationEntity);
            if (success) {
                Main.notify('Home Assistant', `Triggered automation: ${this.automationEntity}`);
            } else {
                Main.notify('Home Assistant', `Failed to trigger automation: ${this.automationEntity}`);
            }
        }
    }
);

const HomeAssistantIndicator = GObject.registerClass(
    class HomeAssistantIndicator extends PanelMenu.Button {
        _init(settings) {
            super._init(0.0, _('Home Assistant'));
            this.settings = settings;
            this.haClient = new HomeAssistantClient(settings);

            // Try to load custom icon or use default
            let iconName = 'homeassistant-symbolic';
            try {
                const iconTheme = Gtk.IconTheme.get_default();
                if (!iconTheme.lookup_icon(iconName, 16, Gtk.IconLookupFlags.NO_SVG)) {
                    iconName = 'network-server-symbolic';
                }
            } catch (e) {
                iconName = 'network-server-symbolic';
            }

            this.icon = new St.Icon({
                gicon: Gio.icon_new_for_string(iconName),
                style_class: 'system-status-icon',
            });
            this.add_actor(this.icon);

            // Create menu
            this._buildMenu();

            // Connect settings changes
            this.settings.connect('changed', () => this._onSettingsChanged());

            // Start refresh loop
            this._startRefresh();
        }

        _buildMenu() {
            this.menu.removeAll();

            // Add entity displays
            const displayEntities = this.settings.get_strv('display-entities');
            if (displayEntities.length > 0) {
                const entitiesSection = new PopupMenu.PopupMenuSection();
                this.menu.addMenuItem(entitiesSection);

                for (const entityId of displayEntities) {
                    const display = new EntityDisplay(entityId, this.haClient);
                    const item = new PopupMenu.PopupMenuItem();
                    item.add_child(display);
                    entitiesSection.addMenuItem(item);
                }
            } else {
                const noEntities = new PopupMenu.PopupMenuItem(_('No entities configured'));
                noEntities.setSensitive(false);
                this.menu.addMenuItem(noEntities);
            }

            // Add separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Add automations
            const automations = this.settings.get_strv('automations');
            if (automations.length > 0) {
                const automationsSection = new PopupMenu.PopupMenuSection();
                this.menu.addMenuItem(automationsSection);

                const title = new PopupMenu.PopupMenuItem(_('Automations'));
                title.setSensitive(false);
                automationsSection.addMenuItem(title);

                for (const automation of automations) {
                    const item = new AutomationMenuItem(automation, this.haClient);
                    automationsSection.addMenuItem(item);
                }
            }

            // Add separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Add refresh button
            const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            refreshItem.connect('activate', () => this._refreshData());
            this.menu.addMenuItem(refreshItem);

            // Add settings button
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                const app = Gio.Application.get_default();
                if (app) {
                    app.activate();
                }
            });
            this.menu.addMenuItem(settingsItem);
        }

        async _refreshData() {
            const states = await this.haClient.fetchStates();
            if (states) {
                this._updateDisplays();
            }
        }

        _updateDisplays() {
            const children = this.menu.get_children();
            for (const child of children) {
                if (child instanceof PopupMenu.PopupMenuSection) {
                    const items = child.get_children();
                    for (const item of items) {
                        const display = item.get_children()[0];
                        if (display instanceof EntityDisplay) {
                            display.updateDisplay();
                        }
                    }
                }
            }
        }

        _startRefresh() {
            if (refreshTimeout) {
                GLib.source_remove(refreshTimeout);
                refreshTimeout = null;
            }

            const interval = this.settings.get_int('refresh-interval');
            this._refreshData();

            refreshTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                interval,
                () => {
                    this._refreshData();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        _onSettingsChanged() {
            this.haClient.baseUrl = this.settings.get_string('ha-url');
            this.haClient.token = this.settings.get_string('ha-token');
            this._buildMenu();
            this._startRefresh();
        }

        destroy() {
            if (refreshTimeout) {
                GLib.source_remove(refreshTimeout);
                refreshTimeout = null;
            }
            super.destroy();
        }
    }
);

function init() {
    // Initialize translations
    try {
        Gettext.bindtextdomain('homeassistant-panel', GLib.get_home_dir() + '/.local/share/locale');
    } catch (e) {
        log(`Translation initialization failed: ${e}`);
    }
}

let _indicator = null;

function enable() {
    const settings = new Settings.ExtensionSettings();
    _indicator = new HomeAssistantIndicator(settings);
    Main.panel.addToStatusArea(INDICATOR_NAME, _indicator);
}

function disable() {
    if (_indicator) {
        _indicator.destroy();
        _indicator = null;
    }

    if (refreshTimeout) {
        GLib.source_remove(refreshTimeout);
        refreshTimeout = null;
    }
}
