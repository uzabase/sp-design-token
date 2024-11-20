
// Do not edit directly
// Generated on Wed, 20 Nov 2024 08:44:15 GMT

export const spTokenTypes = [
"font_family_ja",
"font_family_zh",
] as const;
export type SpTokenTypes = (typeof spTokenTypes)[number];

export const tokens: {[key in SpTokenTypes]:string} = {
font_family_ja: "Arial, YakuHanJPs_Narrow, Hiragino Sans, Hiragino Kaku Gothic ProN, Meiryo, Noto Sans JP, sans-serif",
font_family_zh: "Arial, YakuHanJPs_Narrow, 'PingFang SC', 'Microsoft YaHei', 'PingFang TC', Microsoft JhengHei, sans-serif",
}