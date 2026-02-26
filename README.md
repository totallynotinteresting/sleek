# sleek

minimalist client mod for slack (basically vencord, slack edition)

i was meaning to make this quite a long time ago but i never got around to it

so far it SHOULD work on macos and linux, i don't plan to do windows in any form for multiple reasons:

a) i don't like microsoft and i don't want to support their products
b) i don't have a windows machine to test on

simple :)

you're more than welcome to open a pull request if you want to add windows support

also don't hate on the crude way im doing it ok

also themes dont really work atm, im trying to fix that

#### quick start

```bash
# 1. clone it
git clone https://github.com/totallynotinteresting/sleek.git
cd sleek

# 2. install deps
npm install

# 3. patch slack (make sure slack is closed first)
npm run patch

# 4. open slack like normal since sleek is injected automatically
# or use the dev shortcut which patches and launches with logging (macos only, hardcoded to Downloads folder because i was lazy):
npm run dev
```

thats it. every time slack updates you'll need to re-run `npm run patch`
i'll add an auto updater sometime soon too, im just kinda lazy

#### plugins

plugins live in plugins/ and get auto loaded.
heres whats included:

| plugin            | description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| **reply**         | adds a reply button to messages that inserts an invisible quote link |
| **msg log**       | keeps deleted messages visible + shows edit history                  |
| **silent typing** | hides your typing indicator from others                              |
| **no-track**      | blocks slacks telemetry/analytics requests                           |
| **pesky logs**    | silences slack's internal console spam                               |
| **view raw**      | click the context button on a message to see raw json                |
| **perf launch**   | makes slack load quicker by disabling various endpoints on startup   |

to make your own plugin check out plugins/demo.js for a simple example

on macos you can install a plugin by naviagting to ~/Library/Application Support/Slack/plugins and copying the plugin to this folder

on linux you can install a plugin by naviagting to ~/.config/Slack/plugins and copying the plugin to this folder

i'll be making more plugins soon and probably a marketplace to view/install them
