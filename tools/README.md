# セットアップ

```bash
npm install
```

# Figmaファイル

デザイントークンのFigmaファイル
https://www.figma.com/file/3mt6U3oD9grrd7YzYm2cdu/

上記のFigmaファイルを、自身のFigmaアカウントに複製（Duplicate to your draft）をしてください。

# 実行方法

## Style Dictionary用のJSONファイルを生成

```bash
$ FIGMA_TOKEN=*** FIGMA_DESIGN_FILE_KEY=*** node figma.js
```

`FIGMA_TOKEN` にはFigmaアカウントの「Settings」にある「Personal access tokens」から取得して入れてください。

`FIGMA_DESIGN_FILE_KEY` には複製したFigmaファイルのURLにある文字列を入れてください。

```
https://www.figma.com/file/%この部分の文字列%/
```

## CSSファイルの生成

```bash
# style-dictionary build
$ npm run build:css
```