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
    Object.assign(
      renameFunction((...args) => {
        const result = { _tag: tag };
        for (let i = 0; i < args.length; i++) result["_" + i] = args[i];
        return result;
      }, tag),
      {
        _tag: tag,
        toJSON: () => ({ _tag: tag }),
        [Symbol.for("nodejs.util.inspect.custom")]: () => ({ _tag: tag }),
      },
    );

  const result = {
    unwrap:
      variants ?
        function unwrap(adt) {
          if (adt == null || variants.indexOf(adt._tag) === -1)
            throw new TypeError(
              `Expected ${variants.map((tag) => "`" + tag + "(...)`").join("/")}, but got \`${stringify(adt)}\``,
            );
          return entriesOf(adt)
            .filter(([key]) => key.startsWith("_") && !Object.is(Number(key.slice(1)), NaN))
            .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
            .map(([, value]) => value);
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
  return entriesOf(adt)
    .filter(([key]) => key.startsWith("_") && !Object.is(Number(key.slice(1)), NaN))
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([, value]) => value);
}

/**
 * Match an ADT with the provided cases.
 * @private
 *
 * @param {*} adt The ADT to match.
 * @param {Object<string, Function>} cases The cases to match.
 * @returns {*}
 */
function _match(adt, cases) {
  if (adt != null && cases[adt._tag]) return cases[adt._tag](...unwrap(adt));
  if (cases._) return cases._(adt);
  throw new Error(
    `No case found for \`${stringify(adt)}\`. Consider adding a catch-all case (\`_\`) if needed`,
  );
}

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
function matchesPrefix(str, prefix) {
  return (
    str.startsWith(prefix) &&
    str.length > prefix.length &&
    str[prefix.length] === str[prefix.length].toUpperCase()
  );
}

/****************************
 * Common utility functions *
 ****************************/
/**
 * Get the entries of an object.
 * @private
 *
 * @param {*} obj The object to get the entries from.
 * @returns {Array}
 */
function entriesOf(obj) {
  const entries = [];
  for (const key in obj)
    if (Object.prototype.hasOwnProperty.call(obj, key)) entries.push([key, obj[key]]);
  return entries;
}

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
            typeof key === "symbol" ? `[${key.toString()}]`
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
