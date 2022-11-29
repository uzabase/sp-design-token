const fs = require("fs");
const { promisify } = require("util");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const writeFile = promisify(fs.writeFile);

const TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE_KEY = process.env.FIGMA_DESIGN_FILE_KEY;

const fetchFigma = (path) =>
  fetch(`https://api.figma.com/v1/files/${FIGMA_FILE_KEY}${path}`, {
    headers: {
      "X-FIGMA-TOKEN": TOKEN,
    },
  }).then((response) => response.json());

const rgbaToHex = (r, g, b, a) => {
  const hr = Math.round(r).toString(16).padStart(2, "0");
  const hg = Math.round(g).toString(16).padStart(2, "0");
  const hb = Math.round(b).toString(16).padStart(2, "0");
  const ha = !a
    ? ""
    : Math.round(a * 255)
        .toString(16)
        .padStart(2, "0");

  return "#" + hr + hg + hb + ha;
};

const main = async () => {
  // Get styles value
  const responseStyles = await fetchFigma("/styles");
  const styles = responseStyles.meta.styles;

  const styleNodeIds = styles.map((style) => style.node_id);
  const styleNodeIdsQuery = styleNodeIds.join(",");
  const { nodes: styleNodes } = await fetchFigma(
    `/nodes?ids=${styleNodeIdsQuery}`
  );

  // Generate color tokens
  const colors = ['black', 'gray', 'blue', 'green', 'red', 'pink', 'yellow'];

  function toHexValue(fill) {
    const { opacity, color } = fill;
    const { r, g, b } = color;
    const hex = rgbaToHex(r * 255, g * 255, b * 255, opacity);
    return hex;
  }

  const colorTokens = Object.values(styleNodes)// TODO 相談　colorTokensという名前
    .map(v => ({ name: v.document.name, value: v.document.fills[0] }))
    .filter(v => colors.some(color => v.name.includes(color)))
    .map(v => {
      const _color = v.name.split('/');
      const [color, level] = _color[_color.length - 1].split('-');
      return {
        color,
        level,
        value: toHexValue(v.value),
      }
    })

  //参考：https://qiita.com/seira/items/5df10748fa35dd969681
  const initialValue = {};// TODO 相談　これいるのかな？？

  let colorTokensAdjust = colorTokens.reduce((prevValue, currentValue) => { // TODO 相談　colorTokensAdjustという名前
  let key = currentValue.color; // keyにcolorTokens.colorを入れる

    if (!prevValue[key]) {//prevValueのkeyが現在のkeyではなかったら // TODO 相談 ifの中身の書き方
      prevValue[key] = {};//prevValueのkeyを連想配列にする
    }
    const { level,value } = currentValue; //level,valueの中にそれぞれcurrentValue.level,currentValue.valueを分割代入    
    prevValue[key][level] = {value: value};// prevValue[key][level]にvalueというラベル、valueを入れる

    return prevValue;
  }, initialValue);
  console.log(colorTokensAdjust);

  const colorContent = JSON.stringify({
    color: {
        ...colorTokensAdjust
    },
  });

  await writeFile(
    path.resolve(__dirname, "tokens/color/base.json"),
    colorContent
  );

  console.log("DONE");
};

main();
