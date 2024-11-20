import * as fs from "fs";
import * as path from "path";

const TOKEN = process.env.FIGMA_TOKEN;
const PRIMITIVE_FIGMA_FILE_KEY = process.env.PRIMITIVE_FIGMA_DESIGN_FILE_KEY;
const SEMANTIC_FIGMA_FILE_KEY = process.env.SEMANTIC_FIGMA_DESIGN_FILE_KEY;

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface VariableAlias {
  type: "VARIABLE_ALIAS";
  id: string;
}

function isVariableAlias(value: Color | VariableAlias): value is VariableAlias {
  return "type" in value && value.type === "VARIABLE_ALIAS";
}

type Variable = {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  remote: boolean;
  description: string;
  hiddenFromPublishing: boolean;
  scopes: unknown;
  codeSyntax: unknown;
  deletedButReferenced?: boolean;
} & (
  | {
      resolvedType: "COLOR";
      valuesByMode: {
        [modeId: string]: Color | VariableAlias;
      };
    }
  | {
      resolvedType: string;
      valuesByMode: unknown;
    }
);

interface Variables {
  [variableId: string]: Variable;
}

interface VariableCollection {
  id: string;
  name: string;
  key: string;
  modes: [
    {
      modeId: string;
      name: string;
    }
  ];
  defaultModeId: string;
  remote: boolean;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

interface VariableCollections {
  [variableCollectionId: string]: VariableCollection;
}

interface LocalVariablesData {
  variables: Variables;
  variableCollections: VariableCollections;
}

interface LocalVariablesApiResponse {
  status: number;
  error: boolean;
  meta: LocalVariablesData;
}

interface ColorToken {
  color: string;
  value: string;
}

async function fetchLocalVariables(fileKey: string) {
  const url = `https://api.figma.com/v1/files/${fileKey}/variables/local`;
  const headers = { "X-FIGMA-TOKEN": TOKEN };
  const response: LocalVariablesApiResponse = await fetch(url, {
    headers,
  }).then((response) => response.json());
  return response.meta;
}

function rgbaToHex(r: number, g: number, b: number, a: number) {
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
}

function toHexValue(color: Color) {
  const { r, g, b, a } = color;
  const hex = rgbaToHex(r * 255, g * 255, b * 255, a);
  return hex;
}

function findVariableCollectionByName(
  name: string,
  variableCollections: VariableCollections
) {
  return Object.values(variableCollections).find(
    (collection) => collection.name === name
  );
}

function findVariableById(id: string, variables: Variables) {
  return Object.values(variables).find((variable) => variable.id === id);
}

function resolveColorVariable(
  variable: Variable,
  referencedVariables: Variables
): Variable {
  if (variable.resolvedType !== "COLOR") {
    throw new Error("変数の型がCOLORではありません");
  }

  const value = Object.values(variable.valuesByMode)[0];

  if (!isVariableAlias(value)) {
    return variable;
  }

  const referencedVariable = findVariableById(value.id, referencedVariables);
  if (!referencedVariable) {
    throw new Error("参照先の変数が見つかりません");
  }

  return resolveColorVariable(referencedVariable, referencedVariables);
}

function toColorTree(colorTokens: ColorToken[]) {
  const sortedColorTokens = [...colorTokens];
  sortedColorTokens.sort((a, b) => a.color.localeCompare(b.color, "en"));

  return Object.fromEntries(
    sortedColorTokens.map(({ color, value }) => [color, { value }])
  );
}

const main = async () => {
  const primitiveLocalVariables = await fetchLocalVariables(
    PRIMITIVE_FIGMA_FILE_KEY
  );

  const semanticLocalVariables = await fetchLocalVariables(
    SEMANTIC_FIGMA_FILE_KEY
  );

  const uiPrimitiveColorCollection = findVariableCollectionByName(
    "UI Primitive Color",
    primitiveLocalVariables.variableCollections
  );

  const semanticColorCollection = findVariableCollectionByName(
    "Semantic Color",
    semanticLocalVariables.variableCollections
  );

  const primitiveColorTokens = uiPrimitiveColorCollection.variableIds
    .map((variableId) =>
      findVariableById(variableId, primitiveLocalVariables.variables)
    )
    .filter((variable) => !variable.deletedButReferenced)
    .filter((variable) => !variable.remote)
    .map((variable) => {
      const resolvedVariable = resolveColorVariable(
        variable,
        primitiveLocalVariables.variables
      );

      const color = `primitive-${variable.name
        .split("/")
        .slice(1)
        .join("-")
        .trim()}`;
      const value = Object.values(resolvedVariable.valuesByMode)[0];

      return {
        color,
        value: toHexValue(value),
      };
    });

  const allVariables = {
    ...primitiveLocalVariables.variables,
    ...semanticLocalVariables.variables,
  };

  const semanticColorTokens = semanticColorCollection.variableIds
    .map((variableId) =>
      findVariableById(variableId, semanticLocalVariables.variables)
    )
    .filter((variable) => !variable.deletedButReferenced)
    .filter((variable) => !variable.remote)
    .map((variable) => {
      const resolvedVariable = resolveColorVariable(variable, allVariables);

      const color = `semantic-${variable.name.split("/").join("-").trim()}`;
      const value = Object.values(resolvedVariable.valuesByMode)[0];

      return {
        color,
        value: toHexValue(value),
      };
    });

  const colorContent = JSON.stringify({
    color: toColorTree(primitiveColorTokens.concat(semanticColorTokens)),
  });

  const outputDir = path.resolve(__dirname, "tokens/color");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(path.join(outputDir, "base.json"), colorContent);

  console.log("DONE");
};

main();
