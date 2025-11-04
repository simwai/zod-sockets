import { z } from "zod";
import { Action } from "./action";
import { ActionsFactory } from "./actions-factory";
import { createSimpleConfig } from "./config";

describe("ActionsFactory", () => {
  const factory = new ActionsFactory(createSimpleConfig());

  describe("constructor", () => {
    test("should create a factory", () => {
      expect(factory).toBeInstanceOf(ActionsFactory);
    });

    test("should produce actions", () => {
      expect(
        factory.build({
          event: "test",
          input: z.tuple([z.string()]),
          handler: vi.fn<any>(),
        }),
      ).toBeInstanceOf(Action);
    });
  });

  describe("build", () => {
    test("should handle actions without output", () => {
      const action = factory.build({
        event: "noAck",
        input: z.tuple([]),
        handler: async () => {},
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle actions with output (plain return)", () => {
      const action = factory.build({
        event: "withAck",
        input: z.tuple([]),
        output: z.tuple([z.object({ result: z.string() })]),
        handler: async () => {
          return [{ result: "success" }];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle conditional returns (discriminated union)", () => {
      const action = factory.build({
        event: "conditional",
        input: z.tuple([z.boolean()]),
        output: z.tuple([
          z.object({
            success: z.boolean(),
            data: z.string().optional(),
          }),
        ]),
        handler: async ({ input: [shouldFail] }) => {
          if (shouldFail) {
            return [{ success: false }];
          }
          return [{ success: true, data: "result" }];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle as const (readonly tuple)", () => {
      const action = factory.build({
        event: "ping",
        input: z.tuple([]).rest(z.unknown()),
        output: z.tuple([z.literal("pong")]).rest(z.unknown()),
        handler: async ({ input }) => {
          return ["pong", ...input] as const;
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle multiple output elements (plain)", () => {
      const action = factory.build({
        event: "multiReturn",
        input: z.tuple([]),
        output: z.tuple([z.string(), z.number()]),
        handler: async () => {
          return ["text", 42];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle multiple output elements (as const)", () => {
      const action = factory.build({
        event: "multiReturnConst",
        input: z.tuple([]),
        output: z.tuple([z.string(), z.number()]),
        handler: async () => {
          return ["text", 42] as const;
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle nested objects in output", () => {
      const action = factory.build({
        event: "nested",
        input: z.tuple([]),
        output: z.tuple([
          z.object({
            user: z.object({
              id: z.number(),
              name: z.string(),
            }),
            status: z.enum(["active", "inactive"]),
          }),
        ]),
        handler: async () => {
          return [
            {
              user: { id: 1, name: "Alice" },
              status: "active" as const,
            },
          ];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle array elements in output", () => {
      const action = factory.build({
        event: "arrayOutput",
        input: z.tuple([]),
        output: z.tuple([
          z.object({
            items: z.array(z.string()),
            count: z.number(),
          }),
        ]),
        handler: async () => {
          return [{ items: ["a", "b", "c"], count: 3 }];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle conditional with multiple branches", () => {
      const action = factory.build({
        event: "multiCondition",
        input: z.tuple([z.string()]),
        output: z.tuple([
          z.object({
            status: z.enum(["ok", "error", "pending"]),
            message: z.string().optional(),
          }),
        ]),
        handler: async ({ input: [mode] }) => {
          if (mode === "error") {
            return [{ status: "error" as const, message: "Failed" }];
          }
          if (mode === "pending") {
            return [{ status: "pending" as const }];
          }
          return [{ status: "ok" as const, message: "Success" }];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle spread with rest tuples", () => {
      const action = factory.build({
        event: "spread",
        input: z.tuple([z.string()]).rest(z.number()),
        output: z.tuple([z.string()]).rest(z.number()),
        handler: async ({ input: [first, ...rest] }) => {
          return [first, ...rest] as const;
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle empty tuple output", () => {
      const action = factory.build({
        event: "empty",
        input: z.tuple([]),
        output: z.tuple([]),
        handler: async () => {
          return [];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });

    test("should handle optional fields in output object", () => {
      const action = factory.build({
        event: "optional",
        input: z.tuple([z.boolean()]),
        output: z.tuple([
          z.object({
            required: z.string(),
            optional: z.string().optional(),
            nullable: z.string().nullable(),
          }),
        ]),
        handler: async ({ input: [includeOptional] }) => {
          if (includeOptional) {
            return [
              {
                required: "yes",
                optional: "included",
                nullable: "not null",
              },
            ];
          }
          return [
            {
              required: "yes",
              optional: undefined,
              nullable: null,
            },
          ];
        },
      });
      expect(action).toBeInstanceOf(Action);
    });
  });
});
