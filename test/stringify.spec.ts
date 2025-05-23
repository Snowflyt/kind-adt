import type { Arg0, HKT } from "hkt-core";
import { show } from "showify";
import { describe, expect, it } from "vitest";

import type { Data } from "../src";
import { make } from "../src";

// This helper function extracts the result of `stringify` by triggering an error caused by
// several functions generated by `make` and extracting the formatted string from the error message
// We test all possible functions that throw such errors to also ensure the correctness of these
// error messages
let i = 0; // A round-robin index indicating the current selected function
const stringify = (value: unknown): string => {
  i = (i + 1) % 7;
  switch (i) {
    case 0:
      try {
        (make() as any).unwrapA(value, () => {});
      } catch (e) {
        return (e as Error).message.slice("Expected `A(...)`, but got `".length, -"`".length);
      }
      break;
    case 1:
      try {
        (make(["Some", "None"] as any) as any).unwrap(value, () => {});
      } catch (e) {
        return (e as Error).message.slice(
          "Expected `Some(...)`/`None(...)`, but got `".length,
          -"`".length,
        );
      }
      break;
    case 2:
      try {
        (make() as any).match(value, {});
      } catch (e) {
        return (e as Error).message.slice(
          "No case found for `".length,
          -"`. Consider adding a catch-all case (`_`) if needed".length,
        );
      }
      break;
    case 3:
      try {
        (make(["Some", "None"] as any) as any).match(value, {});
      } catch (e) {
        return (e as Error).message.slice(
          "Expected `Some(...)`/`None(...)`, but got `".length,
          -"`".length,
        );
      }
      break;
    case 4:
      try {
        (make(["Some", "None"] as any) as any).match({})(value);
      } catch (e) {
        return (e as Error).message.slice(
          "Expected `Some(...)`/`None(...)`, but got `".length,
          -"`".length,
        );
      }
      break;
    case 5:
      try {
        (make(["Some", "None"] as any) as any).matchW(value, {});
      } catch (e) {
        return (e as Error).message.slice(
          "Expected `Some(...)`/`None(...)`, but got `".length,
          -"`".length,
        );
      }
      break;
    case 6:
      try {
        (make(["Some", "None"] as any) as any).matchW({})(value);
      } catch (e) {
        return (e as Error).message.slice(
          "Expected `Some(...)`/`None(...)`, but got `".length,
          -"`".length,
        );
      }
      break;
  }
  throw new Error("Failed to stringify value");
};

describe("stringify (internal implementation)", () => {
  it("should handle primitive values correctly", () => {
    expect(stringify(42)).toBe("42");
    expect(stringify("hello")).toBe('"hello"');
    expect(stringify(true)).toBe("true");
    expect(stringify(null)).toBe("null");
    expect(stringify(undefined)).toBe("undefined");
    expect(stringify(123n)).toBe("123n");
    expect(stringify(Symbol("test"))).toBe("Symbol(test)");
  });

  it("should handle arrays correctly", () => {
    expect(stringify([1, 2, 3])).toBe("[1, 2, 3]");
    expect(stringify(["a", "b", true])).toBe('["a", "b", true]');
    expect(stringify([])).toBe("[]");
  });

  it("should handle arrays subclasses correctly", () => {
    class MyArray<T> extends Array<T> {
      // eslint-disable-next-line @typescript-eslint/no-useless-constructor
      constructor(...args: T[]) {
        super(...args);
      }
    }

    expect(stringify(new MyArray(1, 2, 3))).toBe("MyArray(3) [1, 2, 3]");
  });

  it("should handle objects correctly", () => {
    expect(stringify({ a: 1, b: "test" })).toBe('{ a: 1, b: "test" }');
    expect(stringify({})).toBe("{}");
  });

  it("should handle different key types in objects", () => {
    // Symbol keys
    const symbolKey = Symbol("test");
    const objWithSymbol = { [symbolKey]: "value" };
    expect(stringify(objWithSymbol)).toBe('{ Symbol(test): "value" }');

    // Valid identifier keys
    const objWithValidIds = { abc: 1, $valid: 2, _key123: 3 };
    expect(stringify(objWithValidIds)).toBe("{ abc: 1, $valid: 2, _key123: 3 }");

    // Keys that aren't valid identifiers
    const objWithInvalidIds = { "not-valid": 1, "123": 2, "a b": 3 };
    expect(stringify(objWithInvalidIds)).toBe('{ "123": 2, "not-valid": 1, "a b": 3 }');

    // Mixed keys
    const mixedObj = {
      validId: 1,
      "invalid-id": 2,
      [Symbol("sym")]: 3,
    };
    expect(stringify(mixedObj)).toBe('{ validId: 1, "invalid-id": 2, Symbol(sym): 3 }');
  });

  it("should handle Date objects correctly", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    expect(stringify(date)).toBe(date.toISOString());
  });

  it("should handle RegExp objects correctly", () => {
    expect(stringify(/test/g)).toBe("/test/g");
  });

  it("should handle Map and Set correctly", () => {
    expect(stringify(new Map())).toBe("Map(0) {}");
    expect(stringify(new Set())).toBe("Set(0) {}");

    const map = new Map<any, any>([
      ["key", "value"],
      [1, 2],
    ]);
    expect(stringify(map)).toBe('Map(2) { "key" => "value", 1 => 2 }');

    const set = new Set([1, "test", true]);
    expect(stringify(set)).toBe('Set(3) { 1, "test", true }');
  });

  it("should handle functions correctly", () => {
    function namedFunction() {
      return 42;
    }
    expect(stringify(namedFunction)).toBe("[Function: namedFunction]");

    const anonymousFunction = (() => () => {})();
    expect(stringify(anonymousFunction)).toBe("[Function (anonymous)]");
  });

  it("should handle circular references", () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(stringify(obj)).toBe("{ a: 1, self: [Circular] }");
  });

  it("should handle class instances correctly", () => {
    class TestClass {
      value = 42;
    }
    expect(stringify(new TestClass())).toBe("TestClass { value: 42 }");

    class EmptyClass {}
    expect(stringify(new EmptyClass())).toBe("EmptyClass {}");
  });

  it("should handle nested complex structures", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    const complex = {
      array: [1, { nested: true }],
      map: new Map([["key", { deep: new Set([1, 2]) }]]),
      date,
    };
    complex.map.set("self", complex as never);

    expect(stringify(complex)).toBe(
      `{ array: [1, { nested: true }], ` +
        `map: Map(2) { "key" => { deep: Set(2) { 1, 2 } }, "self" => [Circular] }, ` +
        `date: ${date.toISOString()} }`,
    );
  });
});

