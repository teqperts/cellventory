// __tests__/screenImports.test.js
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;

describe('Screen AST & Undeclared Variable Verification', () => {
  const screensDir = path.resolve(__dirname, '../screens');
  const files = fs.readdirSync(screensDir).filter((f) => f.endsWith('.js'));
  const globals = new Set([
    'console',
    'Date',
    'String',
    'Number',
    'Boolean',
    'Math',
    'RegExp',
    'Alert',
    'Platform',
    'require',
    'global',
    'process',
    'encodeURIComponent',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
  ]);

  files.forEach((file) => {
    it(`verifies ${file} has no undeclared identifiers or missing hook imports`, () => {
      const filePath = path.join(screensDir, file);
      const code = fs.readFileSync(filePath, 'utf8');
      const ast = babel.parseSync(code, {
        presets: ['babel-preset-expo'],
        filename: filePath,
      });

      const undeclared = [];
      traverse(ast, {
        Program(p) {
          p.traverse({
            Identifier(idPath) {
              const name = idPath.node.name;
              if (!idPath.isReferencedIdentifier()) return;
              if (globals.has(name)) return;
              if (!idPath.scope.hasBinding(name)) {
                undeclared.push(name);
              }
            },
          });
        },
      });

      const uniq = [...new Set(undeclared)];
      expect(uniq).toEqual([]);
    });
  });
});
