/******************
 * Main functions *
 ******************/
/**
 * Generate constructors and related functions (e.g., match functions) for an ADT. These include:
 * - `ADT.<Tag>`: Constructor for the ADT.
 * - `ADT.is<Tag>`: Type guard function for the ADT.
 * - `ADT.unwrap`: Deconstructor for the ADT. This function extracts the fields of the ADT into a
 *   TypeScript tuple (i.e., an array).
 * - `ADT.unwrap<Tag>`: Deconstructor for the ADT with a specific tag. If the passed ADT has a
 *   different tag, it will throw an error.
 * - `ADT.if<Tag>`: Conditional deconstructor for the ADT. Similar to Rust’s `if let` syntax.
 * - `ADT.match`: A match function to pattern match the ADT. This function requires the return type
 *   of each case to be the same.
 * - `ADT.matchW`: Same as `ADT.match`, but allows the return type of each case to be different.
 * @param variants The variants of the ADT. If not provided, a proxy object will be returned.
 * @returns
 *
 * @see {@linkcode Data} for details on how to create an ADT.
 */
export function make<F extends Tagged | TypeLambda<never, Tagged>>(
  variants?: readonly Instantiate<F>["_tag"][],
): Instantiate<F> extends infer Type extends Tagged ?
  Spread<
    { readonly [Tag in Type["_tag"] as Tag]: Constructor<F, Tag> },
    { readonly [Tag in Type["_tag"] as `is${Tag}`]: (adt: Type) => adt is FilterTagged<Type, Tag> },
    { readonly unwrap: Deconstructor<Type> },
    { readonly [Tag in Type["_tag"] as `unwrap${Tag}`]: Deconstructor<FilterTagged<Type, Tag>> },
    { readonly [Tag in Type["_tag"] as `if${Tag}`]: ConditionalDeconstructorOf<F, Tag> },
    {
      readonly match: MatcherOf<F>;
      readonly matchW: MatcherOfW<F>;
    }
  >
: never;

/**
 * Extract the fields of an ADT.
 * @param adt The ADT to unwrap.
 * @returns
 */
export function unwrap<T extends Tagged>(adt: T): ExtractFields<T>;

/**************
 * Main types *
 **************/
/**
 * A tagged type with a `_tag` property.
 *
 * @example
 * ```typescript
 * // Create a tagged type
 * type _ = Tagged<"A", [string, number]>;
 * // => { readonly _tag: "A"; readonly _0: string; readonly _1: number }
 * ```
 *
 * @example
 * ```typescript
 * // Extract a variant from an ADT
 * type Option<T> = Data<{
 *   Some: [T];
 *   None: [];
 * }>;
 * type Some<T> = Extract<Option<T>, Tagged<"Some">>;
 * //   ^?: type Some<T> = { readonly _tag: "Some"; readonly _0: T }
 * ```
 */
export type Tagged<Tag extends string = string, Fields = readonly unknown[]> = Merge<
  { readonly _tag: Tag },
  (
    [Exclude<keyof Fields, "__labels">, IsNever<Exclude<keyof Fields, "__labels">>] extends (
      [number, false]
    ) ?
      Exclude<Fields, "__labels">
    : Fields
  ) extends infer Fields ?
    { readonly [I in IndexOf<Fields> as `_${I}`]: Fields[I] }
  : never
>;

