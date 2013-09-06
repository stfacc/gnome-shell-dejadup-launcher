const Lang = imports.lang;

const Gio = imports.gi.Gio;
const St = imports.gi.St;

const MessageTray = imports.ui.messageTray;
const AutorunManager = imports.ui.components.autorunManager;

const DEJADUP_SCHEMA = 'org.gnome.DejaDup.File';

const ModifiedAutorunTransientNotification = new Lang.Class({
    Name: 'ModifiedAutorunTransientNotification',

    _init: function() {
        this._dejadupInstalled = false;

        let schemas = Gio.Settings.list_schemas();
        if (schemas.indexOf(DEJADUP_SCHEMA) == -1)
            return;

        this._dejadupInstalled = true;

        this._originalInit = AutorunManager.AutorunTransientNotification.prototype._init;
    },

    _modifiedInit: function() {
        return function(manager, source) {
            MessageTray.Notification.prototype._init.call(this, source, source.title, null, { customContent: true });

            ////////////////////////////////////////
            // Normal content of the notification //
            ////////////////////////////////////////
            this._manager = manager;
            this._box = new St.BoxLayout({ style_class: 'hotplug-transient-box',
                                           vertical: true });
            this.addActor(this._box);

            this._mount = source.mount;

            source.apps.forEach(Lang.bind(this, function (app) {
                let actor = this._buttonForApp(app);

                if (actor)
                    this._box.add(actor, { x_fill: true,
                                           x_align: St.Align.START });
            }));

            this._box.add(this._buttonForEject(), { x_fill: true,
                                                    x_align: St.Align.START });

            // set the notification to transient and urgent, so that it
            // expands out
            this.setTransient(true);
            this.setUrgency(MessageTray.Urgency.CRITICAL);

            ///////////////////////////
            // Our new Backup button //
            ///////////////////////////
            let volume = this._mount.get_volume();
            if (!volume)
                return;

            let uuid = volume.get_identifier(Gio.VOLUME_IDENTIFIER_KIND_UUID);

            let settings = new Gio.Settings({ schema: DEJADUP_SCHEMA });
            let backupUuid = settings.get_string('uuid');

            if (uuid != backupUuid)
                return;

            let box = new St.BoxLayout();
            let icon = new St.Icon({ icon_name: 'deja-dup-symbolic',
                                     style_class: 'hotplug-notification-item-icon' });
            box.add(icon);

            let label = new St.Bin({ y_align: St.Align.MIDDLE,
                                     child: new St.Label
                                     ({ text: "Backup" })
                                   });
            box.add(label);

            let button = new St.Button({ child: box,
                                         x_fill: true,
                                         x_align: St.Align.START,
                                         button_mask: St.ButtonMask.ONE,
                                         style_class: 'hotplug-notification-item' });

            button.connect('clicked', Lang.bind(this, function() {
                try {
                    let app = Gio.DesktopAppInfo.new('deja-dup.desktop');
                    app.launch([], global.create_app_launch_context());
                } catch (e) {
                    log('Unable to launch DejaDup: ' + e.toString());
                }

                this.destroy();
            }));

            this._box.add(button, { x_fill: true,
                                    x_align: St.Align.START });
        };
    },

    enable: function() {
        if (this._dejadupInstalled)
            AutorunManager.AutorunTransientNotification.prototype._init = this._modifiedInit();
    },

    disable: function() {
        if (this._dejadupInstalled)
            AutorunManager.AutorunTransientNotification.prototype._init = this._originalInit;
    }
});


function init() {
    return new ModifiedAutorunTransientNotification();
}
