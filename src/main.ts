import { LitElement, html, css, property } from "lit-element";

import { getController } from "./controllers/get-controller";
import { Controller, ControllerConfig } from "./controllers/controller";
import pjson from "../package.json";

class SliderEntityRow extends LitElement {
  _config: ControllerConfig;
  ctrl: Controller;
  hide_slider;

  @property() hass: any;
  @property() hide_state: boolean;

  setConfig(config: ControllerConfig) {
    this._config = config;
    if (!config.entity) throw new Error(`No entity specified.`);
    const domain = config.entity.split(".")[0];
    const ctrlClass = getController(domain);
    if (!ctrlClass) throw new Error(`Unsupported entity type: ${domain}`);
    this.ctrl = new ctrlClass(config);
  }

  async resized() {
    await this.updateComplete;
    if (!this.shadowRoot) return;
    this.hide_state = this._config.full_row
      ? this.parentElement.clientWidth <= 180
      : this.parentElement.clientWidth <= 335;
    return;
  }

  async firstUpdated() {
    await this.resized();
  }

  render() {
    const c = this.ctrl;
    c.hass = this.hass;
    if (!c.stateObj)
      return html`
        <hui-warning>
          ${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}
        </hui-warning>
      `;

    const dir = this.hass.translationMetadata.translations[
      this.hass.language || "en"
    ].isRTL
      ? "rtl"
      : "ltr";

    if (this._config.entity.startsWith('cover.window_') && c.stateObj.state === 'open') {
      localStorage.setItem(this._config.entity, c.stateObj.state);
    } else {
      localStorage.removeItem(this._config.entity);
    }

    if (this._config.entity.startsWith('cover.shutter_')) {
      const id = this._config.entity.split('_').pop();
      this.hide_slider = !!localStorage.getItem('cover.window_' + id);
    }

    // All shutters (group)
    if (this._config.entity.startsWith('cover.roof_shutters')) {
      this.hide_slider = this.checkIfLocalStorageKeyStartsWith('cover.window_');
    }

    const showSlider =
      c.stateObj.state !== "unavailable" &&
      c.hasSlider &&
      !(c.isOff && this._config.hide_when_off)
      && !this.hide_slider;
    const showToggle = this._config.toggle && c.hasToggle;
    const showValue = showToggle
      ? false
      : this._config.hide_state === false
      ? true
      : this._config.hide_state || this.hide_state
      ? false
      : c.isOff && this._config.hide_when_off
      ? false
      : true;

    const content = html`
      <div class="wrapper" @click=${(ev) => ev.stopPropagation()}>
        ${showSlider
          ? html`
              <ha-slider
                .min=${c.min}
                .max=${c.max}
                .step=${c.step}
                .value=${c.value}
                .dir=${dir}
                pin
                @change=${(ev) =>
                  (c.value = (this.shadowRoot.querySelector(
                    "ha-slider"
                  ) as any).value)}
                class=${this._config.full_row || this._config.grow
                  ? "full"
                  : ""}
                ignore-bar-touch
              ></ha-slider>
            `
          : ""}
        ${showToggle ? c.renderToggle(this.hass) : ""}
        ${showValue
          ? html`<span class="state">
              ${c.stateObj.state === "unavailable"
                ? this.hass.localize("state.default.unavailable")
                : c.string}
            </span>`
          : ""}
      </div>
    `;

    if (this._config.full_row)
      if (this._config.hide_when_off && c.isOff) return html``;
      else return content;

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${content}
      </hui-generic-entity-row>
    `;
  }

  checkIfLocalStorageKeyStartsWith(search) {
    const values = Object.keys(localStorage)
        .filter((key) => key.startsWith(search) )
        .map((key) => localStorage[key] );

    return !!values.length;
  }

  static get styles() {
    return css`
      .wrapper {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex: 100;
        height: 40px;
      }
      .state {
        min-width: 45px;
        text-align: end;
        margin-left: 5px;
      }
      ha-entity-toggle {
        min-width: auto;
        margin-left: 8px;
      }
      ha-slider {
        width: 100%;
        min-width: 100px;
      }
      ha-slider:not(.full) {
        max-width: 200px;
      }
    `;
  }
}

if (!customElements.get("slider-entity-row")) {
  customElements.define("slider-entity-row", SliderEntityRow);
  console.info(
    `%cSLIDER-ENTITY-ROW ${pjson.version} IS INSTALLED`,
    "color: green; font-weight: bold",
    ""
  );
}