/**
 * Create an ADT with tagged types.
 *
 * @example
 * ```typescript
 * import { type Data, type Tagged, make } from "kind-adt";
 * import type { Arg0, HKT } from "hkt-core";
 *
 * // A Simple ADT
 * export type Option<T> = Data<{
 * //          ^?: { readonly _tag: "Some"; readonly _0: T } | { readonly _tag: "None" }
 *   Some: [T];
 *   None: [];
 * }>;
 * // Extract a variant from an ADT
 * export type Some<T> = Extract<Option<T>, Tagged<"Some">>;
 * //          ^?: type Some<T> = { readonly _tag: "Some"; readonly _0: T }
 * // Generate constructors and match functions for the ADT
 * export const Option = make<OptionHKT>();
 * interface OptionHKT extends HKT { // <- Lift the ADT to HKT
 *   return: Option<Arg0<this>>;
 * }
 * // Use the ADT
 * function safeDiv(n1: number, n2: number) {
 *   //     ^?: (n1: number, n2: number) => Option<number>
 *   if (n2 === 0) return Option.None;
 *   return Option.Some(n1 / n2);
 * }
 * const result = Option.match(safeDiv(1, 2), {
 *   //  ^?: string
 *   Some: (n) => `Result: ${n}`,
 *   None: () => {
 *     throw new Error("Division by zero");
 *   },
 * });
 * console.log(result); // Result: 0.5
 * ```
 *
 * @example
 * ```typescript
 * import { type Data, make } from "kind-adt";
 * import type { Arg0, Arg1, HKT2 } from "hkt-core";
 *
 * // You can add optional labels to the constructor to improve readability of type information
 * export type Result<T, E> = Data<{
 *   Ok: [value: T]; // <- With labels
 *   Err: [error: E]; // <- With labels
 * }>;
 * export const Result = make<ResultHKT>();
 * interface ResultHKT extends HKT2 {
 *   return: Result<Arg0<this>, Arg1<this>>;
 * }
 *
 * // When you hover over `Result.Err`, you will a much more readable type information:
 * Result.Err("Oops!");
 * //     ^?: <never, string>(error: string) => Result<never, string>
 * // Without labels, the type information will be less readable:
 * // Result.Err("Oops!");
 * //        ^?: <never, string>(args_0: string) => Result<never, string>
 *
 * // This also applies to the generated `ADT.match` function:
 * Result.match(Result.Err("Oops!"), {
 *   Ok: (v) => `Value: ${v}`,
 * // ^?: (value: never) => string
 * // Without labels, you get `(args_0: never) => string`
 *   Err: (e) => `Error: ${e}`,
 * // ^?: (error: string) => string
 * // Without labels, you get `(args_0: string) => string`
 * });
 * ```
 *
 * @example
 * ```typescript
 * import { type Data, make } from "kind-adt";
 * import type { Arg0, Arg1, HKT2 } from "hkt-core";
 *
 * // Constraints on type parameters are also supported
 * export type Entry<K extends string | number, V> = Data<{
 *   Entry: [key: K, value: V];
 * }>;
 * export const { Entry } = make<EntryHKT>();
 * interface EntryHKT extends HKT2<string | number, unknown> {
 *   return: Entry<Arg0<this>, Arg1<this>>;
 * }
 *
 * // TypeScript will issue an error if you pass the wrong type of arguments to the constructor:
 * Entry(null, "John");
 * //    ~~~~
 * // Argument of type 'null' is not assignable to parameter of type 'string | number'.
 * ```
 *
 * @example
 * ```typescript
 * import { type Data, make } from "kind-adt";
 * import type { Arg0, HKT } from "hkt-core";
 *
 * // A sugared syntax for ADTs with only one object argument
 * export type Tree<T> = Data<{
 *   Empty: {};
 *   Node: { value: T; left: Tree<T>; right: Tree<T> };
 * }>;
 * // This expands to:
 * // type Tree<T> =
 * //   | { readonly _tag: "Empty" }
 * //   | { readonly _tag: "Node"; readonly _0: { value: T; left: Tree<T>; right: Tree<T> } };
 * // NOTE: kind-adt will treat `{}` as `[]` in this syntax.
 *
 * export const { Empty, Node, match: matchTree } = make<TreeHKT>();
 * interface TreeHKT extends HKT {
 *   return: Tree<Arg0<this>>;
 * }
 *
 * const depth: <T>(tree: Tree<T>) => number = matchTree({
 *   Empty: () => 0,
 *   Node: ({ left, right }) => 1 + Math.max(depth(left), depth(right)),
 * });
 *
 * console.log(depth(Node(1, Node(2, Node(3, Empty, Empty), Empty))); // 3
 * ```
 *
 * @example
 * ```typescript
 * import { type Data, make } from "kind-adt";
 * import type { Arg0, HKT } from "hkt-core";
 *
 * // TypeScript sometimes has trouble handling recursive ADTs
 * type Tree<T> = Data<{
 *   // ~~~~
 *   // Type alias 'Tree' circularly references itself.
 *   Empty: [];
 *   Node: [value: T, left: Tree<T>, right: Tree<T>];
 * }>;
 *
 * // You might wonder why TypeScript handles the recursive ADT in the previous example correctly,
 * // but fails in this example. The reason is that TypeScript lazily evaluates certain types,
 * // including interfaces, object literal types and function return types, but eagerly evaluates
 * // the rest (e.g., tuple types and type aliases defined by `type`).
 * // In the previous example, we quoted the `Tree` type inside an object literal type, which is
 * // lazily evaluated.
 * // However, in this example, we quote `Tree<T>` in a tuple type, which is eagerly evaluated.
 *
 * // kind-adt provides an alternative syntax for such cases:
 * type Tree<T> = Data<{
 *   Empty: [];
 *   Node: { 0: T; 1: Tree<T>; 2: Tree<T> };
 * }>;
 * // Instead of using a tuple type, we use an object type with only numeric keys.
 * // This expands to:
 * // type Tree<T> =
 * //   | { readonly _tag: "Empty" }
 * //   | { readonly _tag: "Node"; readonly _0: T; readonly _1: Tree<T>; readonly _2: Tree<T> };
 * // NOTE: kind-adt treats object with only numeric keys as tuple types, instead of the syntax
 * // sugar for ADTs with only one object argument.
 *
 * // However, such syntax does not support labels. kind-adt also provides a special syntax for
 * // recursive ADTs with labels:
 * type Tree<T> = Data<{
 *   Empty: [];
 *   Node: {
 *     // The `__labels` property can be a labeled tuple containing any type, we only use the labels
 *     __labels: [value: void, left: void, right: void];
 *     0: T;
 *     1: Tree<T>;
 *     2: Tree<T>;
 *   };
 * }>;
 * // This expands to the same type as the previous example.
 *
 * export const Tree = make<TreeHKT>();
 * interface TreeHKT extends HKT {
 *   return: Tree<Arg0<this>>;
 * }
 *
 * const depth: <T>(tree: Tree<T>) => number = Tree.match({
 *   Empty: () => 0,
 *   Node: (_, left, right) => 1 + Math.max(depth(left), depth(right)),
 *   // ^?: (value: T, left: Tree<T>, right: Tree<T>) => number
 *   // Labels are preserved in the match function
 * });
 * ```
 */
