
// Do not edit directly
// Generated on Thu, 21 Nov 2024 12:18:10 GMT

export const spTokenTypes = [
"font_family_ja",
"font_family_zh",
] as const;
export type SpTokenTypes = (typeof spTokenTypes)[number];

export const tokens: {[key in SpTokenTypes]:string} = {
font_family_ja: "Arial, YakuHanJPs, Hiragino Sans, Hiragino Kaku Gothic ProN, Meiryo, Noto Sans JP, sans-serif",
font_family_zh: "Arial, YakuHanJPs, 'PingFang SC', 'Microsoft YaHei', 'PingFang TC', Microsoft JhengHei, sans-serif",
}