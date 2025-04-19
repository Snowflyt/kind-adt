import { pipe } from "effect";
import type { Arg0, Arg1, HKT, HKT2 } from "hkt-core";
import { describe, equal, expect, it } from "typroof";

import type { Data, Tagged } from "../src";
import { make, unwrap } from "../src";

describe("Data", () => {
  it("should create non-generic ADTs", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    type V4 = Extract<IpAddr, Tagged<"V4">>;
    type V6 = Extract<IpAddr, Tagged<"V6">>;

    expect<V4>().to(
      equal<{
        readonly _tag: "V4";
        readonly _0: number;
        readonly _1: number;
        readonly _2: number;
        readonly _3: number;
      }>,
    );
    expect<V6>().to(
      equal<{
        readonly _tag: "V6";
        readonly _0: string;
      }>,
    );
    expect<IpAddr>().to(equal<V4 | V6>);
  });

  it("should create generic ADTs", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    type Some<T> = Extract<Option<T>, Tagged<"Some">>;
    type None = Extract<Option<unknown>, Tagged<"None">>;

    expect<Some<number>>().to(
      equal<{
        readonly _tag: "Some";
        readonly _0: number;
      }>,
    );
    expect<None>().to(
      equal<{
        readonly _tag: "None";
      }>,
    );
    expect<Option<number>>().to(equal<Some<number> | None>);
  });

  it("should support syntax sugar for ADTs with only one object field", () => {
    type Tree<T> = Data<{
      Empty: {};
      Node: { value: T; left: Tree<T>; right: Tree<T> };
    }>;

    type Empty = Extract<Tree<unknown>, Tagged<"Empty">>;
    type Node<T> = Extract<Tree<T>, Tagged<"Node">>;

    expect<Empty>().to(
      equal<{
        readonly _tag: "Empty";
      }>,
    );
    expect<Node<number>>().to(
      equal<{
        readonly _tag: "Node";
        readonly _0: {
          value: number;
          left: Tree<number>;
          right: Tree<number>;
        };
      }>,
    );
    expect<Tree<number>>().to(equal<Empty | Node<number>>);
  });

  it("should create recursive ADTs", () => {
    {
      type Tree<T> = Data<{
        Empty: [];
        Node: { 0: T; 1: Tree<T>; 2: Tree<T> };
      }>;

      type Empty = Extract<Tree<unknown>, Tagged<"Empty">>;
      type Node<T> = Extract<Tree<T>, Tagged<"Node">>;

      expect<Empty>().to(
        equal<{
          readonly _tag: "Empty";
        }>,
      );
      expect<Node<number>>().to(
        equal<{
          readonly _tag: "Node";
          readonly _0: number;
          readonly _1: Tree<number>;
          readonly _2: Tree<number>;
        }>,
      );
      expect<Tree<number>>().to(equal<Empty | Node<number>>);
    }

    {
      type Tree<T> = Data<{
        Empty: [];
        Node: {
          __labels: [value: void, left: void, right: void];
          0: T;
          1: Tree<T>;
          2: Tree<T>;
        };
      }>;

      type Empty = Extract<Tree<unknown>, Tagged<"Empty">>;
      type Node<T> = Extract<Tree<T>, Tagged<"Node">>;

      expect<Empty>().to(
        equal<{
          readonly _tag: "Empty";
        }>,
      );
      expect<Node<number>>().to(
        equal<{
          readonly _tag: "Node";
          readonly _0: number;
          readonly _1: Tree<number>;
          readonly _2: Tree<number>;
        }>,
      );
      expect<Tree<number>>().to(equal<Empty | Node<number>>);
    }
  });
});

describe("unwrap", () => {
  it("should extract the fields of a non-generic ADT", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    const ip = IpAddr.V4(127, 0, 0, 1);
    if (IpAddr.isV4(ip)) {
      const [a, b, c, d] = unwrap(ip);
      expect(a).to(equal<number>);
      expect(b).to(equal<number>);
      expect(c).to(equal<number>);
      expect(d).to(equal<number>);
    }
    if (IpAddr.isV6(ip)) {
      const [addr] = unwrap(ip);
      expect(addr).to(equal<string>);
    }
  });

  it("should extract the fields of a generic ADT", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    const option = Option.Some(42);
    if (Option.isSome(option)) {
      const [value] = unwrap(option);
      expect(value).to(equal<number>);
    }
    if (Option.isNone(option)) {
      expect(unwrap(option)).to(equal<[]>);
    }
  });
});

