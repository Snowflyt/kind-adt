/**
 * Generate constructors and match functions for an ADT.
 * @param {Array<string>} [variants] The variants of the ADT. If not provided, a proxy object will
 * be returned.
 * @returns {*}
 */
export function make(variants) {
  /* Guard */
  const createGuard = (tag) => renameFunction((adt) => adt._tag === tag, `is${tag}`);

  /* Conditional deconstructor */
  const createConditionalDeconstructor = (tag) =>
    renameFunction((adt, onMatch, otherwise) => {
      if (adt._tag === tag) return onMatch(...unwrap(adt));
      if (otherwise) return otherwise(adt);
    }, `if${tag}`);

  /* Deconstructor */
  const createDeconstructor = (tag) =>
    renameFunction((adt) => {
      if (adt == null || adt._tag !== tag)
        throw new TypeError(`Expected \`${tag}(...)\`, but got \`${stringify(adt)}\``);
      return unwrap(adt);
    }, `unwrap${tag}`);

  /* Constructor */
  const createConstructor = (tag) =>
    Object.setPrototypeOf(
      Object.assign(
        renameFunction((...args) => {
          const result = Object.create(ADTProto);
          result._tag = tag;
          for (let i = 0; i < args.length; i++) result["_" + i] = args[i];
          return result;
        }, tag),
        { _tag: tag },
      ),
      ADTConstructorProto,
    );

  const result = {
    unwrap:
      variants ?
        function unwrap(adt) {
          if (adt == null || variants.indexOf(adt._tag) === -1)
            throw new TypeError(
              `Expected ${variants.map((tag) => "`" + tag + "(...)`").join("/")}, but got \`${stringify(adt)}\``,
            );
          const result = [];
          for (const key in adt)
            if (Object.prototype.hasOwnProperty.call(adt, key))
              if (key.startsWith("_") && !isNaN(Number(key.slice(1))))
                // eslint-disable-next-line sonarjs/no-associative-arrays
                result[key.slice(1)] = adt[key];
          return result;
        }
      : unwrap,

    match:
      variants ?
        function match(adt, cases) {
          if (!cases) {
            const cases = adt;
            return function match(adt) {
              if (adt == null || variants.indexOf(adt._tag) === -1)
                throw new TypeError(
                  `Expected ${variants.map((tag) => "`" + tag + "(...)`").join("/")}, but got \`${stringify(adt)}\``,
                );
              return _match(adt, cases);
            };
          }
          if (adt == null || variants.indexOf(adt._tag) === -1)
            throw new TypeError(
              `Expected ${variants.map((tag) => "`" + tag + "(...)`").join("/")}, but got \`${stringify(adt)}\``,
            );
          return _match(adt, cases);
        }
      : function match(adt, cases) {
          if (!cases) {
            const cases = adt;
            return function match(adt) {
              return _match(adt, cases);
            };
          }
          return _match(adt, cases);
        },
    matchW:
      variants ?
        function matchW(adt, cases) {
          if (!cases) {
            const cases = adt;
            return function matchW(adt) {
              if (adt == null || variants.indexOf(adt._tag) === -1)
                throw new TypeError(
                  `Expected ${variants.map((tag) => "`" + tag + "(...)`").join("/")}, but got \`${stringify(adt)}\``,
                );
              return _match(adt, cases);
            };
          }
          if (adt == null || variants.indexOf(adt._tag) === -1)
            throw new TypeError(
              `Expected ${variants.map((tag) => "`" + tag + "(...)`").join("/")}, but got \`${stringify(adt)}\``,
            );
          return _match(adt, cases);
        }
      : function matchW(adt, cases) {
          if (!cases) {
            const cases = adt;
            return function matchW(adt) {
              return _match(adt, cases);
            };
          }
          return _match(adt, cases);
        },
  };

  if (!variants)
    return new Proxy(result, {
      get(target, prop, receiver) {
        if (typeof prop !== "string" || prop in target) return Reflect.get(target, prop, receiver);

        /* Guard */
        if (matchesPrefix(prop, "is")) {
          const tag = prop.slice(2);
          return createGuard(tag);
        }

        /* Conditional deconstructor */
        if (matchesPrefix(prop, "if")) {
          const tag = prop.slice(2);
          return createConditionalDeconstructor(tag);
        }

        /* Deconstructor */
        if (matchesPrefix(prop, "unwrap")) {
          const tag = prop.slice(6);
          return createDeconstructor(tag);
        }

        /* Constructor */
        return createConstructor(prop);
      },
    });

  for (const tag of variants) {
    /* Constructor */
    result[tag] = createConstructor(tag);

    /* Guard */
    result[`is${tag}`] = createGuard(tag);

    /* Conditional deconstructor */
    result[`if${tag}`] = createConditionalDeconstructor(tag);

    /* Deconstructor */
    result[`unwrap${tag}`] = createDeconstructor(tag);
  }

  return result;
}

