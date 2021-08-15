
all:
	####### restart #######
	make restart
	
	###### gsettings ######
	make gsettings

restart:
	glib-compile-schemas schemas
	restart-gnome-shell

schema_mf := schemas
gsettings:
	gsettings --schemadir ${schema_mf} set org.gnome.shell.extensions.movefocus move-focus-left "['<Super>h']"
	gsettings --schemadir ${schema_mf} set org.gnome.shell.extensions.movefocus move-focus-right "['<Super>l']"
	gsettings --schemadir ${schema_mf} set org.gnome.shell.extensions.movefocus switch-to-new-workspace-down "['<Super>n']"
	gsettings --schemadir ${schema_mf} set org.gnome.shell.extensions.movefocus move-to-new-workspace-down "['<Super><Shift>n']"
	gsettings --schemadir ${schema_mf} set org.gnome.shell.extensions.movefocus move-to-workspace-up-anywhere "['<Super><Shift>k']"
	gsettings --schemadir ${schema_mf} set org.gnome.shell.extensions.movefocus move-to-workspace-down-anywhere "['<Super><Shift>j']"
	#"['<Super><Shift>k', '<Super><Shift>up']"
	#"['<Super><Shift>j', '<Super><Shift>down']"