describe("ADT.<Tag>", () => {
  it("should generate constructors for non-generic ADTs", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    expect(IpAddr.V4).to(
      equal<
        { readonly _tag: "V4" } & ((
          args_0: number,
          args_1: number,
          args_2: number,
          args_3: number,
        ) => IpAddr)
      >,
    );
    expect(IpAddr.V4(127, 0, 0, 1)).to(equal<IpAddr>);

    expect(IpAddr.V6).to(equal<{ readonly _tag: "V6" } & ((args_0: string) => IpAddr)>);
    expect(IpAddr.V6("::1")).to(equal<IpAddr>);
  });

  it("should generate constructors for generic ADTs", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(Option.Some).to(equal<{ readonly _tag: "Some" } & (<T = never>(value: T) => Option<T>)>);
    expect(Option.Some(42)).to(equal<Option<number>>);

    expect(Option.None).to(equal<{ readonly _tag: "None" } & (<T = never>() => Option<T>)>);
    expect(Option.None()).to(equal<Option<never>>);
    expect(Option.None<number>()).to(equal<Option<number>>);
  });
});

describe("ADT.match(W)", () => {
  it("should generate match functions for non-generic ADTs", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    const addr = IpAddr.match(IpAddr.V4(127, 0, 0, 1), {
      V4: (a, b, c, d) => {
        expect(a).to(equal<number>);
        expect(b).to(equal<number>);
        expect(c).to(equal<number>);
        expect(d).to(equal<number>);
        return `${a}.${b}.${c}.${d}`;
      },
      V6: (addr) => {
        expect(addr).to(equal<string>);
        return addr;
      },
    });
    expect(addr).to(equal<string>);

    const addr2 = IpAddr.match(IpAddr.V4(127, 0, 0, 1), {
      V4: (a, b, c, d) => {
        expect(a).to(equal<number>);
        expect(b).to(equal<number>);
        expect(c).to(equal<number>);
        expect(d).to(equal<number>);
        return `${a}.${b}.${c}.${d}`;
      },
      _: (addr) => {
        expect(addr).to(equal<IpAddr>);
        return addr._0 as string;
      },
    });
    expect(addr2).to(equal<string>);

    const addrW = IpAddr.matchW(IpAddr.V4(127, 0, 0, 1), {
      V4: (a, b, c, d) => {
        expect(a).to(equal<number>);
        expect(b).to(equal<number>);
        expect(c).to(equal<number>);
        expect(d).to(equal<number>);
        return [a, b, c, d];
      },
      V6: (addr) => {
        expect(addr).to(equal<string>);
        return addr;
      },
    });
    expect(addrW).to(equal<number[] | string>);

    const addrW2 = IpAddr.matchW(IpAddr.V4(127, 0, 0, 1), {
      V4: (a, b, c, d) => {
        expect(a).to(equal<number>);
        expect(b).to(equal<number>);
        expect(c).to(equal<number>);
        expect(d).to(equal<number>);
        return [a, b, c, d];
      },
      _: (addr) => {
        expect(addr).to(equal<IpAddr>);
        return addr;
      },
    });
    expect(addrW2).to(equal<number[] | IpAddr>);
  });

  it("should generate curried match functions for non-generic ADTs", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    const addr = pipe(
      IpAddr.V4(127, 0, 0, 1),
      IpAddr.match({
        V4: (a, b, c, d) => {
          expect(a).to(equal<number>);
          expect(b).to(equal<number>);
          expect(c).to(equal<number>);
          expect(d).to(equal<number>);
          return `${a}.${b}.${c}.${d}`;
        },
        V6: (addr) => {
          expect(addr).to(equal<string>);
          return addr;
        },
      }),
    );
    expect(addr).to(equal<string>);

    const addr2 = pipe(
      IpAddr.V4(127, 0, 0, 1),
      IpAddr.match({
        V4: (a, b, c, d) => {
          expect(a).to(equal<number>);
          expect(b).to(equal<number>);
          expect(c).to(equal<number>);
          expect(d).to(equal<number>);
          return `${a}.${b}.${c}.${d}`;
        },
        _: (addr) => {
          expect(addr).to(equal<IpAddr>);
          return addr._0 as string;
        },
      }),
    );
    expect(addr2).to(equal<string>);

    const addrW = pipe(
      IpAddr.V4(127, 0, 0, 1),
      IpAddr.matchW({
        V4: (a, b, c, d) => {
          expect(a).to(equal<number>);
          expect(b).to(equal<number>);
          expect(c).to(equal<number>);
          expect(d).to(equal<number>);
          return [a, b, c, d];
        },
        V6: (addr) => {
          expect(addr).to(equal<string>);
          return addr;
        },
      }),
    );
    expect(addrW).to(equal<number[] | string>);

    const addrW2 = pipe(
      IpAddr.V4(127, 0, 0, 1),
      IpAddr.matchW({
        V4: (a, b, c, d) => {
          expect(a).to(equal<number>);
          expect(b).to(equal<number>);
          expect(c).to(equal<number>);
          expect(d).to(equal<number>);
          return [a, b, c, d];
        },
        _: (addr) => {
          expect(addr).to(equal<IpAddr>);
          return addr;
        },
      }),
    );
    expect(addrW2).to(equal<number[] | IpAddr>);
  });

  it("should generate match functions for generic ADTs", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>();
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    function safeDiv(a: number, b: number): Result<number, string> {
      return b === 0 ? Result.Err("Division by zero") : Result.Ok(a / b);
    }

    const result = Result.match(safeDiv(1, 2), {
      Ok: (value) => {
        expect(value).to(equal<number>);
        return `Result: ${value}`;
      },
      Err: (error) => {
        expect(error).to(equal<string>);
        return `Error: ${error}`;
      },
    });
    expect(result).to(equal<string>);

    const result2 = Result.match(safeDiv(1, 0), {
      Ok: (value) => {
        expect(value).to(equal<number>);
        return `Result: ${value}`;
      },
      _: (res) => {
        expect(res).to(equal<Result<number, string>>);
        return "Oops!";
      },
    });
    expect(result2).to(equal<string>);

    const resultW = Result.matchW(safeDiv(1, 2), {
      Ok: (value) => {
        expect(value).to(equal<number>);
        return value;
      },
      Err: (error) => {
        expect(error).to(equal<string>);
        return error;
      },
    });
    expect(resultW).to(equal<number | string>);

    const resultW2 = Result.matchW(safeDiv(1, 0), {
      Ok: (value) => {
        expect(value).to(equal<number>);
        return value;
      },
      _: (res) => {
        expect(res).to(equal<Result<number, string>>);
        return res;
      },
    });
    expect(resultW2).to(equal<number | Result<number, string>>);
  });

  it("should generate curried match functions for generic ADTs", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>();
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    function safeDiv(a: number, b: number): Result<number, string> {
      return b === 0 ? Result.Err("Division by zero") : Result.Ok(a / b);
    }

    const result = pipe(
      safeDiv(1, 2),
      Result.match({
        Ok: (value) => {
          expect(value).to(equal<number>);
          return `Result: ${value}`;
        },
        Err: (error) => {
          expect(error).to(equal<string>);
          return `Error: ${error}`;
        },
      }),
    );
    expect(result).to(equal<string>);

    const result2 = pipe(
      safeDiv(1, 0),
      Result.match({
        Ok: (value) => {
          expect(value).to(equal<number>);
          return `Result: ${value}`;
        },
        _: (res) => {
          expect(res).to(equal<Result<number, string>>);
          return "Oops!";
        },
      }),
    );
    expect(result2).to(equal<string>);

    const resultW = pipe(
      safeDiv(1, 2),
      Result.matchW({
        Ok: (value) => {
          expect(value).to(equal<number>);
          return value;
        },
        Err: (error) => {
          expect(error).to(equal<string>);
          return error;
        },
      }),
    );
    expect(resultW).to(equal<number | string>);

    const resultW2 = pipe(
      safeDiv(1, 0),
      Result.matchW({
        Ok: (value) => {
          expect(value).to(equal<number>);
          return value;
        },
        _: (res) => {
          expect(res).to(equal<Result<number, string>>);
          return res;
        },
      }),
    );
    expect(resultW2).to(equal<number | Result<number, string>>);
  });
});

