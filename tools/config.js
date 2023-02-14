module.exports = {
  "source": ["tokens/**/*.json"],
  "format": {
    "typeScript/myFormat": ({dictionary}) => {
      return "\n// Do not edit directly\n// Generated on " + new Date().toUTCString() + "\n\n" +
          'export const colors = {\n' +
          dictionary.allProperties.map(function(prop) {
            let to_ret_prop = prop.path.join('_') + ': "' + prop.value + '",';
            if (prop.comment)
              to_ret_prop = to_ret_prop.concat(' // ' + prop.comment);
            return to_ret_prop;
          }).join('\n') + "\n}";
    }
  },
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "../styles/",
      "files": [
        {
          "destination": "speeda-tokens.css",
          "format": "css/variables",
          "options": {
            "outputReferences": true
          }
        }
      ]
    },
    "scss": {
      "transformGroup": "scss",
      "buildPath": "../styles/",
      "files": [{
        "destination": "speeda-tokens.scss",
        "format": "scss/variables"
      }]
    },
    "typeScript": {
      "buildPath": "../styles/",
      "files": [{
        "destination": "speeda-tokens.ts",
        "format": "typeScript/myFormat"
      }]
    }
  }
}
