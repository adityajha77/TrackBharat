import { z } from "zod";

/**
 * Indian PIN codes are 6 digits and never start with 0.
 * The first digit is the postal region (1–8 for regular mail, 9 for the Army Postal Service).
 */
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const Pincode = z
  .string()
  .trim()
  .regex(PINCODE_REGEX, "A PIN code is 6 digits and cannot start with 0");
export type Pincode = z.infer<typeof Pincode>;

export const PostOffice = z.object({
  name: z.string(),
  branchType: z.string(),
  deliveryStatus: z.string(),
  block: z.string().nullable(),
  district: z.string(),
  state: z.string(),
});
export type PostOffice = z.infer<typeof PostOffice>;

export const PincodeLookupResponse = z.object({
  pincode: Pincode,
  district: z.string(),
  state: z.string(),
  postOffices: z.array(PostOffice),
  /**
   * "cache" = served from our Postgres, "upstream" = freshly fetched from India Post.
   * Exposed so you can watch the cache work while learning.
   */
  source: z.enum(["cache", "upstream"]),
  fetchedAt: z.iso.datetime(),
});
export type PincodeLookupResponse = z.infer<typeof PincodeLookupResponse>;