export type Data<Variants extends Record<string, unknown>> = ValueOf<{
  [Tag in keyof Variants & string]: Variants[Tag] extends (
    readonly unknown[] // Regular ADTs
  ) ?
    Tagged<Tag, Variants[Tag]>
  : // Special syntax for recursive ADTs
  [
    Exclude<keyof Variants[Tag], "__labels">,
    IsNever<Exclude<keyof Variants[Tag], "__labels">>,
  ] extends [number, false] ?
    Tagged<Tag, Variants[Tag]>
  : // If the object is `{}`, we still treat it as `[]`
  IsNever<keyof Variants[Tag]> extends true ? Tagged<Tag, []>
  : // Special syntax for ADTs with only one object argument
    Tagged<Tag, [fields: Variants[Tag]]>;
}>;

/**
 * A constructor for an ADT.
 */
export type Constructor<Type extends Tagged | TypeLambda<never, Tagged>, Tag extends string> =
  [Type] extends (
    [Tagged] // Non-generic ADT
  ) ?
    { readonly _tag: Tag } & ((...args: ExtractFields<Extract<Type, Tagged<Tag>>>) => Type)
  : // Generic ADT
  Type extends TypeLambda<[never], unknown> ?
    unknown extends _UpperBound<HKTParams<Type>[0]> ?
      { readonly _tag: Tag } & (<T = never>(
        ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T]>, Tag>>
      ) => ApplyHKT<Type, [T]>)
    : { readonly _tag: Tag } & (<T extends _UpperBound<HKTParams<Type>[0]> = never>(
        ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T]>, Tag>>
      ) => ApplyHKT<Type, [T]>)
  : Type extends TypeLambda<[never, never], unknown> ?
    [unknown, unknown] extends [_UpperBound<HKTParams<Type>[0]>, _UpperBound<HKTParams<Type>[1]>] ?
      { readonly _tag: Tag } & (<T = never, U = never>(
        ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U]>, Tag>>
      ) => ApplyHKT<Type, [T, U]>)
    : unknown extends _UpperBound<HKTParams<Type>[0]> ?
      { readonly _tag: Tag } & (<T = never, U extends _UpperBound<HKTParams<Type>[1]> = never>(
        ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U]>, Tag>>
      ) => ApplyHKT<Type, [T, U]>)
    : unknown extends _UpperBound<HKTParams<Type>[1]> ?
      { readonly _tag: Tag } & (<T extends _UpperBound<HKTParams<Type>[0]> = never, U = never>(
        ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U]>, Tag>>
      ) => ApplyHKT<Type, [T, U]>)
    : { readonly _tag: Tag } & (<
        T extends _UpperBound<HKTParams<Type>[0]> = never,
        U extends _UpperBound<HKTParams<Type>[1]> = never,
      >(
        ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U]>, Tag>>
      ) => ApplyHKT<Type, [T, U]>)
  : Type extends TypeLambda<[never, never, never], unknown> ?
    { readonly _tag: Tag } & (<
      T extends _UpperBound<HKTParams<Type>[0]> = never,
      U extends _UpperBound<HKTParams<Type>[1]> = never,
      V extends _UpperBound<HKTParams<Type>[2]> = never,
    >(
      ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U, V]>, Tag>>
    ) => ApplyHKT<Type, [T, U, V]>)
  : Type extends TypeLambda<[never, never, never, never], unknown> ?
    { readonly _tag: Tag } & (<
      T extends _UpperBound<HKTParams<Type>[0]> = never,
      U extends _UpperBound<HKTParams<Type>[1]> = never,
      V extends _UpperBound<HKTParams<Type>[2]> = never,
      W extends _UpperBound<HKTParams<Type>[3]> = never,
    >(
      ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U, V, W]>, Tag>>
    ) => ApplyHKT<Type, [T, U, V, W]>)
  : Type extends TypeLambda<[never, never, never, never, never], unknown> ?
    { readonly _tag: Tag } & (<
      T extends _UpperBound<HKTParams<Type>[0]> = never,
      U extends _UpperBound<HKTParams<Type>[1]> = never,
      V extends _UpperBound<HKTParams<Type>[2]> = never,
      W extends _UpperBound<HKTParams<Type>[3]> = never,
      X extends _UpperBound<HKTParams<Type>[4]> = never,
    >(
      ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U, V, W, X]>, Tag>>
    ) => ApplyHKT<Type, [T, U, V, W, X]>)
  : Type extends TypeLambda<[never, never, never, never, never, never], unknown> ?
    { readonly _tag: Tag } & (<
      T extends _UpperBound<HKTParams<Type>[0]> = never,
      U extends _UpperBound<HKTParams<Type>[1]> = never,
      V extends _UpperBound<HKTParams<Type>[2]> = never,
      W extends _UpperBound<HKTParams<Type>[3]> = never,
      X extends _UpperBound<HKTParams<Type>[4]> = never,
      Y extends _UpperBound<HKTParams<Type>[5]> = never,
    >(
      ...args: ExtractFields<FilterTagged<ApplyHKT<Type, [T, U, V, W, X, Y]>, Tag>>
    ) => ApplyHKT<Type, [T, U, V, W, X, Y]>)
  : /* support up to 6 type parameters */ never;