/**
 * Extract the fields of an ADT.
 * @param {*} adt The ADT to unwrap.
 * @returns {Array}
 */
export function unwrap(adt) {
  const result = [];
  for (const key in adt)
    if (Object.prototype.hasOwnProperty.call(adt, key))
      if (key.startsWith("_") && !isNaN(Number(key.slice(1))))
        // eslint-disable-next-line sonarjs/no-associative-arrays
        result[key.slice(1)] = adt[key];
  return result;
}

/**
 * Match an ADT with the provided cases.
 * @private
 *
 * @param {*} adt The ADT to match.
 * @param {Object<string, Function>} cases The cases to match.
 * @returns {*}
 */
const _match = (adt, cases) => {
  if (adt != null && cases[adt._tag]) return cases[adt._tag](...unwrap(adt));
  if (cases._) return cases._(adt);
  throw new Error(
    `No case found for \`${stringify(adt)}\`. Consider adding a catch-all case (\`_\`) if needed`,
  );
};

/*********************
 * Utility functions *
 *********************/
/**
 * Check if a name matches a prefix.
 *
 * A prefix is a string that is at the beginning of another string followed by a capital letter.
 * @private
 *
 * @param {string} str The name to check.
 * @param {string} prefix The prefix to match.
 * @returns {boolean}
 *
 * @example
 * ```javascript
 * matchesPrefix("isFoo", "is"); // => true
 * matchesPrefix("isfoo", "is"); // => false
 * matchesPrefix("is", "is"); // => false
 * matchesPrefix("is你好", "is"); // => true
 * ```
 */
const matchesPrefix = (str, prefix) =>
  str.startsWith(prefix) &&
  str.length > prefix.length &&
  str[prefix.length] === str[prefix.length].toUpperCase();

/****************************
 * Common utility functions *
 ****************************/
/**
 * Change the name of a function for better debugging experience.
 * @private
 *
 * @template {Function} F
 * @param {F} fn The function to rename.
 * @param {string} name The new name of the function.
 * @returns {F}
 */
function renameFunction(fn, name) {
  return Object.defineProperty(fn, "name", {
    value: name,
    configurable: true,
  });
}

/**
 * Stringify a value to provide better debugging experience, handling common cases that simple
 * `JSON.stringify` does not handle, e.g., `undefined`, `bigint`, `function`, `symbol`, `Date`.
 * Circular references are considered.
 *
 * This is a simple port of the [showify](https://github.com/Snowflyt/showify/blob/7759b8778d54f686c85eba4d88b2dac2afdbcdd6/packages/lite/src/index.ts)
 * package, which is a library for stringifying objects in a human-readable way.
 * @param {*} value The object to stringify.
 * @returns {string}
 */
const stringify = (value) => {
  const identifierRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  const serialize = (value, /** @type {Array} */ ancestors) => {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "function")
      return value.name ? `[Function: ${value.name}]` : "[Function (anonymous)]";
    if (typeof value === "symbol") return value.toString();
    if (value === undefined) return "undefined";
    if (value === null) return "null";

    if (typeof value === "object") {
      if (ancestors.indexOf(value) !== -1) return "[Circular]";
      const nextAncestors = ancestors.concat([value]);

      // Handle special object types
      if (value instanceof Date) return value.toISOString();

      if (value instanceof RegExp) return value.toString();

      if (value instanceof Map) {
        const entries = Array.from(value.entries())
          .map(([k, v]) => `${serialize(k, nextAncestors)} => ${serialize(v, nextAncestors)}`)
          .join(", ");
        return `Map(${value.size}) ` + (entries ? `{ ${entries} }` : "{}");
      }

      if (value instanceof Set) {
        const values = Array.from(value)
          .map((v) => serialize(v, nextAncestors))
          .join(", ");
        return `Set(${value.size}) ` + (values ? `{ ${values} }` : "{}");
      }

      // Handle arrays and objects
      const isClassInstance =
        value.constructor && value.constructor.name && value.constructor.name !== "Object";
      const className = isClassInstance ? value.constructor.name : "";

      if (Array.isArray(value)) {
        const arrayItems = value.map((item) => serialize(item, nextAncestors)).join(", ");
        let result = `[${arrayItems}]`;
        if (className !== "Array") result = `${className}(${value.length}) ${result}`;
        return result;
      }

      const objectEntries = Reflect.ownKeys(value)
        .map((key) => {
          const keyDisplay =
            typeof key === "symbol" ? key.toString()
            : identifierRegex.test(key) ? key
            : JSON.stringify(key);
          const val = value[key];
          return `${keyDisplay}: ${serialize(val, nextAncestors)}`;
        })
        .join(", ");

      return (className ? `${className} ` : "") + (objectEntries ? `{ ${objectEntries} }` : "{}");
    }

    return JSON.stringify(value);
  };

  return serialize(value, []);
};

