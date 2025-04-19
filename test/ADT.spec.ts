import { pipe } from "effect";
import type { Arg0, Arg1, HKT, HKT2 } from "hkt-core";
import { describe, expect, it } from "vitest";

import type { Data, Tagged } from "../src";
import { make, unwrap } from "../src";

describe("ADT.<Tag>", () => {
  it("should generate constructors without runtime variants", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    expect(IpAddr.V4(127, 0, 0, 1)).toEqual({ _tag: "V4", _0: 127, _1: 0, _2: 0, _3: 1 });
    expect(IpAddr.V6("::1")).toEqual({ _tag: "V6", _0: "::1" });
  });

  it("should generate constructors with runtime variants", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>(["Some", "None"]);
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(Option.Some(42)).toEqual({ _tag: "Some", _0: 42 });
    expect(Option.None._tag).toBe("None");
    expect(Option.None()).toEqual({ _tag: "None" });
  });
});

describe("unwrap", () => {
  it("should extract the fields of an ADT", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    expect(unwrap(IpAddr.V4(127, 0, 0, 1))).toEqual([127, 0, 0, 1]);
    expect(unwrap(IpAddr.V6("::1"))).toEqual(["::1"]);
  });
});

describe("ADT.match(W)", () => {
  it("should generate match functions without runtime variants", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    function safeDiv(a: number, b: number): Option<number> {
      if (b === 0) return Option.None;
      return Option.Some(a / b);
    }

    const result = Option.match(safeDiv(42, 2), {
      Some: (n) => `Result: ${n}`,
      None: () => "Oops!",
    });
    expect(result).toEqual("Result: 21");

    const result2 = Option.match(safeDiv(42, 0), {
      Some: (n) => `Result: ${n}`,
      _: () => "Oops!",
    });
    expect(result2).toEqual("Oops!");

    const resultW = Option.matchW(safeDiv(42, 2), {
      Some: (n) => `Result: ${n}`,
      None: () => 42,
    });
    expect(resultW).toEqual("Result: 21");

    const resultW2 = Option.matchW(safeDiv(42, 0), {
      Some: (n) => `Result: ${n}`,
      _: () => 42,
    });
    expect(resultW2).toEqual(42);
  });

  it("should generate curried match functions without runtime variants", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    function safeDiv(a: number, b: number): Option<number> {
      if (b === 0) return Option.None;
      return Option.Some(a / b);
    }

    const result = pipe(
      safeDiv(42, 2),
      Option.match({
        Some: (n) => `Result: ${n}`,
        None: () => "Oops!",
      }),
    );
    expect(result).toEqual("Result: 21");

    const result2 = pipe(
      safeDiv(42, 0),
      Option.match({
        Some: (n) => `Result: ${n}`,
        _: () => "Oops!",
      }),
    );
    expect(result2).toEqual("Oops!");

    const resultW = pipe(
      safeDiv(42, 2),
      Option.matchW({
        Some: (n) => `Result: ${n}`,
        None: () => 42,
      }),
    );
    expect(resultW).toEqual("Result: 21");

    const resultW2 = pipe(
      safeDiv(42, 0),
      Option.matchW({
        Some: (n) => `Result: ${n}`,
        _: () => 42,
      }),
    );
    expect(resultW2).toEqual(42);
  });

  it("should generate match functions with runtime variants", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>(["Ok", "Err"]);
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    function safeDiv(a: number, b: number): Result<number, string> {
      if (b === 0) return Result.Err("Division by zero");
      return Result.Ok(a / b);
    }

    const result = Result.match(safeDiv(42, 2), {
      Ok: (n) => `Result: ${n}`,
      Err: (e) => `Error: ${e}`,
    });
    expect(result).toEqual("Result: 21");

    const result2 = Result.match(safeDiv(42, 0), {
      Ok: (n) => `Result: ${n}`,
      _: (res) => `Error: ${res._tag} - ${res._0}`,
    });
    expect(result2).toEqual("Error: Err - Division by zero");

    const resultW = Result.matchW(safeDiv(42, 2), {
      Ok: (n) => `Result: ${n}`,
      Err: () => 42,
    });
    expect(resultW).toEqual("Result: 21");

    const resultW2 = Result.matchW(safeDiv(42, 0), {
      Ok: (n) => `Result: ${n}`,
      _: () => 42,
    });
    expect(resultW2).toEqual(42);
  });

  it("should generate match functions with runtime variants", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>(["Ok", "Err"]);
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    function safeDiv(a: number, b: number): Result<number, string> {
      if (b === 0) return Result.Err("Division by zero");
      return Result.Ok(a / b);
    }

    const result = pipe(
      safeDiv(42, 2),
      Result.match({
        Ok: (n) => `Result: ${n}`,
        Err: (e) => `Error: ${e}`,
      }),
    );
    expect(result).toEqual("Result: 21");

    const result2 = pipe(
      safeDiv(42, 0),
      Result.match({
        Ok: (n) => `Result: ${n}`,
        _: (res) => `Error: ${res._tag} - ${res._0}`,
      }),
    );
    expect(result2).toEqual("Error: Err - Division by zero");

    const resultW = pipe(
      safeDiv(42, 2),
      Result.matchW({
        Ok: (n) => `Result: ${n}`,
        Err: () => 42,
      }),
    );
    expect(resultW).toEqual("Result: 21");

    const resultW2 = pipe(
      safeDiv(42, 0),
      Result.matchW({
        Ok: (n) => `Result: ${n}`,
        _: () => 42,
      }),
    );
    expect(resultW2).toEqual(42);
  });
});

