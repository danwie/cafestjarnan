import { describe, it, expect } from "bun:test";
import { PlayerSchema } from "./player";

describe("PlayerSchema", () => {
  it("accepterar en giltig spelare", () => {
    const r = PlayerSchema.safeParse({ id: "a1", name: "Kalle", highscore: 10 });
    expect(r.success).toBe(true);
  });

  it("avvisar negativ highscore", () => {
    const r = PlayerSchema.safeParse({ id: "a1", name: "Kalle", highscore: -1 });
    expect(r.success).toBe(false);
  });
});
