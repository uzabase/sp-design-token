const fs = require("fs");
const { promisify } = require("util");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const writeFile = promisify(fs.writeFile);

const TOKEN = process.env.FIGMA_TOKEN;
const PRIMITIVE_FIGMA_FILE_KEY = process.env.PRIMITIVE_FIGMA_DESIGN_FILE_KEY;
const SEMANTIC_FIGMA_FILE_KEY = process.env.SEMANTIC_FIGMA_DESIGN_FILE_KEY;

const fetchFigma = (path, figmaFileKey) =>
  fetch(`https://api.figma.com/v1/files/${figmaFileKey}${path}`, {
    headers: {
      "X-FIGMA-TOKEN": TOKEN,
    },
  }).then((response) => response.json());

const rgbaToHex = (r, g, b, a) => {
  const hr = Math.round(r).toString(16).padStart(2, "0");
  const hg = Math.round(g).toString(16).padStart(2, "0");
  const hb = Math.round(b).toString(16).padStart(2, "0");
  const ha = typeof a === "undefined"
    ? ""
    : Math.round(a * 255)
        .toString(16)
        .padStart(2, "0");

  return "#" + hr + hg + hb + ha;
};

function toHexValue(fill) {
  const { opacity, color } = fill;
  const { r, g, b } = color;
  const hex = rgbaToHex(r * 255, g * 255, b * 255, opacity);
  return hex;
}
async function getStyleNodes(figmaFileKey) {
  const responseStyles = await fetchFigma("/styles", figmaFileKey);
  const styles = responseStyles.meta.styles;

  const styleNodeIds = styles.map((style) => style.node_id);
  const styleNodeIdsQuery = styleNodeIds.join(",");
  const { nodes: styleNodes } = await fetchFigma(
    `/nodes?ids=${styleNodeIdsQuery}`,
    figmaFileKey
  );
  return styleNodes;
}

function toColorTree(colorTokens) {
  return colorTokens.reduce((prevValue, currentValue) => {
    let color = currentValue.color;
    prevValue[color] = prevValue[color] ?? {};
    prevValue[color] = { value: currentValue.value };

    let pairs = Object.entries(prevValue);
    pairs.sort(function (p1, p2) {
      let p1Key = p1[0],
        p2Key = p2[0];
      if (p1Key < p2Key) {
        return -1;
      }
      if (p1Key > p2Key) {
        return 1;
      }
      return 0;
    });
    prevValue = Object.fromEntries(pairs);
    return prevValue;
  }, {});
}

const main = async () => {
  let primitiveColorTokens = await getStyleNodes(PRIMITIVE_FIGMA_FILE_KEY);
  primitiveColorTokens = Object.values(primitiveColorTokens)
    .map((v) => ({ name: v.document.name, value: v.document.fills[0] }))
    .map((v) => {
      const _color = v.name.split("/");
      const colorNumber = _color[1].split("-")[1];
      const color = ("primitive-" + _color[0] + "-" + colorNumber).trim();
      return {
        color,
        value: toHexValue(v.value),
      };
    });

  let semanticColorTokens = await getStyleNodes(SEMANTIC_FIGMA_FILE_KEY);
  semanticColorTokens = Object.values(semanticColorTokens)
    .map((v) => ({ name: v.document.name, value: v.document.fills[0] }))
    .map((v) => {
      const _color = v.name.split("/");
      const color = "semantic-" + _color.join("-").trim();
      return {
        color,
        value: toHexValue(v.value),
      };
    });

  const colorContent = JSON.stringify({
    color: toColorTree(primitiveColorTokens.concat(semanticColorTokens)),
  });

  await writeFile(
    path.resolve(__dirname, "tokens/color/base.json"),
    colorContent
  );

  console.log("DONE");
};

main();
