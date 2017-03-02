import path    from 'path';
import TJSDoc  from 'tjsdoc';

/**
 * Provides an overridden version of TJSDoc with a default runtime and publisher assigned to `tjsdoc-babylon` &
 * `tjsdoc-publisher-static-html`.
 */
export default class TJSDocBabylon extends TJSDoc
{
   /**
    * Path to `package.json` for TJSDocBabylon.
    * @type {string}
    */
   static tjsdocPackagePath = path.resolve(__dirname, '../package.json');

   /**
    * Depending on the value of `process.env.BABEL_ENV` selectively load either the local development runtime and
    * publisher or default to the published NPM modules.
    */
   static generate(config)
   {
      super.generate(process.env.TJSDOC_ENV === 'development' ? s_DEV_CONFIG(config) : s_DEFAULT_CONFIG(config));
   }
}

/**
 * Adds all Babylon runtime plugins.
 *
 * @param {PluginEvent} ev - The plugin event.
 *
 * @ignore
 */
export function onPluginLoad(ev)
{
   const eventbus = ev.eventbus;
   const dirPath = path.resolve(__dirname);

   // Instances are being loaded into the plugin manager so auto log filtering needs an explicit filter.
   eventbus.trigger('log:add:filter', {
      type: 'inclusive',
      name: 'tjsdoc-babylon',
      filterString: '(tjsdoc-babylon\/dist|tjsdoc-babylon\/src)'
   });

   // Adds all Babylon runtime plugins
   eventbus.trigger('plugins:add:all', [
      // Adds Babylon doc generation and DocFactory event bindings.
      { name: 'tjsdoc-docs-babylon', instance: require('tjsdoc-docs-babylon'), options: { logAutoFilter: false } },

      // Adds common runtime with resolver data override for Babylon / JS runtime.
      {
         name: 'tjsdoc-runtime-common',
         instance: require('tjsdoc-runtime-common'),
         options: {
            logAutoFilter: false,
            resolverData: {
               defaultValues: {
                  'includes': ['\\.(es6|es|js|jsx|jsm)$'],
                  'pathExtensions': ['.es6', '.es', '.js', '.jsx', '.jsm'],
                  'test.includes': ['\\.(es6|es|js|jsx|jsm)$']
               }
            }
         }
      },

      // Adds all local Babylon runtime parser plugins.
      { name: 'tjsdoc-ast-util', instance: require(`${dirPath}/parser/BabylonASTUtil.js`) },
      { name: 'tjsdoc-code-parser', instance: require(`${dirPath}/parser/CodeParser.js`) },
      { name: 'tjsdoc-comment-parser', instance: require(`${dirPath}/parser/CommentParser.js`) },
      { name: 'tjsdoc-param-parser', instance: require(`${dirPath}/parser/ParamParser.js`) }
   ]);
}

/**
 * Handles adding built-in external references for ECMAScript.
 *
 * @param {PluginEvent} ev - The plugin event.
 */
export function onStart(ev)
{
   // Load built-in virtual plugins for external definitions.
   if (ev.data.config.builtinVirtual)
   {
      ev.eventbus.trigger('plugins:add',
       { name: 'tjsdoc-plugin-external-ecmascript', instance: require('tjsdoc-plugin-external-ecmascript') });
   }
}

// Module private ---------------------------------------------------------------------------------------------------

/**
 * Defines the default Babylon runtime configuration deferring to published NPM modules.
 *
 * @param {TJSDocConfig}   config - TJSDoc config to add runtime / publisher fields.
 *
 * @returns {TJSDocConfig}
 * @ignore
 */
const s_DEFAULT_CONFIG = (config) =>
{
   return Object.assign(
   {
      runtime: 'tjsdoc-babylon',
      publisher: 'tjsdoc-publisher-static-html'
   }, config);
};

/**
 * Defines the local development Babylon runtime configuration loading local modules.
 *
 * @param {TJSDocConfig}   config - TJSDoc config to add runtime / publisher fields.
 *
 * @returns {TJSDocConfig}
 * @ignore
 */
const s_DEV_CONFIG = (config) =>
{
   return Object.assign(
   {
      runtime: `${__dirname}/TJSDocBabylon.js`,
      publisher: path.resolve(__dirname, '../../tjsdoc-publisher-static-html/src/publish.js')
   }, config);
};
