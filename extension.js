'use strict';

// GJS's Built-in Modules are in the top-level
// See: https://gitlab.gnome.org/GNOME/gjs/wikis/Modules
const Gettext = imports.gettext;
const Cairo = imports.cairo;

// GNOME APIs are under the `gi` namespace (except Cairo)
// See: http://devdocs.baznga.org/
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

// GNOME Shell imports
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.movefocus");

// You can import your modules using the extension object we imported as `Me`.
// const ExampleLib = Me.imports.exampleLib;

/* exported init */

class MoveFocusExtension {
    constructor() {
        log(`[MOVE-FOCUS]: initializing`);
    }

    handler_move_focus_left(display) {
        return this.handler_move_focus(display, true);
    }

    handler_move_focus_right(display) {
        return this.handler_move_focus(display, false);
    }

    // insert new workspace
    // 1) append new workspace
    // 2) iterate over workspaces and shift windows down
    insert_new_workspace(wm, target_wspc_idx) {
        // ts is not used by append_new_workspace so we don't expose it
        const new_wspc = wm.append_new_workspace(false, global.get_current_time());
        const last_wspc_idx = wm.get_n_workspaces() - 1;

        for (var wspc_idx = last_wspc_idx - 1; wspc_idx >= target_wspc_idx; wspc_idx--) {
            var wspc = wm.get_workspace_by_index(wspc_idx);
            var next_wspc = wm.get_workspace_by_index(wspc_idx + 1);
            wspc.list_windows().forEach((x, i) => x.change_workspace(next_wspc));
        }

        return wm.get_workspace_by_index(target_wspc_idx);
    }

    handler_insert_new_workspace_down(display) {
        var wm = display.get_workspace_manager();
        var ts = display.get_current_time();
        var current_wspc_idx = wm.get_active_workspace_index();

        var target_wspc = this.insert_new_workspace(wm, current_wspc_idx + 1);
        target_wspc.activate(ts);

    }

    handler_move_to_new_workspace_up(display) {
        return this.handler_move_to_new_workspace(display, true);
    }

    handler_move_to_new_workspace_down(display) {
        return this.handler_move_to_new_workspace(display, false);
    }

    handler_move_to_new_workspace(display, direction_is_up) {
        var window = display.get_focus_window();
        if (window === null) {
            log(`[MOVE-FOCUS]: Can't move window - no window focused`);
            return
        }
        var wm = display.get_workspace_manager();
        var ts = display.get_current_time();
        var current_wspc_idx = wm.get_active_workspace_index();

        var direction = 1;
        if (direction_is_up) {
            direction = 0;
        }

        var target_wspc = this.insert_new_workspace(wm, current_wspc_idx + direction);
        window.change_workspace(target_wspc);
        target_wspc.activate_with_focus(window, ts);
        // TODO: activate window ?
    }

    get_cmp_func(reverse) {
        // we could do more advanced comparison where difference in X that is less than N doesn't count
        // minimal number of pixels that is considered different
        // reasoning is that a few pixels is something that human doesn't notice
        // so our ordering ignores it to make the ordering more predictable/natural
        const epsilon = 15;
        var reverse_coef = 1;
        if (reverse) {
            reverse_coef = -1;
        }
        return function(a, b) {
            const aa = a.get_buffer_rect();
            const bb = b.get_buffer_rect();
            if (Math.abs(aa.x - bb.x) > epsilon) {
                return (aa.x - bb.x) * reverse_coef;
            }
            if (Math.abs(aa.y - bb.y) > epsilon) {
                return (aa.y - bb.y) * reverse_coef;
            }
            if (Math.abs(aa.width - bb.width) > epsilon) {
                return (aa.width - bb.width) * -1 * reverse_coef;
            }
            if (Math.abs(aa.height - bb.height) > epsilon) {
                return (aa.height - bb.height) * -1 * reverse_coef;
            }
            return a.get_stable_sequence() - b.get_stable_sequence();
        };
    }

    create_fake_window(value) {
        return {
            get_buffer_rect() {
                return {
                    x: value,
                    y: value,
                    height: 1,
                    width: 1,
                };
            }
        };
    }