describe("ADT.if*", () => {
  it("should generate type guards for non-generic ADTs", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    const IpAddr = make<IpAddr>();

    expect(IpAddr.isV4).to(
      equal<(value: IpAddr) => value is Tagged<"V4", [number, number, number, number]>>,
    );
    expect(IpAddr.isV6).to(equal<(value: IpAddr) => value is Tagged<"V6", [string]>>);
  });

  it("should generate type guards for generic ADTs", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>();
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    expect(Option.isSome).to(equal<(value: Option<unknown>) => value is Tagged<"Some", [unknown]>>);
    expect(Option.isNone).to(equal<(value: Option<unknown>) => value is Tagged<"None", []>>);
  });
});

describe("ADT.unwrap*", () => {
  it("should extract the fields of a non-generic ADT", () => {
    type Option<T> = Data<{
      Some: [value: T];
      None: [];
    }>;

    const Option = make<OptionHKT>(["Some", "None"]);
    interface OptionHKT extends HKT {
      return: Option<Arg0<this>>;
    }

    const opt = Option.Some(42);
    if (Option.isSome(opt)) {
      const [value1] = Option.unwrap(opt);
      expect(value1).to(equal<number>);
      const [value2] = Option.unwrapSome(opt);
      expect(value2).to(equal<number>);
    }
    if (Option.isNone(opt)) {
      expect(Option.unwrap(opt)).to(equal<[]>);
      expect(Option.unwrapNone(opt)).to(equal<[]>);
    }
  });

  it("should extract the fields of a generic ADT", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    const Result = make<ResultHKT>();
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    const res = Result.Ok<number, string | Error>(42);
    if (Result.isOk(res)) {
      const [value1] = Result.unwrap(res);
      expect(value1).to(equal<number>);
      const [value2] = Result.unwrapOk(res);
      expect(value2).to(equal<number>);
    }
    if (Result.isErr(res)) {
      const [error1] = Result.unwrap(res);
      expect(error1).to(equal<string | Error>);
      const [error2] = Result.unwrapErr(res);
      expect(error2).to(equal<string | Error>);
    }
  });
});

