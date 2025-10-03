<h1 align="center">kind-adt</h1>

<p align="center">
  🪴 The <strong>kind</strong> of <strong>ADTs</strong> you can count on in <strong>TypeScript</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kind-adt">
    <img src="https://img.shields.io/npm/dm/kind-adt.svg" alt="downloads" height="18">
  </a>
  <a href="https://www.npmjs.com/package/kind-adt">
    <img src="https://img.shields.io/npm/v/kind-adt.svg" alt="npm version" height="18">
  </a>
  <a href="https://bundlephobia.com/package/kind-adt">
    <img src="https://img.shields.io/bundlephobia/minzip/kind-adt.svg" alt="minzipped size" height="18">
  </a>
  <a href="https://coveralls.io/github/Snowflyt/kind-adt?branch=main">
    <img src="https://img.shields.io/coverallsCoverage/github/Snowflyt/kind-adt?branch=main" alt="coverage status" height="18">
  </a>
  <a href="https://github.com/Snowflyt/kind-adt">
    <img src="https://img.shields.io/npm/l/kind-adt.svg" alt="MPL-2.0 license" height="18">
  </a>
</p>

```typescript
import { type Data, make } from "kind-adt";
import type { Arg0, HKT } from "hkt-core";

// Define an ADT
export type Option<T> = Data<{
  Some: [value: T];
  None: [];
}>;

// Generate constructors and match functions for the ADT
export const { Some, None, match } = make<OptionHKT>();
interface OptionHKT extends HKT { // <- Lift it to HKT
  return: Option<Arg0<this>>;
}

function safeDivide(n: number, d: number) {
  //     ^?: (n: number, d: number) => Option<number>
  if (d === 0) return None;
  return Some(n / d);
}

// Pattern matching for ADTs
match(safeDivide(42, 2), {
  Some: (n) => console.log("Result:", n),
  None: () => console.log("Division by zero!"),
});
```

## Features

