#!/usr/bin/env node
import fs            from 'fs';
import TJSDocCLI     from 'tjsdoc/src/TJSDocCLI.js';

import TJSDocBabylon from './TJSDocBabylon.js';

/**
 * Provides an overidden TJSDoc CLI implementation setting the runtime to TJSDocBabylon.
 */
export default class TJSDocBabylonCLI extends TJSDocCLI
{
   /**
    * @override
    */
   exec(runtime) { super.exec(TJSDocBabylon); } // eslint-disable-line no-unused-vars
}

// If this file is directory executed, work as CLI.
if (fs.realpathSync(process.argv[1]) === __filename) { new TJSDocBabylonCLI(process.argv).exec(); }