/**
 * A type guard function for an ADT.
 */
export type Guard<T extends Tagged, Tag extends string> = (adt: T) => adt is FilterTagged<T, Tag>;

/**
 * A deconstructor for an ADT.
 */
export type Deconstructor<Type extends Tagged> = <T extends Type>(adt: T) => ExtractFields<T>;

type ConditionalDeconstructorOf<F extends Tagged | TypeLambda<never, Tagged>, Tag extends string> =
  [F] extends [Tagged] ?
    <R1, R2 = void>(
      adt: F,
      onMatch: (...args: ExtractFields<FilterTagged<F, Tag>>) => R1,
      otherwise?: (adt: Exclude<F, Tagged<Tag>>) => R2,
    ) => R1 | R2
  : [F] extends [TypeLambda<[never], Tagged>] ? ConditionalDeconstructor1<F, Tag>
  : [F] extends [TypeLambda<[never, never], Tagged>] ? ConditionalDeconstructor2<F, Tag>
  : ConditionalDeconstructor<Instantiate<F>, Tag>;

type ConditionalDeconstructor1<F extends TypeLambda<[never], Tagged>, Tag extends string> =
  [unknown] extends HKTParams<F> ?
    <T, R1, R2 = void>(
      adt: ApplyHKT<F, [T]>,
      onMatch: (...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>) => R1,
      otherwise?: (adt: Exclude<ApplyHKT<F, [T]>, Tagged<Tag>>) => R2,
    ) => R1 | R2
  : <T extends HKTParams<F>[0], R1, R2 = void>(
      adt: ApplyHKT<F, [T]>,
      onMatch: (...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>) => R1,
      otherwise?: (adt: Exclude<ApplyHKT<F, [T]>, Tagged<Tag>>) => R2,
    ) => R1 | R2;

type ConditionalDeconstructor2<F extends TypeLambda<[never, never], Tagged>, Tag extends string> =
  [unknown, unknown] extends HKTParams<F> ?
    <T, U, R1, R2 = void>(
      adt: ApplyHKT<F, [T, U]>,
      onMatch: (...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>) => R1,
      otherwise?: (adt: Exclude<ApplyHKT<F, [T, U]>, Tagged<Tag>>) => R2,
    ) => R1 | R2
  : unknown extends HKTParams<F>[0] ?
    <T, U extends HKTParams<F>[1], R1, R2 = void>(
      adt: ApplyHKT<F, [T, U]>,
      onMatch: (...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>) => R1,
      otherwise?: (adt: Exclude<ApplyHKT<F, [T, U]>, Tagged<Tag>>) => R2,
    ) => R1 | R2
  : unknown extends HKTParams<F>[1] ?
    <T extends HKTParams<F>[0], U, R1, R2 = void>(
      adt: ApplyHKT<F, [T, U]>,
      onMatch: (...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>) => R1,
      otherwise?: (adt: Exclude<ApplyHKT<F, [T, U]>, Tagged<Tag>>) => R2,
    ) => R1 | R2
  : <T extends HKTParams<F>[0], U extends HKTParams<F>[1], R1, R2 = void>(
      adt: ApplyHKT<F, [T, U]>,
      onMatch: (...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>) => R1,
      otherwise?: (adt: Exclude<ApplyHKT<F, [T, U]>, Tagged<Tag>>) => R2,
    ) => R1 | R2;

// Fallback conditional deconstructor type
/**
 * A conditional {@link Deconstructor} for an ADT, which is similar to the `if let` syntax in Rust.
 */
export type ConditionalDeconstructor<Type extends Tagged, Tag extends string> = <
  T extends Type,
  R1,
  R2 = void,
>(
  adt: T,
  onMatch: (...args: ExtractFields<FilterTagged<T, Tag>>) => R1,
  otherwise?: (adt: Exclude<T, Tagged<Tag>>) => R2,
) => R1 | R2;

