const fs = require("fs");
const { promisify } = require("util");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const writeFile = promisify(fs.writeFile);

const TOKEN = process.env.FIGMA_TOKEN;
const FIGMA_FILE_KEY = process.env.FIGMA_DESIGN_FILE_KEY;
const PREFIX = "base";

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
  const colors = {};

  Object.values(styleNodes)
    .filter(({ document }) => document.name.includes("color"))
    .forEach(({ document }) => {
      const { opacity, color } = document.fills[0];
      const { r, g, b } = color;
      const hex = rgbaToHex(r * 255, g * 255, b * 255, opacity);
      const colorNameArr = document.name.split("/").slice(1);

      colors[colorNameArr[0]] = {
        ...colors[colorNameArr[0]],
        [colorNameArr[1]]: {
          value: hex,
        },
      };
    });

  const colorContent = JSON.stringify({
    color: {
      [PREFIX]: {
        ...colors,
      },
    },
  });

  await writeFile(
    path.resolve(__dirname, "tokens/color/base.json"),
    colorContent
  );

  console.log("DONE");
};

main();
