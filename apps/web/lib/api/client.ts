/**
 * Shared Bivium backend client config.
 *
 * Override the base URL by setting `NEXT_PUBLIC_BIVIUM_API_URL` in
 * `.env.local`. Falls back to the dev nip.io endpoint so the app boots
 * out-of-the-box.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_BIVIUM_API_URL ??
  "https://100-51-51-210.nip.io/api/v1";