/**
 * Custom inspect function for ADT to interact with the
 * [showify](https://github.com/Snowflyt/showify) package.
 * @returns
 */
function inspect({ ancestors, c, level, trailingComma }, expand) {
  const fields = unwrap(this);
  const fieldKeys = fields.map((_, i) => "_" + i);

  let body = expand(this, {
    level,
    omittedKeys: new Set([
      "_tag",
      ...fieldKeys,
      "toJSON",
      Symbol.for("nodejs.util.inspect.custom"),
      Symbol.for("showify.inspect.custom"),
    ]),
    ancestors,
  });
  if (
    body.type === "sequence" &&
    body.values[0].type === "text" &&
    body.values[0].value.startsWith("[Function")
  ) {
    body.values[2].ref = body.ref;
    body = body.values[2];
  }
  if (
    body.type === "sequence" &&
    body.values.length === 3 &&
    body.values[0].type === "text" &&
    body.values[1].value === " "
  )
    // Omit class name for class instance
    body = body.values[2];

  let shouldCollapse = false;
  let firstFieldNode;
  if (fields.length === 1) {
    firstFieldNode = expand(fields[0]);
    shouldCollapse =
      (firstFieldNode.type === "between" &&
        !(
          firstFieldNode.values[0].type === "text" &&
          firstFieldNode.values[0].value.indexOf("\n") !== -1
        )) ||
      (firstFieldNode.type === "variant" &&
        firstFieldNode.inline.type === "between" &&
        !(
          firstFieldNode.inline.values[0].type === "text" &&
          firstFieldNode.inline.values[0].value.indexOf("\n") !== -1
        ) &&
        firstFieldNode.wrap.type === "between" &&
        !(
          firstFieldNode.wrap.values[0].type === "text" &&
          firstFieldNode.wrap.values[0].value.indexOf("\n") !== -1
        )) ||
      (firstFieldNode.type === "sequence" &&
        !(
          firstFieldNode.values[0].type === "text" &&
          firstFieldNode.values[0].value.indexOf("\n") !== -1
        ) &&
        firstFieldNode.values.slice(0, -1).every((v) => v.type === "text") &&
        firstFieldNode.values[firstFieldNode.values.length - 1].type === "between") ||
      (firstFieldNode.type === "sequence" &&
        !(
          firstFieldNode.values[0].type === "text" &&
          firstFieldNode.values[0].value.indexOf("\n") !== -1
        ) &&
        firstFieldNode.values.slice(0, -1).every((v) => v.type === "text") &&
        firstFieldNode.values[firstFieldNode.values.length - 1].type === "variant" &&
        firstFieldNode.values[firstFieldNode.values.length - 1].inline.type === "between" &&
        !(
          firstFieldNode.values[firstFieldNode.values.length - 1].inline.values[0].type ===
            "text" &&
          firstFieldNode.values[firstFieldNode.values.length - 1].inline.values[0].value.indexOf(
            "\n",
          ) !== -1
        ) &&
        firstFieldNode.values[firstFieldNode.values.length - 1].wrap.type === "between" &&
        !(
          firstFieldNode.values[firstFieldNode.values.length - 1].wrap.values[0].type === "text" &&
          firstFieldNode.values[firstFieldNode.values.length - 1].wrap.values[0].value.indexOf(
            "\n",
          ) !== -1
        ));
  }

  return (
    fields.length ?
      {
        type: "variant",
        inline: {
          type: "sequence",
          values: [
            { type: "text", value: c.cyan(this._tag) + "(" },
            ...fields
              .map((field, i, arr) =>
                i !== arr.length - 1 ? [expand(field), { type: "text", value: ", " }]
                : trailingComma === "always" ? [expand(field), { type: "text", value: "," }]
                : [expand(field)],
              )
              .reduce((acc, val) => acc.concat(val), []),
            ...(body.type === "text" ?
              [{ type: "text", value: ")" }]
            : [{ type: "text", value: ") " }, body]),
          ],
        },
        wrap:
          body.type === "text" ?
            shouldCollapse ?
              {
                type: "sequence",
                values: [
                  { type: "text", value: c.cyan(this._tag) + "(" },
                  firstFieldNode,
                  { type: "text", value: ")" },
                ],
              }
            : {
                type: "between",
                values: fields.map((field, i, arr) =>
                  trailingComma !== "none" || i !== arr.length - 1 ?
                    { type: "sequence", values: [expand(field), { type: "text", value: "," }] }
                  : expand(field),
                ),
                open: { type: "text", value: c.cyan(this._tag) + "(" },
                close: { type: "text", value: ")" },
              }
          : {
              type: "sequence",
              values: [
                shouldCollapse ?
                  {
                    type: "sequence",
                    values: [
                      { type: "text", value: c.cyan(this._tag) + "(" },
                      firstFieldNode,
                      { type: "text", value: ") " },
                    ],
                  }
                : {
                    type: "between",
                    values: fields.map((field, i, arr) =>
                      trailingComma !== "none" || i !== arr.length - 1 ?
                        { type: "sequence", values: [expand(field), { type: "text", value: "," }] }
                      : expand(field),
                    ),
                    open: { type: "text", value: c.cyan(this._tag) + "(" },
                    close: { type: "text", value: ") " },
                  },
                body,
              ],
            },
      }
    : body.type === "text" ? { type: "text", value: c.cyan(this._tag) }
    : { type: "sequence", values: [{ type: "text", value: c.cyan(this._tag) + " " }, body] }
  );
}