type MatcherOf<F extends Tagged | TypeLambda<never, Tagged>> =
  [F] extends [Tagged] ?
    {
      <R>(
        adt: F,
        cases: {
          readonly [Tag in F["_tag"]]: (...args: ExtractFields<FilterTagged<F, Tag>>) => R;
        },
      ): R;
      <R>(
        adt: F,
        cases: {
          readonly [Tag in F["_tag"]]?: (...args: ExtractFields<FilterTagged<F, Tag>>) => R;
        } & { _: (adt: F) => R },
      ): R;
      <R>(cases: {
        readonly [Tag in F["_tag"]]: (...args: ExtractFields<FilterTagged<F, Tag>>) => R;
      }): (adt: F) => R;
      <R>(
        cases: {
          readonly [Tag in F["_tag"]]?: (...args: ExtractFields<FilterTagged<F, Tag>>) => R;
        } & { _: (adt: F) => R },
      ): (adt: F) => R;
    }
  : [F] extends [TypeLambda<[never], Tagged>] ? Matcher1<F>
  : [F] extends [TypeLambda<[never, never], Tagged>] ? Matcher2<F>
  : Matcher<Instantiate<F>>;

type Matcher1<F extends TypeLambda<[never], Tagged>> =
  [unknown] extends HKTParams<F> ?
    {
      <T, R>(
        adt: ApplyHKT<F, [T]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        },
      ): R;
      <T, R>(
        adt: ApplyHKT<F, [T]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T]>) => R },
      ): R;
      <T, R>(cases: {
        readonly [Tag in Instantiate<F>["_tag"]]: (
          ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
        ) => R;
      }): (adt: ApplyHKT<F, [T]>) => R;
      <T, R>(
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T]>) => R },
      ): (adt: ApplyHKT<F, [T]>) => R;
    }
  : {
      <T extends HKTParams<F>[0], R>(
        adt: T,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        },
      ): R;
      <T extends HKTParams<F>[0], R>(
        adt: ApplyHKT<F, [T]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T]>) => R },
      ): R;
      <T extends HKTParams<F>[0], R>(cases: {
        readonly [Tag in Instantiate<F>["_tag"]]: (
          ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
        ) => R;
      }): (adt: ApplyHKT<F, [T]>) => R;
      <T extends HKTParams<F>[0], R>(
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T]>) => R },
      ): (adt: ApplyHKT<F, [T]>) => R;
    };

type Matcher2<F extends TypeLambda<[never, never], Tagged>> =
  [unknown, unknown] extends HKTParams<F> ?
    {
      <T, U, R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        },
      ): R;
      <T, U, R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): R;
      <T, U, R>(cases: {
        readonly [Tag in Instantiate<F>["_tag"]]: (
          ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
        ) => R;
      }): (adt: ApplyHKT<F, [T, U]>) => R;
      <T, U, R>(
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): (adt: ApplyHKT<F, [T, U]>) => R;
    }
  : unknown extends HKTParams<F>[0] ?
    {
      <T, U extends HKTParams<F>[1], R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        },
      ): R;
      <T, U extends HKTParams<F>[1], R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): R;
      <T, U extends HKTParams<F>[1], R>(cases: {
        readonly [Tag in Instantiate<F>["_tag"]]: (
          ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
        ) => R;
      }): (adt: ApplyHKT<F, [T, U]>) => R;
      <T, U extends HKTParams<F>[1], R>(
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): (adt: ApplyHKT<F, [T, U]>) => R;
    }
  : unknown extends HKTParams<F>[1] ?
    {
      <T extends HKTParams<F>[0], U, R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        },
      ): R;
      <T extends HKTParams<F>[0], U, R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): R;
      <T extends HKTParams<F>[0], U, R>(cases: {
        readonly [Tag in Instantiate<F>["_tag"]]: (
          ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
        ) => R;
      }): (adt: ApplyHKT<F, [T, U]>) => R;
      <T extends HKTParams<F>[0], U, R>(
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): (adt: ApplyHKT<F, [T, U]>) => R;
    }
  : {
      <T extends HKTParams<F>[0], U extends HKTParams<F>[1], R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        },
      ): R;
      <T extends HKTParams<F>[0], U extends HKTParams<F>[1], R>(
        adt: ApplyHKT<F, [T, U]>,
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): R;
      <T extends HKTParams<F>[0], U extends HKTParams<F>[1], R>(cases: {
        readonly [Tag in Instantiate<F>["_tag"]]: (
          ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
        ) => R;
      }): (adt: ApplyHKT<F, [T, U]>) => R;
      <T extends HKTParams<F>[0], U extends HKTParams<F>[1], R>(
        cases: {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => R },
      ): (adt: ApplyHKT<F, [T, U]>) => R;
    };

// Fallback matcher type
/**
 * A {@linkcode match} function for a specific ADT.
 */
