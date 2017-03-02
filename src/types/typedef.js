/**
 * @typedef {Object} AST
 *
 * @property {Object}   body
 * @property {Object[]} leadingComments
 *
 * @see https://github.com/babel/babylon/blob/master/ast/spec.md
 */

/**
 * @typedef {Object} ASTData
 *
 * @property {string} filePath
 * @property {AST}    ast
 */

/**
 * @typedef {Object} ASTNode
 *
 * @property {string}   type
 * @property {Object}   [superClass]
 * @property {Object[]} [leadingComments]
 * @property {Object[]} [trailingComments]
 * @property {Object[]} [body]
 * @property {ASTNode}  [parent] - this is customize by TJSDoc
 *
 * @see https://github.com/babel/babylon/blob/master/ast/spec.md
 */