describe("ADT.if*", () => {
  it("should generate optional deconstructors for non-generic ADTs", () => {
    type IpAddr = Data<{
      V4: [number, number, number, number];
      V6: [string];
    }>;

    type V4 = Extract<IpAddr, Tagged<"V4">>;
    type V6 = Extract<IpAddr, Tagged<"V6">>;

    const IpAddr = make<IpAddr>();

    const ip = IpAddr.V4(127, 0, 0, 1);

    IpAddr.ifV4(ip, (a, b, c, d) => {
      expect(a).to(equal<number>);
      expect(b).to(equal<number>);
      expect(c).to(equal<number>);
      expect(d).to(equal<number>);
    });
    const result1 = IpAddr.ifV4(ip, (a, b, c, d) => {
      expect(a).to(equal<number>);
      expect(b).to(equal<number>);
      expect(c).to(equal<number>);
      expect(d).to(equal<number>);
      return `${a}.${b}.${c}.${d}`;
    });
    expect(result1).to(equal<string | void>);
    const result2 = IpAddr.ifV4(
      ip,
      (a, b, c, d) => {
        expect(a).to(equal<number>);
        expect(b).to(equal<number>);
        expect(c).to(equal<number>);
        expect(d).to(equal<number>);
        return `${a}.${b}.${c}.${d}`;
      },
      (addr) => {
        expect(addr).to(equal<V6>);
        return addr;
      },
    );
    expect(result2).to(equal<string | V6>);

    IpAddr.ifV6(ip, (addr) => {
      expect(addr).to(equal<string>);
    });
    const result3 = IpAddr.ifV6(ip, (addr) => {
      expect(addr).to(equal<string>);
      return addr;
    });
    expect(result3).to(equal<string | void>);
    const result4 = IpAddr.ifV6(
      ip,
      (addr) => {
        expect(addr).to(equal<string>);
        return addr;
      },
      (addr) => {
        expect(addr).to(equal<V4>);
        return addr;
      },
    );
    expect(result4).to(equal<string | V4>);
  });

  it("should generate optional deconstructors for generic ADTs", () => {
    type Result<T, E> = Data<{
      Ok: [value: T];
      Err: [error: E];
    }>;

    type Ok<T> = Extract<Result<T, unknown>, Tagged<"Ok">>;
    type Err<E> = Extract<Result<unknown, E>, Tagged<"Err">>;

    const Result = make<ResultHKT>();
    interface ResultHKT extends HKT2 {
      return: Result<Arg0<this>, Arg1<this>>;
    }

    const res = Result.Ok<number, string | Error>(42);

    Result.ifOk(res, (value) => {
      expect(value).to(equal<number>);
    });
    const result1 = Result.ifOk(res, (value) => {
      expect(value).to(equal<number>);
      return value;
    });
    expect(result1).to(equal<number | void>);
    const result2 = Result.ifOk(
      res,
      (value) => {
        expect(value).to(equal<number>);
        return value;
      },
      (err) => {
        expect(err).to(equal<Err<string | Error>>);
        return err;
      },
    );
    expect(result2).to(equal<number | Err<string | Error>>);

    Result.ifErr(res, (error) => {
      expect(error).to(equal<string | Error>);
    });
    const result3 = Result.ifErr(res, (error) => {
      expect(error).to(equal<string | Error>);
      return error;
    });
    expect(result3).to(equal<string | Error | void>);
    const result4 = Result.ifErr(
      res,
      (error) => {
        expect(error).to(equal<string | Error>);
        return error;
      },
      (value) => {
        expect(value).to(equal<Ok<number>>);
        return value;
      },
    );
    expect(result4).to(equal<string | Error | Ok<number>>);
  });
});