export interface Matcher<Type extends Tagged> {
  <T extends Type, R>(
    adt: T,
    cases: {
      readonly [Tag in Type["_tag"]]: (...args: ExtractFields<FilterTagged<T, Tag>>) => R;
    },
  ): R;
  <T extends Type, R>(
    adt: T,
    cases: {
      readonly [Tag in Type["_tag"]]?: (...args: ExtractFields<FilterTagged<T, Tag>>) => R;
    } & { _: (adt: T) => R },
  ): R;
  <T extends Type, R>(cases: {
    readonly [Tag in Type["_tag"]]: (...args: ExtractFields<FilterTagged<T, Tag>>) => R;
  }): (adt: T) => R;
  <T extends Type, R>(
    cases: {
      readonly [Tag in Type["_tag"]]?: (...args: ExtractFields<FilterTagged<T, Tag>>) => R;
    } & { _: (adt: T) => R },
  ): (adt: T) => R;
}

type MatcherOfW<F extends Tagged | TypeLambda<never, Tagged>> =
  [F] extends [Tagged] ?
    {
      <
        Cases extends {
          readonly [Tag in F["_tag"]]: (...args: ExtractFields<FilterTagged<F, Tag>>) => unknown;
        },
      >(
        adt: F,
        cases: Cases,
      ): ReturnType<ValueOf<Cases>>;
      <
        Cases extends {
          readonly [Tag in F["_tag"]]?: (...args: ExtractFields<FilterTagged<F, Tag>>) => unknown;
        } & { _: (adt: F) => unknown },
      >(
        adt: F,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        Cases extends {
          readonly [Tag in F["_tag"]]: (...args: ExtractFields<FilterTagged<F, Tag>>) => unknown;
        },
      >(
        cases: Cases,
      ): (adt: F) => ReturnType<ValueOf<Cases>>;
      <
        Cases extends {
          readonly [Tag in F["_tag"]]?: (...args: ExtractFields<FilterTagged<F, Tag>>) => unknown;
        } & { _: (adt: F) => unknown },
      >(
        cases: Cases,
      ): (adt: F) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    }
  : [F] extends [TypeLambda<[never], Tagged>] ? Matcher1W<F>
  : [F] extends [TypeLambda<[never, never], Tagged>] ? Matcher2W<F>
  : MatcherW<Instantiate<F>>;

type Matcher1W<F extends TypeLambda<[never], Tagged>> =
  [unknown] extends HKTParams<F> ?
    {
      <
        T,
        R,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => unknown;
        },
      >(
        adt: ApplyHKT<F, [T]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        R,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T]>) => R },
      >(
        adt: ApplyHKT<F, [T]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        R,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => unknown;
        },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        R,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => R;
        } & { _: (adt: ApplyHKT<F, [T]>) => R },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    }
  : {
      <
        T extends HKTParams<F>[0],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => unknown;
        },
      >(
        adt: T,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T]>) => unknown },
      >(
        adt: ApplyHKT<F, [T]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => unknown;
        },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T]>) => unknown },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    };

type Matcher2W<F extends TypeLambda<[never, never], Tagged>> =
  [unknown, unknown] extends HKTParams<F> ?
    {
      <
        T,
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    }
  : unknown extends HKTParams<F>[0] ?
    {
      <
        T,
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T,
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    }
  : unknown extends HKTParams<F>[1] ?
    {
      <
        T extends HKTParams<F>[0],
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        U,
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    }
  : {
      <
        T extends HKTParams<F>[0],
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        adt: ApplyHKT<F, [T, U]>,
        cases: Cases,
      ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
      <
        T extends HKTParams<F>[0],
        U extends HKTParams<F>[1],
        Cases extends {
          readonly [Tag in Instantiate<F>["_tag"]]?: (
            ...args: ExtractFields<FilterTagged<ApplyHKT<F, [T, U]>, Tag>>
          ) => unknown;
        } & { _: (adt: ApplyHKT<F, [T, U]>) => unknown },
      >(
        cases: Cases,
      ): (
        adt: ApplyHKT<F, [T, U]>,
      ) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
    };

// Fallback matcher type
/**
 * A {@linkcode matchW} function for a specific ADT.
 */
export interface MatcherW<Type extends Tagged> {
  <
    T extends Type,
    Cases extends {
      readonly [Tag in Type["_tag"]]: (...args: ExtractFields<FilterTagged<T, Tag>>) => unknown;
    },
  >(
    adt: T,
    cases: Cases,
  ): ReturnType<ValueOf<Cases>>;
  <
    T extends Type,
    Cases extends {
      readonly [Tag in Type["_tag"]]?: (...args: ExtractFields<FilterTagged<T, Tag>>) => unknown;
    } & { _: (adt: T) => unknown },
  >(
    adt: T,
    cases: Cases,
  ): ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
  <
    T extends Type,
    Cases extends {
      readonly [Tag in Type["_tag"]]: (...args: ExtractFields<FilterTagged<T, Tag>>) => unknown;
    },
  >(
    cases: Cases,
  ): (adt: T) => ReturnType<ValueOf<Cases>>;
  <
    T extends Type,
    Cases extends {
      readonly [Tag in Type["_tag"]]?: (...args: ExtractFields<FilterTagged<T, Tag>>) => unknown;
    } & { _: (adt: T) => unknown },
  >(
    cases: Cases,
  ): (adt: T) => ReturnType<Extract<ValueOf<Cases>, (...args: never) => unknown>>;
}

