class IntercomCard extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._destination = "";
        this._error = "";
        this._intercoms = [];
        this._myId = localStorage['lovelace-player-device-id'];
        this._myName = "";
        this._options = [];
        this._size = 1;
    }

    set hass(hass) {
        if (!this._hass) {
            this._hass = hass;
            if ( this._hass.config.components.indexOf("browser_mod") < 0) {
                this._error = "browser_mod";
            }

            this._createCard();
            this._initRecordings();

            if (!('attributes') in hass.states['input_select.' + this.config.selector_name]) {
                throw new Error(`input_select "${this.config_selector_name}" not found`);
            }

            if (this._responder) {
                this._intercoms = [`${this.config["response_to"]}:Reply`];
                this._updateButtons();
                // Close pop up after a delay
                window.setTimeout(() => this._closeSelfPopUp(), this._auto_respond_delay * 1000);
            } else {
                this._updateIntercoms(hass.states['input_select.' + this.config.selector_name]['attributes']['options']);
            }
        } else if (!this._responder) {
            // Update buttons if the options change
            this._updateIntercoms(hass.states['input_select.' + this.config.selector_name]['attributes']['options']);
        };
    }

    getCardSize() {
        return this._intercoms.length + 1;
    }

    setConfig(config) {
        if (!config.selector_name) {
            throw new Error("You need to define selector_name");
        }

        if (config._auto_respond_delay) {
            if (parseInt(config._auto_respond_delay) == NaN ) {
                throw new Error("popup_timeout should be an integer (number of seconds)");
            }
            this._auto_respond_delay = parseInt(config._auto_respond_delay);
        } else {
            this._auto_respond_delay = 45;
        }

        this._browser_mod_prefix = config.browser_mod_prefix ? config.browser_mod_prefix : "";

        this.config = config;
        const root = this.shadowRoot;
        if (root.lastChild) root.removeChild(root.lastChild);
        this._responder = "response_to" in config;
        this._order_by = config["order_by"] || "name";
    }

    _closeSelfPopUp() {
        this._hass.callService('browser_mod', 'close_popup', {
            deviceID: this._myId,
        });
    }

    _createCard() {
        const root = this.shadowRoot;
        const card = document.createElement('ha-card');
        const content = document.createElement('div');
        const style = document.createElement('style');
        style.textContent = `
            .button { overflow: auto; padding: 16px; }
            input { font-size: 24px; }
            mwc-button { margin-right: 16px; }
            #error > div { padding: 16px; font-size: 24px; color: rgb(223,76,30); }
            #footer > div { padding-top: 4px; padding-left: 16px; font-size: 12px; font-weight: 200; }
            #registration > div { display: inline-flex; padding: 16px; }
            #title > div { padding: 16px; font-size: 24px; font-weight: 400; }
            `;
        content.innerHTML = `
        <span id='title'></span>
        <span id='error'></span>
        <span id='registration'></span>
        <span class='button' id='buttons'>
            <div id='intercoms'></div>
        </span>
        <span id='footer'></dispanv>
        `;
        card.appendChild(content);
        card.appendChild(style);
        root.appendChild(card);
    }

    _updateCard() {
        let self = this;
        if (this._error == "browser_mod") {
            this._getElementById('error').innerHTML = `<div>Required integration <a href="https://github.com/thomasloven/hass-browser_mod">browser_mod</a> not found</div>`;
            this._getElementById('registration').style.display = 'none';
            this._getElementById('buttons').style.display = 'none';
            this._getElementById('footer').innerHTML = "";
        } else if (this._myName != "") {
            this._getElementById('title').innerHTML = `<div>Intercom calls from ${this._myName}</div>`;
            this._getElementById('registration').style.display = 'none';
            this._getElementById('buttons').style.display = 'inline-flex';
            this._getElementById('footer').innerHTML = `<div id="deregister">Remove from intercom</div>`;
            this._getElementById('deregister').onclick = function() {
                self._deregister()
            }
        } else {
            this._getElementById('title').innerHTML = "<div>Intercom";
            this._getElementById('registration').innerHTML = "<div><input id='endpoint'></input><mwc-button id='register'>Register!</mwc-button></span>";
            this._getElementById('registration').style.display = 'inline-flex';
            this._getElementById('buttons').style.display = 'none';
            this._getElementById('footer').innerHTML = "";
            this._getElementById('register').onclick = function() {
                self._register(self._getElementById('endpoint').value)
            }
        }
    }

    _getElementById(id) {
        return this.shadowRoot.querySelector(`#${id}`);
    }

    _getElementsByClassName(name) {
        return this.shadowRoot.querySelectorAll(`.${name}`);
    }

    // Show "stop" button when recording is in process
    _swapButtons(recording) {
        if (recording) {
            for (const elem of this._getElementsByClassName("destination")) {
                elem.style.display = 'none';
            }
            this._getElementById('stop').style.display = 'inline-flex';
        } else {
            for (const elem of this._getElementsByClassName("destination")) {
                elem.style.display = 'inline-flex';
            }
            this._getElementById('stop').style.display = 'none';
        }
    }

    _updateIntercoms(options) {
        function arrayEquals(a, b) {
            return Array.isArray(a) &&
              Array.isArray(b) &&
              a.length === b.length &&
              a.every((val, index) => val === b[index]);
        }

        let newList = [];
        let newOpts = options;
        // Sort by name
        newOpts.sort(function(x,y){
            var xp = x.substr(18);
            var yp = y.substr(18);
            return xp == yp ? 0 : xp < yp ? -1 : 1;
        });

        for (const elem of newOpts) {
            let parts = elem.split(':');

            if (parts[0] != this._myId) {
                newList.push(elem);
            } else {
                this._myName = parts[1];
            }
        };

        if (newOpts.length != this._options.length || !arrayEquals(this._intercoms, newList)) {
            this._intercoms = newList;
            this._options = newOpts;
            this._updateButtons();
            this._updateCard();
        };
    }

    _updateButtons() {
        let buttons = "<mwc-button class='stop' style='display:none' raised id='stop'>Stop</mwc-button>"
        let ids = [];
        let self = this;
        for (const elem of this._intercoms) {
            let parts = elem.split(':');
            // IDs must start with a letter
            buttons += '<mwc-button class="destination" raised id="Z' + parts[0] + '">' + parts[1] + '</mwc-button>';
            ids.push(`Z${parts[0]}`);
        };
        this._getElementById('intercoms').innerHTML = buttons;

        this._getElementById('stop').onclick = function() {
            self.mediaRecorder.stop();
            self._swapButtons(false);
        }

        for (let id of ids) {
            let btn = this._getElementById(id);
            btn.onclick = function() {
                self._destination = id.substring(1);
                self.mediaRecorder.start();
                self._swapButtons(true);
            }
        };
    }

    // Register this dashboard with intercom
    _register(name) {
        let options = [...this._options];
        options.push(`${this._myId}:${name}`);
        options.sort(function(x,y){
            var xp = x.substr(18);
            var yp = y.substr(18);
            return xp == yp ? 0 : xp < yp ? -1 : 1;
        });

        this._hass.callService('input_select', 'set_options', {
            entity_id: `input_select.${this.config.selector_name}`,
            options: options
        });
    }

    // Deegister this dashboard with intercom
    _deregister() {
        const idx = this._options.findIndex(e => {
            if (e.includes(this._myId)) {
                return true;
            }
        })
        this._options.splice(idx, 1);

        this._hass.callService('input_select', 'set_options', {
            entity_id: `input_select.${this.config.selector_name}`,
            options: this._options
        });

        this._intercoms = [];
        this._myName = "";
        this._updateCard();
        this._updateButtons();
    }

    _handlerFunction(stream) {
        let self = this;
        let options = {};
        this.mediaRecorder = new MediaRecorder(stream, options);
        let chunks = [];

        this.mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
        }

        this.mediaRecorder.onstop = function(e) {
            const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
            chunks = [];

            var reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
                self._sendAudio(reader.result);
            }
        }
    }

    _initRecordings() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(stream => { this._handlerFunction(stream) })
                .catch(function(err) {
                    console.log("The following error occurred initializing intercom (getUserMedia)" + err);
                })
        } else {
            console.log("Intercom is not supported by this browser (lacking getUserMedia)");
        }
    }

    _sendAudio(content) {
        this._hass.callService('browser_mod', 'popup', {
            deviceID: this._destination,
            title: 'Intercom',
            card: {
                type: 'custom:intercom-card',
                response_to: this._myId,
                auto_respond_delay: this._auto_respond_delay,
                selector_name: this.config.selector_name,
                browser_mod_prefix: this._browser_mod_prefix
            }
        });

        let entity_id = `media_player.${this._browser_mod_prefix}${this._destination.replace(/-/g, '_')}`;
        console.log("Sending intercom audio to " + entity_id)
        this._hass.callService('media_player', 'play_media', {
            entity_id: entity_id,
            media_content_type: 'music',
            media_content_id: content
        });

        if (this._responder) {
            // Add a bit of a delay for user experience
            window.setTimeout(() => this._closeSelfPopUp(), 1000);
        }

        this._destination = "";
    }
}

customElements.define('intercom-card', IntercomCard);
