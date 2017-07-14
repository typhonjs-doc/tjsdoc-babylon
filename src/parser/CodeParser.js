import * as babylon  from 'babylon';
import fs            from 'fs';

/**
 * Provides a regexp to detect ES Modules.
 * @type {RegExp}
 * @ignore
 */
const s_ESM_REGEX = /(^\s*|[}\);\n]\s*)(import\s*(['"]|(\*\s+as\s+)?[^"'\(\)\n;]+\s*from\s*['"]|\{)|export\s+\*\s+from\s+["']|export\s* (\{|default|function|class|var|const|let|async\s+function))/;

/**
 * Provides the Babylon code parser plugin.
 */
export default class CodeParser
{
   /**
    * Wires up the Babylon code parser on the plugin eventbus and stores it in a local module scope variable.
    *
    * @param {PluginEvent} ev - The plugin event.
    *
    * @ignore
    */
   onPluginLoad(ev)
   {
      /**
       * Stores the plugin eventbus proxy.
       * @type {EventProxy}
       */
      this._eventbus = ev.eventbus;

      this._eventbus.on('tjsdoc:system:parser:code:source:parse', this.parseSource, this);
      this._eventbus.on('tjsdoc:system:parser:code:file:parse', this.parseFile, this);
   }

   /**
    * Parse ECMAScript source code with babylon.
    *
    * @param {string}   code - source code to parse.
    *
    * @param {string}   [filePath] - Associated file path for the code.
    *
    * @returns {object} Parsed AST
    */
   parseSource(code, filePath = void 0)
   {
      let ast;

      try
      {
         code = this._eventbus.triggerSync('plugins:sync:invoke:event',
          'onHandleCode', void 0, { code, filePath }).code;

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

         parser = this._eventbus.triggerSync('plugins:sync:invoke:event', 'onHandleCodeParser', void 0,
          { parser, parserOptions, filePath, code }).parser;

         ast = parser(code);

         ast = this._eventbus.triggerSync('plugins:sync:invoke:event',
          'onHandleAST', void 0, { ast, code, filePath }).ast;
      }
      catch (err)
      {
         throw typeof err.pos === 'number' ? this._eventbus.triggerSync('tjsdoc:system:error:parser:create',
          { line: err.loc.line, column: err.loc.column, message: err.message, position: err.pos, fileName: filePath }) :
           err;
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
   parseFile(filePath)
   {
      return this.parseSource(fs.readFileSync(filePath, { encode: 'utf8' }).toString(), filePath);
   }
}