describe("ADT.if*", () => {
  it("should generate type guards without runtime variants", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    expect(IpAddr.isV4(IpAddr.V4(127, 0, 0, 1))).toBe(true);
    expect(IpAddr.isV4(IpAddr.V6("::1"))).toBe(false);

    expect(IpAddr.isV6(IpAddr.V4(127, 0, 0, 1))).toBe(false);
    expect(IpAddr.isV6(IpAddr.V6("::1"))).toBe(true);
  });

  it("should generate type guards with runtime variants", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>(["Ok", "Err"]);
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    expect(Result.isOk(Result.Ok(42))).toBe(true);
    expect(Result.isOk(Result.Err("Error"))).toBe(false);

    expect(Result.isErr(Result.Ok(42))).toBe(false);
    expect(Result.isErr(Result.Err("Error"))).toBe(true);
  });
});

describe("ADT.unwrap", () => {
  it("should extract the fields of an ADT without runtime variants", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    type Some<T> = Extract<Option<T>, Tagged<"Some">>;
    type None = Extract<Option<unknown>, Tagged<"None">>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(Option.unwrap(Option.Some(42))).toEqual([42]);
    expect(Option.unwrap(Option.None)).toEqual([]);
    expect(Option.unwrap(Option.None())).toEqual([]);

    expect(Option.unwrapSome(Option.Some(42) as Some<number>)).toEqual([42]);
    expect(Option.unwrapNone(Option.None as None)).toEqual([]);
  });

  it("should extract the fields of an ADT with runtime variants", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    type Ok<T> = Extract<Result<T, unknown>, Tagged<"Ok">>;
    type Err<E> = Extract<Result<unknown, E>, Tagged<"Err">>;

    const Result = make<ResultHKT>(["Ok", "Err"]);
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    expect(Result.unwrap(Result.Ok(42))).toEqual([42]);
    expect(Result.unwrap(Result.Err("Error"))).toEqual(["Error"]);

    expect(Result.unwrapOk(Result.Ok(42) as Ok<number>)).toEqual([42]);
    expect(Result.unwrapErr(Result.Err("Error") as Err<string>)).toEqual(["Error"]);
  });
});

describe("ADT.if*", () => {
  it("should generate conditional deconstructors without runtime variants", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>();
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    expect(Result.ifOk(Result.Ok(42), (n) => n * 2)).toEqual(84);
    expect(Result.ifOk(Result.Err("Oops!"), (n) => n * 2)).toEqual(undefined);
    expect(
      Result.ifOk(
        Result.Ok(42),
        (n) => n * 2,
        () => "Error",
      ),
    ).toEqual(84);
    expect(
      Result.ifOk(
        Result.Err("Oops!"),
        (n) => n * 2,
        () => "Error",
      ),
    ).toEqual("Error");

    expect(Result.ifErr(Result.Ok(42), (e) => e)).toEqual(undefined);
    expect(Result.ifErr(Result.Err("Oops!"), (e) => e)).toEqual("Oops!");
    expect(
      Result.ifErr(
        Result.Ok(42),
        (e) => e,
        () => "Error",
      ),
    ).toEqual("Error");
    expect(
      Result.ifErr(
        Result.Err("Oops!"),
        (e) => e,
        () => "Error",
      ),
    ).toEqual("Oops!");
  });

  it("should generate conditional deconstructors with runtime variants", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>(["Some", "None"]);
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(Option.ifSome(Option.Some(42), (n) => n * 2)).toEqual(84);
    expect(Option.ifSome(Option.None, (n: number) => n * 2)).toEqual(undefined);
    expect(
      Option.ifSome(
        Option.Some(42),
        (n) => n * 2,
        () => "Error",
      ),
    ).toEqual(84);
    expect(
      Option.ifSome(
        Option.None,
        (n: number) => n * 2,
        () => "Error",
      ),
    ).toEqual("Error");

    expect(Option.ifNone(Option.Some(42), () => "Error")).toEqual(undefined);
    expect(Option.ifNone(Option.None, () => "Error")).toEqual("Error");
    expect(
      Option.ifNone(
        Option.Some(42),
        () => "Error",
        (opt) => opt,
      ),
    ).toEqual(Option.Some(42));
    expect(
      Option.ifNone(
        Option.None,
        () => "Error",
        (opt) => opt,
      ),
    ).toEqual("Error");
  });
});
