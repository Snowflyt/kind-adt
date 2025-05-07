import type { ShowOptions } from "showify";
import { Node as SerializerNode, serializer, show as stringify } from "showify";

import type { Tagged } from ".";
import { unwrap } from ".";

const { between, pair, sequence, text, variant } = SerializerNode;

/**
 * Print arguments including (possibly) ADTs to `stdout` with newline.
 * @param args The arguments to print.
 *
 * @example
 * ```typescript
 * // Suppose we have an ADT `data Tree<T> = Empty | Node(T, Tree<T>, Tree<T>)`
 * const tree = Tree.Node(
 *   1,
 *   Tree.Node(2, Tree.Node(3, Tree.Empty, Tree.Empty), Tree.Empty),
 *   Tree.Node(4, Tree.Empty, Tree.Node(3, Tree.Empty, Tree.Empty)),
 * );
 *
 * // ANSI colors are supported
 * println(tree);
 * // Node(
 * //   1,
 * //   Node(2, Node(3, Empty, Empty), Empty),
 * //   Node(4, Empty, Node(3, Empty, Empty))
 * // )
 * ```
 *
 * @see {@linkcode show} if you want more control over the output.
 */
export function println(...args: unknown[]) {
  // @ts-expect-error - `console` is not in JavaScript spec
  console.log(
    ...args.map((arg) => (typeof arg === "string" ? arg : show(arg, { colors: true, indent: 2 }))),
  );
}

/**
 * Stringify a (possibly) ADT to human-readable format.
 * @param value The value to stringify.
 * @param options The options for stringification.
 * @returns
 *
 * @example
 * ```typescript
 * // Suppose we have an ADT `data Tree<T> = Empty | Node(T, Tree<T>, Tree<T>)`
 * const tree = Tree.Node(
 *   1,
 *   Tree.Node(2, Tree.Empty, Tree.Empty),
 *   Tree.Empty,
 * );
 *
 * console.log(show(tree));
 * // Node(1, Node(2, Empty, Empty), Empty)
 *
 * console.log(show(tree, { indent: 4, breakLength: 0, trailingComma: "auto" }));
 * // Node(
 * //     1,
 * //     Node(
 * //         2,
 * //         Empty,
 * //         Empty,
 * //     ),
 * //     Empty,
 * // )
 * ```
 */
export function show(value: unknown, options: ShowOptions = {}): string {
  return stringify(value, {
    ...options,
    serializers: [
      serializer({
        if: (value, { omittedKeys }): value is Tagged =>
          "_tag" in value &&
          typeof value._tag === "string" &&
          // Detect if `_tag` is already omitted to avoid infinite recursion
          !omittedKeys.has("_tag"),
        then: (val, { ancestors, c, level }, expand) => {
          const fields = unwrap(val);
          const fieldKeys = fields.map((_, i) => `_${i}`);

          let body = expand(val, {
            level,
            omittedKeys: new Set([
              "_tag",
              ...fieldKeys,
              "toJSON",
              Symbol.for("nodejs.util.inspect.custom"),
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

          return (
            fields.length ?
              variant(
                sequence([
                  text(c.cyan(val._tag) + "("),
                  ...flatMap(fields, (field, i, arr) =>
                    i === arr.length - 1 ? expand(field) : [expand(field), text(", ")],
                  ),
                  ...(body.type === "text" ? [text(")")] : [text(") "), body]),
                ]),
                body.type === "text" ?
                  between(
                    fields.map((field) => pair(expand(field), text(","))),
                    text(c.cyan(val._tag) + "("),
                    text(")"),
                  )
                : pair(
                    between(
                      fields.map((field) => pair(expand(field), text(","))),
                      text(c.cyan(val._tag) + "("),
                      text(") "),
                    ),
                    body,
                  ),
              )
            : body.type === "text" ? text(c.cyan(val._tag))
            : pair(text(c.cyan(val._tag) + " "), body)
          );
        },
      }),
      ...(options.serializers || []),
    ],
  });
}

/****************************
 * Common utility functions *
 ****************************/
/**
 * A polyfill for `Array#flatMap` to support pre ES2019 environments.
 * @param arr The array to flatten.
 * @param fn The function to call on each element of the array.
 * @returns
 */
const flatMap = <T, U>(arr: T[], fn: (value: T, index: number, array: T[]) => U | U[]): U[] => {
  const result: U[] = [];
  for (let i = 0; i < arr.length; i++) {
    const value = fn(arr[i], i, arr);
    if (Array.isArray(value)) Array.prototype.push.apply(result, value);
    else result.push(value);
  }
  return result;
};
