export const AssetType = {
	NATIVE: "NATIVE",
	ERC20: "ERC20",
} as const;

export type AssetType = (typeof AssetType)[keyof typeof AssetType];