export const PipeableProto = {
  pipe(...fs) {
    // Optimization inspired by Effect
    // https://github.com/Effect-TS/effect/blob/f293e97ab2a26f45586de106b85119c5d98ab4c7/packages/effect/src/Pipeable.ts#L491-L524
    switch (fs.length) {
      case 0:
        return this;
      case 1:
        return fs[0](this);
      case 2:
        return fs[1](fs[0](this));
      case 3:
        return fs[2](fs[1](fs[0](this)));
      case 4:
        return fs[3](fs[2](fs[1](fs[0](this))));
      case 5:
        return fs[4](fs[3](fs[2](fs[1](fs[0](this)))));
      case 6:
        return fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](this))))));
      case 7:
        return fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](this)))))));
      case 8:
        return fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](this))))))));
      case 9:
        return fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](this)))))))));
      default: {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let result = this;
        for (const f of fs) result = f(result);
        return result;
      }
    }
  },
};

/** @type {*} */
export const Pipeable = /* @__PURE__ */ (() => {
  function Pipeable() {}
  Pipeable.prototype = PipeableProto;
  Pipeable.prototype.constructor = Pipeable;
  return Pipeable;
})();

export const PipeableFunctionProto = /* @__PURE__ */ (() => {
  const PipeableFunctionProto = Object.assign({}, PipeableProto);
  return Object.setPrototypeOf(PipeableFunctionProto, Function.prototype);
})();

export const ADTProto = /* @__PURE__ */ (() => {
  const ADTProto = Object.create(PipeableProto);
  ADTProto[Symbol.for("showify.inspect.custom")] = inspect;
  ADTProto[Symbol.for("nodejs.util.inspect.custom")] = function inspect() {
    return unwrap(this).reduce(
      (acc, cur, i) => {
        acc["_" + i] = cur;
        return acc;
      },
      { _tag: this._tag },
    );
  };
  return ADTProto;
})();

/** @type {*} */
export const ADT = /* @__PURE__ */ (() => {
  function ADT() {}
  ADT.prototype = ADTProto;
  ADT.prototype.constructor = ADT;
  return ADT;
})();

export const ADTConstructorProto = /* @__PURE__ */ (() => {
  const ADTConstructorProto = Object.create(PipeableFunctionProto);
  ADTConstructorProto.toJSON = function toJSON() {
    return { _tag: this._tag };
  };
  ADTConstructorProto[Symbol.for("nodejs.util.inspect.custom")] = function inspect() {
    return { _tag: this._tag };
  };
  ADTConstructorProto[Symbol.for("showify.inspect.custom")] = inspect;
  return ADTConstructorProto;
})();
