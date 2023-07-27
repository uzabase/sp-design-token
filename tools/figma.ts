import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);

const TOKEN = process.env.FIGMA_TOKEN;
const PRIMITIVE_FIGMA_FILE_KEY = process.env.PRIMITIVE_FIGMA_DESIGN_FILE_KEY;
const SEMANTIC_FIGMA_FILE_KEY = process.env.SEMANTIC_FIGMA_DESIGN_FILE_KEY;

interface VARIABLE_ALIAS {
  type: string;
  id: string;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

type FigmaResponse = {
  name: string;
  key: string;
  resolvedType: string;
  remote: boolean;
  valuesByMode: {
    [id: string]: VARIABLE_ALIAS | RGBA;
  };
};

type StyleDictionaryJson = {
  kind?: "references" | "actual";
  color: string;
  value: string;
};

async function fetchFigma(path, figmaFileKey): Promise<FigmaResponse[]> {
  const response: any = await fetch(
    `https://api.figma.com/v1/files/${figmaFileKey}${path}`,
    {
      headers: {
        "X-FIGMA-TOKEN": TOKEN,
      },
    }
  ).then((response) => response.json());
  return response.meta.variables;
}

const rgbaToHex = (r, g, b, a) => {
  const hr = Math.round(r).toString(16).padStart(2, "0");
  const hg = Math.round(g).toString(16).padStart(2, "0");
  const hb = Math.round(b).toString(16).padStart(2, "0");
  const ha =
    typeof a === "undefined" || a === 1
      ? ""
      : Math.round(a * 255)
          .toString(16)
          .padStart(2, "0");

  return "#" + hr + hg + hb + ha;
};

function toHexValue(obj) {
  const { r, g, b, a } = obj;
  const hex = rgbaToHex(r * 255, g * 255, b * 255, a);
  return hex;
}
async function getTokens(figmaFileKey: string): Promise<StyleDictionaryJson[]> {
  const response = await fetchFigma("/variables/local", figmaFileKey);
  const responseVariables = Object.values(response).filter(
    (v) => v.resolvedType === "COLOR"
  );
  const remoteVariables = responseVariables.filter((v) => v.remote === true);

  return Object.values(responseVariables)
    .filter((v) => v.remote === false)
    .map((v) => {
      const valuesByMode = Object.values(v.valuesByMode)[0];
      return {
        kind: "type" in valuesByMode ? "references" : "actual",
        color: v.name.split("/").join("-").trim(),
        value:
          "type" in valuesByMode
            ? remoteVariables
                .filter(
                  (rv) => rv.key === valuesByMode.id.split(":")[1].split("/")[0]
                )[0]
                .name.split("/")
                .join("-")
                .trim()
            : toHexValue(valuesByMode),
      };
    });
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
  let primitiveColorTokens = await getTokens(PRIMITIVE_FIGMA_FILE_KEY);
  primitiveColorTokens = primitiveColorTokens.map((v) => {
    let colorName = v.color.split("-");
    colorName.shift();
    return {
      color: "primitive-" + colorName.join("-"),
      value: v.value,
    };
  });

  let semanticColorTokens = await getTokens(SEMANTIC_FIGMA_FILE_KEY);
  semanticColorTokens = semanticColorTokens.map((v) => {
    let primitiveColorName: string[];
    if (v.kind === "references") {
      primitiveColorName = v.value.split("-");
      primitiveColorName.shift();
    }
    return {
      color: "semantic-" + v.color,
      value:
        v.kind === "references"
          ? "{color.primitive-" + primitiveColorName.join("-") + "}"
          : v.value,
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
