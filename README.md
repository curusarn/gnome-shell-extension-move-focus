# gnome-shell-extension-move-focus
GNOME Shell Extension: Move focus

## Install

Disclaimer: I wrote this for myself and I'm only sharing this because someone else might find it useful. I don't really plan to do a lot of maintanance on this. You are welcome to fork this.
Disclaimer2: Afaik this will only work with X11 not Wayland.

1. Clone this repo

2. `cp gnome-shell-extension-move-focus ${XDG_DATA_HOME:-~/.local/share}/gnome-shell/extensions/movefocus@simonlet.cz`   

3. Restart GNOME shell: Press `Alt+F2`, `r`, `Enter`

4. Enable the extension: `gnome-extension enable movefocus@simonlet.cz`

5. Take a look at keybindings and configure them: `cd gnome-shell-extension-move-focus`, `cat Makefile`, `make gsettings` 

