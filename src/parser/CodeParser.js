import * as babylon  from 'babylon';
import fs            from 'fs';

import ParserError   from 'tjsdoc-runtime-common/src/parser/ParserError.js';

/**
 * Provides a regexp to detect ES Modules.
 * @type {RegExp}
 * @ignore
 */
const s_ESM_REGEX = /(^\s*|[}\);\n]\s*)(import\s*(['"]|(\*\s+as\s+)?[^"'\(\)\n;]+\s*from\s*['"]|\{)|export\s+\*\s+from\s+["']|export\s* (\{|default|function|class|var|const|let|async\s+function))/;

/**
 * Wires up the Babylon code parser on the plugin eventbus and stores it in a local module scope variable.
 *
 * @param {PluginEvent} ev - The plugin event.
 *
 * @ignore
 */
export function onPluginLoad(ev)
{
   const eventbus = ev.eventbus;

   eventbus.on('tjsdoc:parse:code', parseCode);
   eventbus.on('tjsdoc:parse:file', parseFile);

   /**
    * Parse ECMAScript source code with babylon.
    *
    * @param {string}   code - source code to parse.
    *
    * @param {string}   [filePath] - Associated file path for the code.
    *
    * @returns {object} Parsed AST
    */
   function parseCode(code, filePath = void 0)
   {
      let ast;

      try
      {
         if (eventbus !== null && typeof eventbus !== 'undefined')
         {
            code = eventbus.triggerSync('plugins:invoke:sync:event', 'onHandleCode', { code }, { filePath }).code;
         }

         if (code.charAt(0) === '#') { code = code.replace(/^#!/, '//'); }

         const parserOptions =
         {
            plugins: ['asyncFunctions', 'asyncGenerators', 'classConstructorCall', 'classProperties', 'decorators',
             'doExpressions', 'dynamicImport', 'exportExtensions', 'exponentiationOperator', 'flow', 'functionBind',
              'functionSent', 'jsx', 'objectRestSpread', 'trailingFunctionCommas']
         };

         let parser = (code) =>
         {
            parserOptions.sourceType = s_ESM_REGEX.test(code) ? 'module' : 'script';
            return babylon.parse(code, parserOptions);
         };

         if (eventbus !== null && typeof eventbus !== 'undefined')
         {
            parser = eventbus.triggerSync('plugins:invoke:sync:event', 'onHandleCodeParser', void 0,
             { parser, parserOptions, filePath, code }).parser;
         }

         ast = parser(code);

         if (eventbus !== null && typeof eventbus !== 'undefined')
         {
            ast = eventbus.triggerSync('plugins:invoke:sync:event', 'onHandleAST', { ast }, { filePath, code }).ast;
         }
      }
      catch (err)
      {
         throw typeof err.pos === 'number' ?
          new ParserError(err.loc.line, err.loc.column, err.message, err.pos, filePath) : err;
      }

      return ast;
   }

   /**
    * Load and parse ECMAScript source code with babylon.
    *
    * @param {string} filePath - source code file path.
    *
    * @returns {AST} AST of source code.
    */
   function parseFile(filePath)
   {
      return parseCode(fs.readFileSync(filePath, { encode: 'utf8' }).toString(), filePath);
   }
}
