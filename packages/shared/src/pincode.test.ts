import { describe, expect, it } from "vitest";
import { Pincode } from "./pincode";

describe("Pincode schema", () => {
  it.each(["110001", "560034", " 400001 "])("accepts %s", (pin) => {
    expect(Pincode.safeParse(pin).success).toBe(true);
  });

  it.each(["", "12345", "1234567", "012345", "56A034"])("rejects %s", (pin) => {
    expect(Pincode.safeParse(pin).success).toBe(false);
  });
});