    find_next_window(windows, direction_is_left, current_window) {
        const cmp = this.get_cmp_func(direction_is_left);
        if (current_window === null) {
            if (direction_is_left) {
                current_window = this.create_fake_window(Number.MAX_VALUE);
                log(`[MOVE-FOCUS]: Focusing rightmost window`);
            } else {
                current_window = this.create_fake_window(Number.MIN_VALUE);
                log(`[MOVE-FOCUS]: Focusing leftmost window`);
            }
        }
        return windows.find(x => cmp(x, current_window) > 0);
    }

    handler_move_focus(display, direction_is_left) {
        // TODO: skip minimized/hidden windows if not in overview
        const wm = display.get_workspace_manager();
        const cmp = this.get_cmp_func(direction_is_left);
        const windows = 
            wm.get_active_workspace().list_windows()
            .sort(cmp);
        const current_window = display.get_focus_window();
        var target_window = this.find_next_window(windows, direction_is_left, current_window);
        if (target_window === undefined) {
            log(`[MOVE-FOCUS]: No window to focus - looping around`);
            target_window = this.find_next_window(windows, direction_is_left, null);
        }
        if (target_window === undefined) {
            log(`[MOVE-FOCUS]: Still no window to focus - aborting`);
            return;
        }
        var current_window_id = 0;
        if (current_window !== null) {
            current_window_id = current_window.get_id();
        }
        log(`[MOVE-FOCUS]: Window focused (${current_window_id} -> ${target_window.get_id()})`);
        var ts = display.get_current_time();
        target_window.activate(ts);
        target_window.raise();
    }

    handler_move_to_workspace_up(display) {
        return this.handler_move_to_workspace(display, true);
    }
    handler_move_to_workspace_down(display) {
        return this.handler_move_to_workspace(display, false);
    }
    handler_move_to_workspace(display, direction_is_up) {
        log(`[MOVE-FOCUS]: move-to-workspace`);
        var window = display.get_focus_window();
        if (window === null) {
            log(`[MOVE-FOCUS]: Can't move window - no window focused`);
            return
        }
        var wm = display.get_workspace_manager();
        var ts = display.get_current_time();
        var current_wspc_idx = wm.get_active_workspace_index();

        var direction = 1;
        if (direction_is_up) {
            direction = -1;
        }
        var target_wspc_idx = current_wspc_idx + direction;
        var target_wspc = wm.get_workspace_by_index(target_wspc_idx);
        if (target_wspc_idx === -1) {
            log(`[MOVE-FOCUS]: No workspace with index -1 - creating`);
            target_wspc = this.insert_new_workspace(wm, 0);
        }

        window.change_workspace(target_wspc);
        target_wspc.activate_with_focus(window, ts);
        // TODO: activate window ?
    }

    enable() {
        log(`[MOVE-FOCUS]: enabling`);
        Main.wm.addKeybinding(
            "move-focus-left",
            Settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this.handler_move_focus_left.bind(this)
        );
        Main.wm.addKeybinding(
            "move-focus-right",
            Settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this.handler_move_focus_right.bind(this)
        );
        Main.wm.addKeybinding(
            "switch-to-new-workspace-down",
            Settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this.handler_insert_new_workspace_down.bind(this)
        );
        Main.wm.addKeybinding(
            "move-to-new-workspace-down",
            Settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this.handler_move_to_new_workspace_down.bind(this)
        );
        Main.wm.addKeybinding(
            "move-to-workspace-up-anywhere",
            Settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this.handler_move_to_workspace_up.bind(this)
        );
        Main.wm.addKeybinding(
            "move-to-workspace-down-anywhere",
            Settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this.handler_move_to_workspace_down.bind(this)
        );
    }

    disable() {
        log(`[MOVE-FOCUS]: disabling`);
        Main.wm.removeKeybinding("move-focus-left");
        Main.wm.removeKeybinding("move-focus-right");
        Main.wm.removeKeybinding("switch-to-new-workspace-down");
        Main.wm.removeKeybinding("move-to-new-workspace-down");
        Main.wm.removeKeybinding("move-to-workspace-up-anywhere");
        Main.wm.removeKeybinding("move-to-workspace-down-anywhere");
    }
}

function init() {
    return new MoveFocusExtension();
}