/*****************
 * Utility types *
 *****************/
/**
 * Instantiate a possibly higher-kinded {@linkcode Tagged}.
 * @private
 */
type Instantiate<F extends Tagged | TypeLambda<never, Tagged>> =
  (F extends TypeLambda ? TolerantResult<F> : F) extends infer R extends Tagged ? R : never;

/**
 * {@link Extract} a {@linkcode Tagged} from a union of {@linkcode Tagged}s.
 */
type FilterTagged<T, Tag extends string> = Extract<T, { readonly _tag: Tag }>;

/**
 * Extract the fields of a {@linkcode Tagged} as a (possibly) labeled tuple.
 */
type ExtractFields<F> = AddLabels<
  _ExtractFields<F>,
  F extends (
    Tagged<
      string,
      | (infer Labels extends readonly unknown[])
      | { readonly __labels: infer Labels extends readonly unknown[] }
    >
  ) ?
    Labels
  : []
>;
type _ExtractFields<F, Counter extends void[] = [], Acc extends unknown[] = []> =
  F extends { readonly [K in `_${Counter["length"]}`]: infer T } ?
    _ExtractFields<F, [...Counter, void], [...Acc, T]>
  : Acc;

/************************
 * Common utility types *
 ************************/
/**
 * Get the value type of an object type.
 * @private
 */
type ValueOf<T> = T[keyof T];

/**
 * Check if a type is `never`.
 * @private
 */
