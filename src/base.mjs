import { definePropertiesFromOptions, optionJSON } from "./util.mjs";

/**
 * Base
 * @param {string} name meter name
 * @param {Object} options
 * @param {string} options.description
 * @param {string} options.unit physical unit like kWh or m3
 *
 * @property {string} name category name
 * @property {string} description
 * @property {string} unit physical unit
 */
export class Base {
  static get attributes() {
    return {
      /**
       * the description of the content.
       * @return {string}
       */
      description: { type: "string" },

      /**
       * physical unit.
       * @return {string}
       */
      unit: { type: "string" },

      fractionalDigits: { type: "number", default: 2 }
    };
  }

  /**
   * Get instances
   * @param {levelup} db
   * @param {string} gte lowest name
   * @param {string} lte highst name
   * @return {AsyncIterator<Base>}
   */
  static async *entries(db, prefix, gte = "\u0000", lte = "\uFFFF") {
    for await (const data of db.createReadStream({
      gte: prefix + gte,
      lte: prefix + lte
    })) {
      const name = data.key.toString().slice(prefix.length);
      yield new this(name, JSON.parse(data.value.toString()));
    }
  }

  constructor(name, options) {
    definePropertiesFromOptions(this, options, {
      name: { value: name }
    });
  }

  toString() {
    return `${this.name}: ${this.unit}`;
  }

  toJSON() {
    return optionJSON(this, {
      name: this.name
    });
  }

  /**
   * @param {levelup} db
   */
  async write(db, key) {
    const values = {};

    for (const a in this.constructor.attributes) {
      if (this[a] !== undefined) {
        values[a] = this[a];
      }
    }

    return db.put(key, JSON.stringify(values));
  }

  async writeAsText(out, name) {
    await out.write(`[${name}]\n`);

    for (const o of Object.keys(this.constructor.attributes)) {
      const v = this[o];
      if (v !== undefined) {
        await out.write(`${o}=${v}\n`);
      }
    }
    await out.write("\n");
  }
}