describe("show", () => {
  it("should convert an ADT to a string", () => {
    type Tree<T> = Data<{
      Empty: [];
      Node: {
        __labels: [value: void, left: void, right: void];
        0: T;
        1: Tree<T>;
        2: Tree<T>;
      };
    }>;

    const Tree = make<TreeHKT>();
    interface TreeHKT extends HKT {
      return: Tree<Arg0<this>>;
    }

    const tree = Tree.Node(
      1,
      Tree.Node(2, Tree.Node(3, Tree.Empty, Tree.Empty), Tree.Empty),
      Tree.Node(4, Tree.Empty, Tree.Node(3, Tree.Empty, Tree.Empty)),
    );

    expect(show(tree, { indent: 2, colors: true })).toEqual(
      "\x1b[36mNode\x1b[39m(\n" +
        "  \x1b[33m1\x1b[39m,\n" +
        "  \x1b[36mNode\x1b[39m(\x1b[33m2\x1b[39m, \x1b[36mNode\x1b[39m(\x1b[33m3\x1b[39m, \x1b[36mEmpty\x1b[39m, \x1b[36mEmpty\x1b[39m), \x1b[36mEmpty\x1b[39m),\n" +
        "  \x1b[36mNode\x1b[39m(\x1b[33m4\x1b[39m, \x1b[36mEmpty\x1b[39m, \x1b[36mNode\x1b[39m(\x1b[33m3\x1b[39m, \x1b[36mEmpty\x1b[39m, \x1b[36mEmpty\x1b[39m)),\n" +
        ")",
    );

    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const { None, Some } = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(show(Some(42))).toBe("Some(42)");
    expect(show(None)).toBe("None");
    expect(show(None())).toBe("None");

    expect(show(Object.assign(None, { value: true }))).toBe("None { value: true }");
  });

  it("should collapse one-field ADTs if the field is an object/array/map/set", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const { Some } = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    const obj = {
      foo: [1, { nested: true }],
      bar: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    };

    expect(show(Some(obj), { indent: 2 })).toEqual(
      "Some({\n" +
        "  foo: [1, { nested: true }],\n" +
        '  bar: "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "})",
    );
    expect(show(Object.assign(Some(obj), { baz: 42 }), { indent: 2 })).toEqual(
      "Some({\n" +
        "  foo: [1, { nested: true }],\n" +
        '  bar: "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "}) {\n" +
        "  baz: 42\n" +
        "}",
    );

    const arr = [
      { foo: [1, { nested: true }] },
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    ];

    expect(show(Some(arr), { indent: 2 })).toEqual(
      "Some([\n" +
        "  { foo: [1, { nested: true }] },\n" +
        '  "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "])",
    );
    expect(show(Object.assign(Some(arr), { baz: 42 }), { indent: 2 })).toEqual(
      "Some([\n" +
        "  { foo: [1, { nested: true }] },\n" +
        '  "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "]) {\n" +
        "  baz: 42\n" +
        "}",
    );

    const map = new Map<string, any>([
      ["foo", { bar: [1, { nested: true }] }],
      ["qux", "Lorem ipsum dolor sit amet, consectetur adipiscing elit"],
    ]);

    expect(show(Some(map), { indent: 2 })).toEqual(
      "Some(Map(2) {\n" +
        '  "foo" => { bar: [1, { nested: true }] },\n' +
        '  "qux" => "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "})",
    );
    expect(show(Object.assign(Some(map), { baz: 42 }), { indent: 2 })).toEqual(
      "Some(Map(2) {\n" +
        '  "foo" => { bar: [1, { nested: true }] },\n' +
        '  "qux" => "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "}) {\n" +
        "  baz: 42\n" +
        "}",
    );

    const set = new Set([
      1,
      { foo: [1, { nested: true }] },
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    ]);

    expect(show(Some(set), { indent: 2 })).toEqual(
      "Some(Set(3) {\n" +
        "  1,\n" +
        "  { foo: [1, { nested: true }] },\n" +
        '  "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "})",
    );
    expect(show(Object.assign(Some(set), { baz: 42 }), { indent: 2 })).toEqual(
      "Some(Set(3) {\n" +
        "  1,\n" +
        "  { foo: [1, { nested: true }] },\n" +
        '  "Lorem ipsum dolor sit amet, consectetur adipiscing elit"\n' +
        "}) {\n" +
        "  baz: 42\n" +
        "}",
    );
  });
});
