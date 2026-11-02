const { Gio, Gtk, GObject, GLib } = imports.gi;
const Gettext = imports.gettext.domain('homeassistant-panel');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const HomeAssistantPrefsWidget = GObject.registerClass(
    class HomeAssistantPrefsWidget extends Gtk.Box {
        _init(params) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 18,
                margin_bottom: 18,
                margin_start: 18,
                margin_end: 18,
                ...params,
            });

            this.settings = new Settings.ExtensionSettings();
            this._buildUI();
        }

        _buildUI() {
            // Main container
            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 18,
            });
            this.append(mainBox);

            // Connection Settings Frame
            const connectionFrame = new Gtk.Frame({
                label: _('Connection Settings'),
                label_align: 0.0,
            });
            mainBox.append(connectionFrame);

            const connectionBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 10,
                margin_bottom: 10,
                margin_start: 10,
                margin_end: 10,
            });
            connectionFrame.set_child(connectionBox);

            // Home Assistant URL
            const urlRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
            });
            connectionBox.append(urlRow);

            const urlLabel = new Gtk.Label({
                label: _('Home Assistant URL:'),
                halign: Gtk.Align.START,
                hexpand: true,
            });
            urlRow.append(urlLabel);

            this.urlEntry = new Gtk.Entry({
                text: this.settings.get_string('ha-url'),
                halign: Gtk.Align.FILL,
                hexpand: true,
                placeholder_text: 'https://your-homeassistant:8123',
            });
            urlRow.append(this.urlEntry);

            // Access Token
            const tokenRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
            });
            connectionBox.append(tokenRow);

            const tokenLabel = new Gtk.Label({
                label: _('Access Token:'),
                halign: Gtk.Align.START,
                hexpand: true,
            });
            tokenRow.append(tokenLabel);

            this.tokenEntry = new Gtk.Entry({
                text: this.settings.get_string('ha-token'),
                halign: Gtk.Align.FILL,
                hexpand: true,
                visibility: false,
                placeholder_text: 'Long-lived access token',
                input_purpose: Gtk.InputPurpose.PASSWORD,
            });
            tokenRow.append(this.tokenEntry);

            // Show Token Toggle
            const showTokenRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
            });
            connectionBox.append(showTokenRow);

            this.showTokenSwitch = new Gtk.Switch({
                active: false,
                halign: Gtk.Align.START,
            });
            showTokenRow.append(this.showTokenSwitch);

            const showTokenLabel = new Gtk.Label({
                label: _('Show Token'),
                halign: Gtk.Align.START,
            });
            showTokenRow.append(showTokenLabel);

            this.showTokenSwitch.connect('state-set', (switchObj, state) => {
                this.tokenEntry.set_visibility(state);
                return GLib.SOURCE_CONTINUE;
            });

            // Connection Test Button
            const testRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
            });
            connectionBox.append(testRow);

            this.testButton = new Gtk.Button({
                label: _('Test Connection'),
                halign: Gtk.Align.END,
            });
            testRow.append(this.testButton);

            this.testButton.connect('clicked', () => this._testConnection());

            // Display Settings Frame
            const displayFrame = new Gtk.Frame({
                label: _('Display Settings'),
                label_align: 0.0,
            });
            mainBox.append(displayFrame);

            const displayBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 10,
                margin_bottom: 10,
                margin_start: 10,
                margin_end: 10,
            });
            displayFrame.set_child(displayBox);

            // Entities to Display
            const entitiesRow = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
            });
            displayBox.append(entitiesRow);

            const entitiesLabel = new Gtk.Label({
                label: _('Entities to Display (comma separated):'),
                halign: Gtk.Align.START,
            });
            entitiesRow.append(entitiesLabel);

            this.entitiesEntry = new Gtk.Entry({
                text: this.settings.get_strv('display-entities').join(', '),
                halign: Gtk.Align.FILL,
                placeholder_text: 'sensor.temperature, sensor.humidity, light.living_room',
            });
            entitiesRow.append(this.entitiesEntry);

            const entitiesHelp = new Gtk.Label({
                label: _('Enter entity IDs separated by commas. Example: sensor.temperature, light.living_room'),
                halign: Gtk.Align.START,
                wraps: true,
                xalign: 0,
            });
            entitiesHelp.add_css_class('dim-label');
            entitiesHelp.add_css_class('caption');
            entitiesRow.append(entitiesHelp);

            // Show Icon
            const showIconRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
            });
            displayBox.append(showIconRow);

            this.showIconSwitch = new Gtk.Switch({
                active: this.settings.get_boolean('show-icon'),
                halign: Gtk.Align.END,
            });
            showIconRow.append(this.showIconSwitch);

            const showIconLabel = new Gtk.Label({
                label: _('Show Icon in Panel'),
                halign: Gtk.Align.START,
                hexpand: true,
            });
            showIconRow.append(showIconLabel);

            // Refresh Settings Frame
            const refreshFrame = new Gtk.Frame({
                label: _('Refresh Settings'),
                label_align: 0.0,
            });
            mainBox.append(refreshFrame);

            const refreshBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 10,
                margin_bottom: 10,
                margin_start: 10,
                margin_end: 10,
            });
            refreshFrame.set_child(refreshBox);

            // Refresh Interval
            const intervalRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
            });
            refreshBox.append(intervalRow);

            const intervalLabel = new Gtk.Label({
                label: _('Refresh Interval (seconds):'),
                halign: Gtk.Align.START,
                hexpand: true,
            });
            intervalRow.append(intervalLabel);

            this.intervalSpin = new Gtk.SpinButton({
                numeric: true,
                adjustment: new Gtk.Adjustment({
                    lower: 5,
                    upper: 300,
                    step_increment: 5,
                    page_increment: 10,
                    value: this.settings.get_int('refresh-interval'),
                }),
            });
            intervalRow.append(this.intervalSpin);

            // Automations Frame
            const automationsFrame = new Gtk.Frame({
                label: _('Automations'),
                label_align: 0.0,
            });
            mainBox.append(automationsFrame);

            const automationsBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 10,
                margin_bottom: 10,
                margin_start: 10,
                margin_end: 10,
            });
            automationsFrame.set_child(automationsBox);

            // Automations List
            const automationsRow = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
            });
            automationsBox.append(automationsRow);

            const automationsLabel = new Gtk.Label({
                label: _('Automation Entities (comma separated):'),
                halign: Gtk.Align.START,
            });
            automationsRow.append(automationsLabel);

            this.automationsEntry = new Gtk.Entry({
                text: this.settings.get_strv('automations').join(', '),
                halign: Gtk.Align.FILL,
                placeholder_text: 'automation.lights_on, automation.good_morning',
            });
            automationsRow.append(this.automationsEntry);

            const automationsHelp = new Gtk.Label({
                label: _('Enter automation entity IDs separated by commas. These will appear as triggerable items in the panel menu.'),
                halign: Gtk.Align.START,
                wraps: true,
                xalign: 0,
            });
            automationsHelp.add_css_class('dim-label');
            automationsHelp.add_css_class('caption');
            automationsRow.append(automationsHelp);

            // Save Button
            const saveButton = new Gtk.Button({
                label: _('Save Settings'),
                halign: Gtk.Align.CENTER,
                margin_top: 20,
            });
            saveButton.add_css_class('suggested-action');
            saveButton.connect('clicked', () => this._saveSettings());
            mainBox.append(saveButton);

            // Help Label
            const helpLabel = new Gtk.Label({
                label: _('Note: After saving, restart the extension for changes to take effect.'),
                halign: Gtk.Align.CENTER,
                margin_top: 10,
                wraps: true,
            });
            helpLabel.add_css_class('dim-label');
            helpLabel.add_css_class('caption');
            mainBox.append(helpLabel);

            // Connect signals for auto-save
            this._connectSignals();
        }

        _connectSignals() {
            // Auto-save on changes
            this.urlEntry.connect('changed', () => this._autoSave());
            this.tokenEntry.connect('changed', () => this._autoSave());
            this.entitiesEntry.connect('changed', () => this._autoSave());
            this.showIconSwitch.connect('state-set', () => this._autoSave());
            this.intervalSpin.connect('value-changed', () => this._autoSave());
            this.automationsEntry.connect('changed', () => this._autoSave());
        }

        _autoSave() {
            this._saveSettings(true);
        }

        async _testConnection() {
            const url = this.urlEntry.get_text();
            const token = this.tokenEntry.get_text();

            if (!url || !token) {
                this._showMessage('Error', 'Please enter both URL and token');
                return;
            }

            this.testButton.set_sensitive(false);
            this.testButton.set_label(_('Testing...'));

            try {
                const cleanUrl = url.replace(/\/$/, '');
                const testUrl = `${cleanUrl}/api/states`;

                const session = new Gio.Session();
                const request = new Gio.HttpRequest({
                    method: 'GET',
                    uri: testUrl,
                });

                const headers = new Gio.HttpHeaders({
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                });
                request.set_headers(headers);

                const [response] = await session.send_async(request, Gio.Cancellable.current);

                if (response.get_status() === 200) {
                    this._showMessage('Success', 'Connection to Home Assistant is working!');
                } else {
                    this._showMessage('Error', `Connection failed with status: ${response.get_status()}`);
                }
            } catch (e) {
                this._showMessage('Error', `Connection test failed: ${e}`);
            } finally {
                this.testButton.set_sensitive(true);
                this.testButton.set_label(_('Test Connection'));
            }
        }

        _saveSettings(silent = false) {
            try {
                this.settings.set_string('ha-url', this.urlEntry.get_text());
                this.settings.set_string('ha-token', this.tokenEntry.get_text());

                const entities = this.entitiesEntry.get_text()
                    .split(',')
                    .map(e => e.trim())
                    .filter(e => e.length > 0);
                this.settings.set_strv('display-entities', entities);

                this.settings.set_boolean('show-icon', this.showIconSwitch.get_active());
                this.settings.set_int('refresh-interval', this.intervalSpin.get_value());

                const automations = this.automationsEntry.get_text()
                    .split(',')
                    .map(a => a.trim())
                    .filter(a => a.length > 0);
                this.settings.set_strv('automations', automations);

                if (!silent) {
                    this._showMessage('Success', 'Settings saved successfully!\nRestart the extension for changes to take effect.');
                }
            } catch (e) {
                this._showMessage('Error', `Error saving settings: ${e}`);
            }
        }

        _showMessage(title, message) {
            const dialog = new Gtk.MessageDialog({
                transient_for: this.get_root(),
                modal: true,
                message_type: Gtk.MessageType.INFO,
                buttons: Gtk.ButtonsType.OK,
                text: title,
                secondary_text: message,
            });
            dialog.connect('response', () => dialog.destroy());
            dialog.show();
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

function buildPrefsWidget() {
    return new HomeAssistantPrefsWidget();
}
