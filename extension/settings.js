const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionSettings = class {
    constructor() {
        let schemaSource = null;

        try {
            // Try to load from extension schemas directory
            schemaSource = Gio.SettingsSchemaSource.new_from_directory(
                Me.path + '/schemas',
                Gio.SettingsSchemaSource.get_default(),
                false
            );
        } catch (e) {
            logError(`Error loading schema from extension directory: ${e}`);
            // Try to load from system schemas
            try {
                schemaSource = Gio.SettingsSchemaSource.get_default();
            } catch (e2) {
                logError(`Error loading default schema source: ${e2}`);
                throw new Error('Could not load settings schema');
            }
        }

        const schemaObj = schemaSource.lookup('org.gnome.shell.extensions.homeassistant-panel', true);
        if (!schemaObj) {
            throw new Error('Could not find settings schema');
        }

        this.settings = new Gio.Settings({
            settings_schema: schemaObj,
        });
    }

    get_string(key) {
        return this.settings.get_string(key);
    }

    get_int(key) {
        return this.settings.get_int(key);
    }

    get_boolean(key) {
        return this.settings.get_boolean(key);
    }

    get_strv(key) {
        return this.settings.get_strv(key);
    }

    set_string(key, value) {
        this.settings.set_string(key, value);
    }

    set_int(key, value) {
        this.settings.set_int(key, value);
    }

    set_boolean(key, value) {
        this.settings.set_boolean(key, value);
    }

    set_strv(key, value) {
        this.settings.set_strv(key, value);
    }

    connect(signal, callback) {
        return this.settings.connect(signal, callback);
    }
};