- _One_ type to define your **A**lgebraic **D**ata **T**ype (`Data`).
- _One_ function to create **constructors**, **deconstructors**, **type guards** and **pattern matching function** for your ADT with **type safety** (`make`).
- Support for **functional pipelines** with a [`.pipe()` method](#functional-pipelines-with-pipe) on all ADTs.
- [**Readable type signatures**](#provide-more-readable-type-signatures) for your ADT with _labeled tuples_.
- [**Recursive ADTs**](#recursive-adts) with ease.
- Tiny footprint (~2kB minzipped).
- Convert your ADTs to human-readable strings with [showify](https://github.com/Snowflyt/showify) integration.

## Installation

To install **kind-adt** via npm (or any other package manager you prefer):

```shell
npm install kind-adt
```

## Quickstart

**ADTs** ([**A**lgebraic **D**ata **T**ypes](https://en.wikipedia.org/wiki/Algebraic_data_type)) are just **_discriminated unions_** in TypeScript.

```typescript
import type { Data } from "kind-adt";

export type Option<T> = Data<{
  Some: [value: T];
  None: [];
}>;
// Expands to:
// export type Option<T> =
//   | { readonly _tag: "Some"; readonly _0: T }
//   | { readonly _tag: "None" }
```

<div align="right">
  <p><strong>What is a <i>discriminated union</i>?</strong></p>
  <p>These are types that can represent one of several variants, and you can determine which variant it is by looking at a special property called a <strong>discriminant</strong> (in this case, <code>_tag</code>).</p>
</div>

You can create **constructors**, **deconstructors** and **type guards** using the **HKT** (**H**igher-**K**inded **T**ype) of your ADT.

```typescript
import { make } from "kind-adt";
import { show } from "showify"; // Optional dependency
import type { Arg0, HKT } from "hkt-core";

export const { Some, None, match: matchOption, isSome, ifSome /* ... */ } = make<OptionHKT>();
interface OptionHKT extends HKT {
  return: Option<Arg0<this>>;
}

Some(42); // => { _tag: "Some", _0: 42 }
// ^?: <number>(args_0: number) => Option<number>

// Use `show` from showify to print the ADT in a readable format
console.log(show(Some(42), { indent: 2, trailingComma: "auto", colors: true }));
// Some(42)
```

<details>
<summary>➡️ You can use <code>make</code> with <strong>non-generic ADTs</strong>, which doesn’t require an HKT.</summary>

```typescript
export type IpAddr = Data<{
  V4: [number, number, number, number];
  V6: [string];
}>;

export const IpAddr = make<IpAddr>();

IpAddr.V4(127, 0, 0, 1); // => { _tag: "V4", _0: 127, _1: 0, _2: 0, _3: 1 }
IpAddr.V6("::1"); // => { _tag: "V6", _0: "::1" }
```

</details>

<details>
<summary>➡️ Performance note on <code>make</code></summary>

`make` uses [proxies](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to “generate” related functions at runtime, which may introduce some performance overhead. If you are concerned about performance, or is developing a library that needs to be as fast as possible, you should provide the names of each _variant_ manually, which eliminates the need for proxies.

```typescript
export const Option = make<OptionHKT>(["Some", "None"]);

// Use it the same way as before
```

</details>

<div align="right">
  <p><strong>What is a <i>Higher-Kinded Type</i>?</strong></p>
  <p>You can think of it as a <strong><i>type-level function</i></strong> that takes one or more types and returns a type. In this case, <code>OptionHKT</code> is a type-level function that takes one type (<code>Arg0&lt;this&gt;</code>) and returns a type (<code>Option&lt;Arg0&lt;this&gt;&gt;</code>), which can be represented as <code>Type -> Type</code>.</p>
  <p>kind-adt itself does not export an HKT implementation, but it accepts any HKT implementation that satisfies the <strong><a href="https://github.com/Snowflyt/hkt-core">hkt-core</a></strong> V1 standard. You can directly use the one exported from <a href="https://github.com/Snowflyt/hkt-core">hkt-core</a>, or <a href="#i-dont-want-to-install-another-package-for-hkt-can-i-implement-my-own">implement your own</a> — if neither suits your needs, just creating constructors manually is also an option.</p>
</div>

With the magic of HKT, these generated constructors are already **_generic_** and **_type-safe_**.

```typescript
// The return type is inferred as `Option<number>`
function safeDivide(n: number, d: number) {
  //     ^?: (n: number, d: number) => Option<number>
  if (d === 0) return None;
  return Some(n / d);
}
```

<div align="right">
  <p><strong>I can directly use <code>None</code> as an <code>Option</code> <i>without calling it with any arguments</i>?</strong></p>
  <p>Right! Constructors themselves have a <code>_tag</code> property that is the discriminant of the ADT, so if a constructor has no arguments, it is <strong>already a valid <i>variant</i></strong> of the ADT.</p>
  <p>While <code>None</code> is a valid <code>Option</code>, you can still call it with a generic argument to change the return type in TypeScript, e.g., <code>None&lt;string&gt;()</code> will return an <code>Option&lt;string&gt;</code>.</p>
</div>

Once you have your ADT, you can **pattern match** on it with the generated `match` function!

```typescript
function getOrElse<T>(opt: Option<T>, defaultValue: T): T {
  return matchOption(opt, {
    Some: (value) => value,
    None: () => defaultValue,
  });
}
```

<div align="right">
  <p><strong>It’s <i>not</i> real pattern matching, actually.</strong></p>
  <p>That’s right. Pattern matching normally includes support for nested patterns, guards, and more, but kind-adt only provides a simple pattern matching function that is more like a <strong>switch</strong> statement in TypeScript. Also check out kind-adt’s sister project <a href="https://github.com/Snowflyt/megamatch">megamatch</a> for a more powerful pattern matching library that has built-in support for kind-adt style ADTs.</p>
  <p><strong>Sometimes I only want to match <i>a single variant</i> of an ADT, any syntax like <code>if let</code> in Rust?</strong></p>
  <p>As shown in the example, <code>make&lt;OptionHKT&gt;()</code> also generates <code>ifSome</code> and <code>ifNone</code>. While not mentioned in this quickstart guide, <code>make</code> generates many more helper functions than just constructors and matchers, including <code>if*</code>, <code>is*</code>, <code>unwrap*</code>, and more. Check the <a href="#type-guards-and-unwrap">type guards section</a> and the <a href="#conditional-deconstructors-if">conditional deconstructors section</a> for more details.</p>
</div>

`match` also provides a curried overload that can be useful when combined with the `pipe` utility from libraries like [Effect](https://github.com/Effect-TS/effect) or [fp-ts](https://github.com/gcanti/fp-ts).

```typescript
import { pipe } from "effect";

pipe(
  Some(42),
  matchOption({
    Some: (n) => n * 2,
    None: () => 0,
  }),
); // => 84
```

See also the [functional pipelines with `.pipe()`](#functional-pipelines-with-pipe) section for details on kind-adt’s built-in alternative to external pipe utilities.

Note that `ADT.match` requires the return type of each case to be the same. To allow different return types, you can use the `ADT.matchW` function, where the `W` suffix stands for _wider_. `ADT.matchW` can be used the same way as `ADT.match`, supporting both curried and non-curried overloads.

<div align="right">
  <p><strong>What if I want to handle multiple variants of an ADT in a single case?</strong></p>
  <p>kind-adt doesn’t support this feature directly, but allows you to use a “catch-all” case to handle the remaining variants of an ADT. (while our sister project <a href="https://github.com/Snowflyt/megamatch">megamatch</a> does support this feature, with built-in support for kind-adt style ADTs)</p>
</div>

`ADT.match(W)` performs exhaustiveness checking that requires you to handle all variants of an ADT. If you want to handle only some variants of an ADT and leave the rest to the default case, you can use a “catch-all” case with a `_` wildcard:

```typescript
matchOption(Some(42), {
  Some: (n) => n * 2,
  _: () => 0, // Catch-all case
});
```

<div align="right">
  <p><strong>What’s next?</strong></p>
</div>

- The type signatures of generated functions are very readable, but you can [improve the readability of the type signatures with labeled tuples](#provide-more-readable-type-signatures).
- Check out the [syntax sugar for ADTs with only one object field](#syntax-sugar-for-adts-with-only-one-object-field) and [recursive ADTs](#recursive-adts).
- See how to [check the type of an ADT with **type guards** and extract the fields with **`unwrap`**](#type-guards-and-unwrap).
- Check out the [conditional deconstructors](#conditional-deconstructors-if) if you are tired with using `match` on a single variant with a verbose catch-all case.
- See how to use [showify](#convert-adts-to-human-readable-strings) to convert your ADTs to human-readable strings.

## Recipes

### Extract variant types

You can extract the type of each variant of an ADT using the `Tagged` utility type.

```typescript
import type { Data, Tagged } from "kind-adt";

type Option<T> = Data<{
  Some: [value: T];
  None: [];
}>;

type Some<T> = Extract<Option<T>, Tagged<"Some">>;
// Expands to:
// type Some<T> = {
//   readonly _tag: "Some";
//   readonly _0: T;
// }
type None = Extract<Option<unknown>, Tagged<"None">>;
// Expands to:
// type None = {
//   readonly _tag: "None"
// }
```

### Functional pipelines with `.pipe()`

Every ADT in kind-adt supports a `.pipe()` method, allowing for a more functional and fluent style of programming similar to libraries like [Effect](https://github.com/Effect-TS/effect) or [RxJS](https://rxjs.dev/api/index/function/pipe).

```typescript
import { type Data, make } from "kind-adt";
import type { Arg0, HKT } from "hkt-core";

type Option<T> = Data<{
  Some: [value: T];
  None: [];
}>;

const { Some, None, match } = make<OptionHKT>();
interface OptionHKT extends HKT {
  return: Option<Arg0<this>>;
}

const map: <T, R>(fn: (value: T) => R) => (opt: Option<T>) => Option<R> = (fn) =>
  match({
    Some: (value) => Some(fn(value)),
    None: () => None,
  });

// Using pipe with an ADT
Some(42).pipe(
  map((n) => n + 1),
  map((n) => n * 2),
  match({
    Some: (n) => console.log("Result:", n),
    None: () => console.log("No value"),
  }),
);
//> Result: 86
```

Under the hood, any value returned by a constructor already has a `.pipe()` method, which takes a sequence of functions and applies them one after another, with each function receiving the result of the previous function.

You can also create your own objects with the same `.pipe()` functionality using the exported `Pipeable` interface and `PipeableProto`:

```typescript
import { type Pipeable, PipeableProto } from "kind-adt";

// Create a pipeable object
const myData = Object.create(PipeableProto);
myData.value = 42;

// Use the pipe method
const result = myData.pipe(
  (obj) => obj.value * 2,
  (n) => n.toString(),
); // => "84"
```

Alternatively, you can import the `Pipeable` constructor, which has its prototype set to `PipeableProto`:

```typescript
import { Pipeable } from "kind-adt";

class MyData extends Pipeable {
  constructor(public value: number) {
    super();
  }
}

const data = new MyData(42);

data instanceof Pipeable; // => true

data.pipe(
  (data) => data.value * 2,
  (n) => n.toString(),
); // => "84"
```

`ADT` is also exported as a constructor with its prototype set to `ADTProto`, which extends `PipeableProto`. See the [Add your own methods to ADTs](#add-your-own-methods-to-adts) section for details.

### Provide more readable type signatures

Let’s revisit the `Option<T>` example in the quickstart section.

```typescript
type Option<T> = Data<{
  Some: [value: T];
  None: [];
}>;

const Option = make<OptionHKT>();
interface OptionHKT extends HKT {
  return: Option<Arg0<this>>;
}

Option.Some(42);
//     ^?: <number>(args_0: number) => Option<number>
```

In this case, the generated constructor `Some` has a type signature of `<T>(args_0: T) => Option<T>` instead of the more readable `<T>(value: T) => Option<T>`. This naming issue also affects other functions like `Option.match`, `Option.unwrap`, etc. We can improve the readability of these type signatures by using TypeScript [_labeled tuples_](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#labeled-tuple-elements).

```typescript
type Option<T> = Data<
  Some: [value: T],
  None: [],
>;
```

And that’s it! Now all generated functions will have a more readable type signature.

```typescript
function Option.Some<T>(value: T): Option<T>;

function Option.match<T, R>(adt: Option<T>, cases: {
  readonly Some: (value: T) => R;
  readonly None: () => R;
}): R;

// ...
```

This also applies to other ADTs, such as `Result`, `Either`, etc.

```typescript
type Result<T, E> = Data<{
  Ok: [value: T];
  Err: [error: E];
}>;

type Either<A, B> = Data<{
  Left: [value: A];
  Right: [value: B];
}>;
```

### Syntax sugar for ADTs with only one object field

If your ADT has only one object field, declaring it like this would be a little tedious:

```typescript
type Tree<T> = Data<{
  Empty: [];
  Node: [{ value: T; left: Tree<T>; right: Tree<T> }];
}>;
// Expands to:
// type Tree<T> =
//   | { readonly _tag: "Empty" }
//   | { readonly _tag: "Node"; readonly _0: { value: T; left: Tree<T>; right: Tree<T> } }
```

To make it easier to declare, kind-adt provides syntax sugar for this case. You can declare an ADT with a bare object literal type instead of a tuple literal type. This serves as a shorthand for a tuple type with a single object field.

```typescript
type Tree<T> = Data<{
  Empty: {}; // In this case, `{}` is equivalent to `[]`
  Node: { value: T; left: Tree<T>; right: Tree<T> };
}>;
// Expands to:
// type Tree<T> =
//   | { readonly _tag: "Empty" }
//   | { readonly _tag: "Node"; readonly _0: { value: T; left: Tree<T>; right: Tree<T> } }
```

Then you can use it like this:

```typescript
interface TreeHKT extends HKT {
  return: Tree<Arg0<this>>;
}

const Tree = make<TreeHKT>();

const depth: <T>(tree: Tree<T>) => number = Tree.match({
  Empty: () => 0,
  Node: ({ left, right }) => 1 + Math.max(depth(left), depth(right)),
});
```

### Recursive ADTs

The `Tree<T>` example above is already a recursive ADT — TypeScript naturally supports recursive types when they’re defined using object literal types.

However, things get a little tricky when you want to declare the `Node` variant with 3 fields (`value`, `left`, and `right`) directly instead of using an object as the only field:

```typescript
type Tree<T> = Data<{
  // ~~~~
  // Type alias 'Tree' circularly references itself. ts(2456)
  Empty: [];
  Node: [value: T, left: Tree<T>, right: Tree<T>];
}>;
```

This type error originates from the internal evaluation mechanism of TypeScript: types like interfaces, object literal types and function return types are “lazily” evaluated (evaluated only when necessary), while type aliases are “eagerly” evaluated (evaluated immediately). See [this Stack Overflow answer](https://stackoverflow.com/questions/37233735/interfaces-vs-types-in-typescript/77669722#77669722) for more details.

In our scenario, this means that when TypeScript tries to evaluate the `Tree<T>` type alias, it will eagerly evaluate the `Node` variant, which references `Tree<T>` itself, causing a circular reference error.

To avoid this, kind-adt provides an alternative syntax to declare recursive ADTs like this, where an object literal type with numeric keys is used as an alternative to a tuple type:

```typescript
type Tree<T> = Data<{
  Empty: [];
  Node: { 0: T; 1: Tree<T>; 2: Tree<T> };
}>;
```

<details>
<summary>➡️ Click to see how to add labels to the fields of a recursive ADT</summary>

To add labels to the fields (see [Provide more readable type signatures](#provide-more-readable-type-signatures)), you can use a magical field `__labels` that is a labeled tuple exists only in the type system:

```typescript
type Tree<T> = Data<{
  Empty: [];
  Node: {
    __labels: [value: void, left: void, right: void];
    0: T;
    1: Tree<T>;
    2: Tree<T>;
  };
}>;
```

The type of each element in `__labels` does not matter, only the labels are used to provide better type signatures for the generated functions.

</details>

Then you can use it like this:

```typescript
interface TreeHKT extends HKT {
  return: Tree<Arg0<this>>;
}

const Tree = make<TreeHKT>();

const depth: <T>(tree: Tree<T>) => number = Tree.match({
  Empty: () => 0,
  Node: (_, left, right) => 1 + Math.max(depth(left), depth(right)),
});
```

### Type guards and `unwrap`

While `ADT.match(W)` is a powerful tool for handling ADTs, sometimes you simply need to check if an ADT is a specific variant and extract its value. For these cases, kind-adt provides `ADT.is*` and `ADT.unwrap*` functions.

```typescript
const Option = make<OptionHKT>();

function getOrElse<T>(opt: Option<T>, defaultValue: T): T {
  if (Option.isSome(opt)) return opt._0;
  return defaultValue;
}
```

However, accessing the fields of an ADT with `._${number}` like this is not very readable, so kind-adt also provides `ADT.unwrap*` functions to extract the fields of an ADT into a tuple:

```typescript
function getOrElse<T>(opt: Option<T>, defaultValue: T): T {
  if (Option.isSome(opt)) {
    const [value] = Option.unwrap(opt);
    return value;
  }
  return defaultValue;
}

function depth<T>(tree: Tree<T>): number {
  if (Tree.isEmpty(tree)) return 0;
  const [_, left, right] = Tree.unwrap(tree);
  return 1 + Math.max(depth(left), depth(right));
}
```

You can also use `ADT.unwrap*` like `Option.unwrapSome` to extract the value of a specific variant of an ADT, which will throw a runtime error if the ADT is not of that variant.

A standalone `unwrap` function is exported directly from kind-adt, which can be useful if you want to handle any ADT without knowing its type at compile time.

```typescript
import { unwrap } from "kind-adt";

const [value] = unwrap(Some(42));
```

### Conditional deconstructors (`if*`)

You might often need to write code like this:

```typescript
Option.match(safeDivide(42, 2), {
  Some: (n) => console.log("This is a very long message that I want to log", n),
  _ => {},
});
```

Since the `match` function performs exhaustiveness checking, you have to provide a catch-all case `_` to handle the remaining variants of the ADT. This can be awkward and a waste of space when your codebase is full of such cases.

kind-adt provides `ADT.if*` functions to handle this case more elegantly, similar to [the `if let` syntax in Rust](https://doc.rust-lang.org/rust-by-example/flow_control/if_let.html):

```typescript
Option.ifSome(safeDivide(42, 2), (n) => {
  console.log("This is a very long message that I want to log", n);
});
```

If the ADT matches the specified variant, the callback function will be called with the value of that variant, otherwise nothing will happen.

The `if*` function also has a return type: if the matching succeeds, the return type will be the return type of the callback function, otherwise it will be `void` (`undefined` in JavaScript).

```typescript
const result = Option.ifSome(safeDivide(42, 2), (n) => {
  //  ^?: number | void
  console.log("This is a very long message that I want to log", n);
  return n;
});
```

You can also provide an optional second argument to the `if*` function, which is a callback function that will be called if the matching fails. If it is provided, the return type of the `if*` function will be the return type of either the first or the second callback function, depending on whether the matching succeeds or fails.

```typescript
const result = Option.ifSome(
  //  ^?: number | string
  safeDivide(42, 2),
  (n) => {
    console.log("This is a very long message that I want to log", n);
    return n;
  },
  () => {
    console.log("This is a very long message that I want to log");
    return "default value";
  },
);
```

### Convert ADTs to human-readable strings

kind-adt provides integration with the [showify](https://github.com/Snowflyt/showify) package, which allows you to convert objects to human-readable strings. This is especially useful for debugging and logging purposes.

To use this feature, you need to install the [showify](https://github.com/Snowflyt/showify) package:

```shell
npm install showify
```

Then you can use the `show` function to convert an ADT to a human-readable string.

```javascript
import { show } from "showify";

// Suppose we have an ADT `data Tree<T> = Empty | Node(T, Tree<T>, Tree<T>)`
const tree = Tree.Node(
  1,
  Tree.Node(2, Tree.Node(3, Tree.Empty, Tree.Empty), Tree.Empty),
  Tree.Node(4, Tree.Empty, Tree.Node(3, Tree.Empty, Tree.Empty)),
);

// Print the ADT with ANSI colors and indented format
console.log(show(tree, { indent: 2, trailingComma: "auto", colors: true }));
// Node(
//   1,
//   Node(2, Node(3, Empty, Empty), Empty),
//   Node(4, Empty, Node(3, Empty, Empty))
// )
```

If you find it tedious to write `console.log(show(...))` every time, you can create a utility function to print the ADT directly:

```javascript
import { show } from "showify";

export function println(...args: unknown[]) {
  console.log(
    ...args.map((arg) =>
      typeof arg === "string" ? arg : show(arg, { colors: true, trailingComma: "auto", indent: 2 }),
    ),
  );
}
```

### Add your own methods to ADTs

> [!WARNING]
>
> This feature is not recommended for most users, as it may lead to unexpected behavior while module resolution. Use it at your own risk.

ADTs and ADT constructors in kind-adt use a prototype chain to provide “methods” like `.pipe()`. Due to the nature of how prototypes work in JavaScript, you can add your own methods (or “[monkey patch](https://en.wikipedia.org/wiki/Monkey_patch)”) to ADTs or ADT constructors by modifying the prototype of the ADT or ADT constructor.

kind-adt exports four prototypes for you to use, including the `PipeableProto` mentioned in the [Functional pipelines with `.pipe()`](#functional-pipelines-with-pipe) section:

```typescript
import {
  type Pipeable,
  PipeableProto,
  type PipeableFunction,
  PipeableFunctionProto,
  type ADT,
  ADTProto,
  type ADTConstructor,
  ADTConstructorProto,
} from "kind-adt";
```

Each `XxxProto` has a related `Xxx` type, which is the type of the object that can be created from the prototype. ADTs and ADT constructors in kind-adt follow the following prototype chain:

```typescript
╔══════════════════════════════════╗   ╔════════════╗   ╔═════════════════╗
║ Concrete ADT (e.g., `Some(...)`) ║ ← ║ `ADTProto` ║ ← ║ `PipeableProto` ║
╚══════════════════════════════════╝   ╚════════════╝   ╚═════════════════╝

╔═════════════════════════════════════════╗   ╔═══════════════════════╗   ╔═════════════════════════╗
║ Concrete ADT constructor (e.g., `None`) ║ ← ║ `ADTConstructorProto` ║ ← ║ `PipeableFunctionProto` ║
╚═════════════════════════════════════════╝   ╚═══════════════════════╝   ╚═════════════════════════╝
```

Note that though ADTs and ADT constructors share the same `.pipe()` method, they actually have independent prototype chains. This means that you have to patch both prototypes if you want to add your own methods to both ADTs and ADT constructors.

The following example shows how to add a `.println()` method to add ADTs and ADT constructors with type safety. We’ll create a `patches.ts` file to add the method to the prototypes of ADTs and ADT constructors.

```typescript
// patches.ts
import { type ADT, ADTProto, type ADTConstructor, ADTConstructorProto } from "kind-adt";
import { show } from "showify";

/* Make TypeScript aware of the new method with a module augmentation
   https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation */
declare module "kind-adt" {
  interface ADT {
    println(): void;
  }

  interface ADTConstructor {
    println(): void;
  }
}

/* Add the method to the ADT prototype */
ADTProto.println = function println(this: ADT) {
  console.log(show(this, { colors: true, trailingComma: "auto", indent: 2 }));
};
ADTConstructorProto.println = function println(this: ADTConstructor) {
  console.log(show(this, { colors: true, trailingComma: "auto", indent: 2 }));
};

/* Ensure TypeScript treats this file as a module */
export {};
```

Then you can import the `patches.ts` file in your main file to apply the patches:

```typescript
import "./patches"; // Import the patches file

import { type Data, make } from "kind-adt";

type Option<T> = Data<{
  Some: [value: T];
  None: [];
}>;

const { Some, None } = make<OptionHKT>();
interface OptionHKT extends HKT {
  return: Option<Arg0<this>>;
}

Some(42).println(); // Prints: Some(42)
None.println(); // Prints: None
```

## FAQ

### I don’t want to install another package for HKT. Can I implement my own?

The [**hkt-core**](https://github.com/Snowflyt/hkt-core) V1 standard is simple enough to implement by yourself. By extending `HKT` exported from **hkt-core**, you only get two additional properties (`~hkt` and `signature`), which can be easily defined manually.

```typescript
type Args<F> = F extends { Args: (_: infer A extends unknown[]) => void } ? A : never;

// No need to extend `HKT` ↙
interface OptionHKT {
  // ↙ Required by the standard
  "~hkt": { version: 1 };
  // ↓ This defines the type signature (kind) of the HKT
  signature: (type: unknown) => Option<unknown>;
  // You can use types other than `unknown` if your type parameters are constrained,
  // to provide better type safety.
  // signature: (type: string | number) => Option<string | number>
  // ↓ The same as before
  return: Option<Args<this>[0]>;
}

// No need to extend `HKT2` ↙
interface ResultHKT {
  "~hkt": { version: 1 };
  // ↓ Since this HKT has two type parameters, the signature should accept two arguments
  signature: (type1: unknown, type2: unknown) => Result<unknown, unknown>;
  return: Result<Args<this>[0], Args<this>[1]>;
}
```

You can also define your own `HKT` and `HKT2` types if you don’t want to specify all these properties manually every time.

```typescript
interface HKT<Type = unknown> {
  "~hkt": { version: 1 };
  signature: (type: Type) => unknown;
}

interface HKT2<Type1 = unknown, Type2 = unknown> {
  "~hkt": { version: 1 };
  signature: (type1: Type1, type2: Type2) => unknown;
}
```

### Why “Kind”?

<strong><i>Kind</i></strong> is [a term used in type theory](<https://en.wikipedia.org/wiki/Kind_(type_theory)>) to describe the “type of a type”, or the “type of a type constructor (i.e. HKT)”. For example, the kind of `number`, `Option<string>` and `Result<number, string>` are all `Type`, while the kind of `OptionHKT` is `Type -> Type`, and the kind of `ResultHKT` is `(Type, Type) -> Type`.

The name kind-adt is a play on words, combining the term “kind” with “ADT” to emphasize the usage of HKTs in defining ADTs.

### ADTs in kind-adt are _incompatible_ with those in Effect or fp-ts!

That’s true — instead of using `"_${number}"` as field names, these libraries use a more descriptive field name like `"value"` or `"error"`. The design of not following this convention in kind-adt is intentional to allow a cleaner way to match multiple fields in `match` without the need for object destructuring. The use of unreadable field names also encourage users to use `match` instead of directly accessing fields.

Check [ts-adt](https://github.com/pfgray/ts-adt) if you want to use a more compatible ADT library with Effect or fp-ts.

## License

This project is licensed under the Mozilla Public License Version 2.0 (MPL 2.0).
For details, please refer to the `LICENSE` file.

In addition to the open-source license, a commercial license is available for proprietary use.
If you modify this library and do not wish to open-source your modifications, or if you wish to use the modified library as part of a closed-source or proprietary project, you must obtain a commercial license.

For details, see `COMMERCIAL_LICENSE.md`.
