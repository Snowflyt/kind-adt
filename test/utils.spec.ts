import type { Arg0, HKT } from "hkt-core";
import { describe, expect, it, vi } from "vitest";

import type { Data } from "../src";
import { make } from "../src";
import { println, show } from "../src/utils";

describe("println", () => {
  it("should print the value", () => {
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

    const depth: <T>(tree: Tree<T>) => number = Tree.match({
      Empty: () => 0,
      Node: (_, left, right) => 1 + Math.max(depth(left), depth(right)),
    });

    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {});

    const tree = Tree.Node(
      1,
      Tree.Node(2, Tree.Node(3, Tree.Empty, Tree.Empty), Tree.Empty),
      Tree.Node(4, Tree.Empty, Tree.Node(3, Tree.Empty, Tree.Empty)),
    );
    println("[Tree depth]", tree, depth(tree));

    expect(spyLog).toHaveBeenCalledWith(
      "[Tree depth]",
      "\x1b[36mNode\x1b[39m(\n" +
        "  \x1b[33m1\x1b[39m,\n" +
        "  \x1b[36mNode\x1b[39m(\x1b[33m2\x1b[39m, \x1b[36mNode\x1b[39m(\x1b[33m3\x1b[39m, \x1b[36mEmpty\x1b[39m, \x1b[36mEmpty\x1b[39m), \x1b[36mEmpty\x1b[39m),\n" +
        "  \x1b[36mNode\x1b[39m(\x1b[33m4\x1b[39m, \x1b[36mEmpty\x1b[39m, \x1b[36mNode\x1b[39m(\x1b[33m3\x1b[39m, \x1b[36mEmpty\x1b[39m, \x1b[36mEmpty\x1b[39m)),\n" +
        ")",
      "\x1b[33m3\x1b[39m",
    );
  });
});

describe("show", () => {
  it("should convert an ADT to a string", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(show(Option.Some(42))).toBe("Some(42)");
    expect(show(Option.None)).toBe("None");
    expect(show(Option.None())).toBe("None");

    expect(show({ _tag: "Some", value: 42 })).toBe("Some { value: 42 }");
    expect(show({ _tag: "Some", _0: "foo", value: 42 })).toBe('Some("foo") { value: 42 }');
    expect(show(Object.assign(Option.None, { value: true }))).toBe("None { value: true }");
  });
});
