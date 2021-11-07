# Intercom

A Home Assistant intercom system intended for communicating between dashboards installed in different locations.

Intercom works by leveraging `MediaRecorder` to record using the device's microphone and sending the recording through Home Assistant to be played on the target device.

## Dependencies

Intercom leverages `media_player.play_media` within the browser provided by the [browser_mod](https://github.com/thomasloven/hass-browser_mod) integration by thomasloven. Make sure that is installed and configured prior installing this add-on.

## Install

### input_select

Intercom utilizes an `input_select` entity to keep track of available intercom destinations. This needs to be created in your Home Assistant configuration, and needs to be initialized with a node because HA doesn't seem to create the entity if options are blank. If you know of a way to not require this, please let me know.

If you are unsure how to get the browser_mod ID, see the instructions [here](https://github.com/thomasloven/hass-browser_mod#browser-player-card).

Entity creation:

```yaml
input_select:
  intercoms:
    name: Intercoms
    options:
      - <ENTITY_ID>:<LABEL>
```

For example:

```yaml
input_select:
  intercoms:
    name: Intercoms
    options:
      - af2eafee-15ec14fd:Kitchen
```

### Add the JS

Currently this is not packaged in any way, you will need to copy the JS manually. Packing coming some day!

These instructions you have some knowledge installing HA resources manually

- Create a directory to install `intercom.js` -- these instructions assume `config/www/community/intercom` and put the JS file there
- Add the lovelace resource - (Configuration / Lovelace Dashboards / Resources / Add Resource).
  - `URL`: `/hacsfiles/intercom/intercom.js?v=0.1.0` (The query param at the end is for cache busting)
  - `Resource Type`: `JavaScript Module`
  - NOTE: When updating, copy in the new JS file and bump the query param noted above

### Add the card

To add the card to your dashboard, you will need to manually add the card at this point.

Configuration:

- `selector_name`: the name of the `input_select` entity from above (required)
- `browser_mod_prefix`: If you have configured `browser_mod.prefix` set this (optional)

```yaml
type: custom:intercom-card
title: null
selector_name: intercoms
browser_mod_prefix: browser_mod_
```

## Known bugs / TODO

- Only tested on Chrome
- Reply pop-up takes up entire screen
- Set up for HACS
- I assume my JS is terrible, feedback is greatly appreciated
- I assume my HTML and CSS is terrible, feedback is greatly appreciated