type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if a type is `any`.
 *
 * Copied from [type-fest](https://github.com/sindresorhus/type-fest/blob/475a737e3223d7bd8e950f36998a17d520a93e4b/source/is-any.d.ts#L33).
 * @private
 */
type IsAny<T> = 0 extends 1 & NoInfer<T> ? true : false;

/**
 * Convert a `string` type to a `number` type.
 * @private
 */
type StringToNumber<S> = S extends `${infer N extends number}` ? N : never;

/**
 * Get numeric index of an object or a tuple type.
 * @private
 */
type IndexOf<T, Counter extends void[] = [], Acc extends number = never> =
  T extends readonly unknown[] ?
    Counter["length"] extends T["length"] ?
      Acc & keyof T
    : IndexOf<T, [...Counter, void], Acc | Counter["length"]>
  : keyof T & number;

/**
 * Simply merge two object types and t. Optional keys are not considered.
 * @private
 */
// NOTE: DO NOT add `extends infer R ? { [K in keyof R]: R[K] } : never` after the type definition
// (which is a common hacking to make type information more readable), since it will cause
// TypeScript to deeply evaluate the type, which we’ll lose tuple labels in the process.
type Merge<L, R> = {
  // This `readonly` modifier amazingly makes TS to infer a more readable type in some cases,
  // e.g., `function safeDiv(n: number, d: number) { return d === 0 ? none : some(n / d); }`
  // will infer `Option<number>` instead of `Constructor<OptionHKT, "None"> | Option<number>`.
  // I don’t understand why it works, but it works.
  readonly [K in keyof L | keyof R]: K extends keyof L ? L[K]
  : K extends keyof R ? R[K]
  : never;
};

/**
 * {@link Merge} multiple object types. Optional keys are not considered.
 * @private
 */
type Spread<A, B, C = {}, D = {}, E = {}, F = {}, G = {}, H = {}> =
  Merge<A, Merge<B, Merge<C, Merge<D, Merge<E, Merge<F, Merge<G, H>>>>>>> extends infer R ?
    { [K in keyof R]: R[K] }
  : never;

/**
 * Add labels to a tuple type.
 * @private
 *
 * @example
 * ```typescript
 * type _1 = AddLabels<[1, 2, 3], [a: void, b: void, c: void]>; // => [a: 1, b: 2, c: 3]
 * type _2 = AddLabels<[1, 2, 3], [a: void, b: void]>; // => [a: 1, b: 2, 3]
 * type _3 = AddLabels<[1, 2], [a: void, b: void, c: void]>; // => [a: 1, b: 2]
 * ```
 */
type AddLabels<
  TS extends unknown[],
  Labels extends readonly unknown[],
  Acc extends unknown[] = [],
> =
  Labels extends [unknown, ...infer RestLabels] ?
    TS extends [infer Head, ...infer Tail] ?
      AddLabels<Tail, RestLabels, [...Acc, ...WrapLabel<Head, HeadPart<Labels>>]>
    : Acc
  : [...Acc, ...TS];
type WrapLabel<T, Label> =
  { [K in keyof Label]: T } extends infer Part extends readonly [unknown] ? Part : never;

/**
 * Remove the first element from a tuple type (label is preserved).
 * @private
 *
 * @example
 * ```typescript
 * type _1 = Tail<[1, 2, 3]>; // => [2, 3]
 * type _2 = Tail<[1]>; // => []
 * type _3 = Tail<[]>; // => []
 * type _4 = Tail<[a: 1, b: 2, c: 3]>; // => [b: 2, c: 3]
 * ```
 */
type Tail<TS> =
  TS extends [unknown, ...infer Tail] ? Tail
  : TS extends readonly [unknown, ...infer Tail] ? readonly [...Tail]
  : TS extends [] ? []
  : TS extends readonly [] ? readonly []
  : never;
/**
 * Get the initial elements of a tuple type (label is preserved).
 * @private
 *
 * @example
 * ```typescript
 * type _1 = Init<[1, 2, 3]>; // => [1, 2]
 * type _2 = Init<[1]>; // => []
 * type _3 = Init<[]>; // => []
 * type _4 = Init<[a: 1, b: 2, c: 3]>; // => [a: 1, b: 2]
 * ```
 */
type Init<TS> =
  TS extends [...infer Init, unknown] ? Init
  : TS extends readonly [...infer Init, unknown] ? readonly [...Init]
  : TS extends [] ? []
  : TS extends readonly [] ? readonly []
  : never;
/**
 * Get the head part of a tuple type (label is preserved).
 * @private
 *
 * @example
 * ```typescript
 * type _1 = HeadPart<[1, 2, 3]>; // => [1]
 * type _2 = HeadPart<[1]>; // => [1]
 * type _3 = HeadPart<[]>; // => []
 * type _4 = HeadPart<[a: 1, b: 2, c: 3]>; // => [a: 1]
 * ```
 */
type HeadPart<TS, Result = TS> =
  Result extends readonly [] | readonly [unknown] ? Result : HeadPart<Tail<TS>, Init<Result>>;

/***************
 * HKT related *
 ***************/
/**
 * An **HKT** (**H**igher-**K**inded **T**ype) compatible with the
 * [hkt-core](https://github.com/Snowflyt/hkt-core) V1 standard.
 */
interface TypeLambda<in Params extends unknown[] = any, out RetType = any> {
  /**
   * Metadata of the {@linkcode TypeLambda}.
   */
  readonly "~hkt": TypeLambdaMeta;

  /**
   * type-level signature of the {@linkcode TypeLambda}.
   */
  readonly signature: (...args: Params) => RetType;
}
/**
 * Metadata of a {@linkcode TypeLambda}.
 */
interface TypeLambdaMeta {
  /**
   * The version number of the {@linkcode TypeLambda} specification.
   */
  readonly version: 1;
}

/**
 * Apply an HKT with arguments.
 */
type ApplyHKT<F, Args> =
  F & { readonly Args: (_: Args) => void } extends infer F extends { readonly return: unknown } ?
    F["return"]
  : never;

/**
 * Get the declared parameter types of an HKT.
 */
type HKTParams<F> =
  F extends { readonly signature: (...args: infer Params) => unknown } ? Params : never;

/**
 * Get a _tolerant_ result of an HKT.
 * @private
 *
 * @example
 * ```typescript
 * interface OptionHKT extends HKT {
 *   return: Option<Arg0<this>>;
 * }
 *
 * type _1 = TolerantResult<OptionHKT>; // => Option<unknown>
 * ```
 */
export type TolerantResult<F extends TypeLambda> =
  HKTParams<F> extends infer Params extends unknown[] ?
    ApplyHKT<
      F,
      {
        [K in keyof Params]: _TestParameterVarianceAtIndex<F, StringToNumber<K>> extends (
          infer Variance
        ) ?
          Variance extends "invariant" ? any
          : Variance extends "contravariant" ? never
          : _UpperBound<Params[K]>
        : never;
      }
    >
  : never;
// Infer the variance of each type parameter for a specific parameter or return type
// The implementation refers to the description of variance inference in the Python typing
// documentation: https://typing.readthedocs.io/en/latest/spec/generics.html#variance-inference
type _TestParameterVarianceAtIndex<F extends TypeLambda, Index extends number> =
  HKTParams<F> extends infer Params extends unknown[] ?
    _CheckVariance<
      ApplyHKT<F, { [K in keyof Params]: never }>,
      ApplyHKT<
        F,
        { [K in keyof Params]: StringToNumber<K> extends Index ? _UpperBound<Params[K]> : never }
      >
    >
  : never;
type _UpperBound<T> = IsAny<T> extends true ? unknown : T;
type _CheckVariance<Lower, Upper> =
  [Lower] extends [Upper] ?
    [Upper] extends [Lower] ?
      "irrelevant"
    : "covariant"
  : [Upper] extends [Lower] ? "contravariant"
  : "invariant";
