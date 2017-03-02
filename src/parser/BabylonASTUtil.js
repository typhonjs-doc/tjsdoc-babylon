import babelGenerator from 'babel-generator';

/**
 * Wires up BabylonASTUtil on the plugin eventbus and stores it in a local module scope variable.
 *
 * @param {PluginEvent} ev - The plugin event.
 *
 * @ignore
 */
export function onPluginLoad(ev)
{
   const eventbus = ev.eventbus;

   eventbus.on('tjsdoc:ast:create:variable:declaration:new:expression', createVariableDeclarationAndNewExpressionNode);

   eventbus.on('tjsdoc:ast:create:class:declaration', findClassDeclarationNode);

   eventbus.on('tjsdoc:ast:find:class:declaration', findClassDeclarationNode);

   eventbus.on('tjsdoc:ast:find:decorators', findDecorators);

   eventbus.on('tjsdoc:ast:find:function:declaration', findFunctionDeclarationNode);

   eventbus.on('tjsdoc:ast:find:import:style', findImportStyle);

   eventbus.on('tjsdoc:ast:find:line:number:start', findLineNumberStart);

   eventbus.on('tjsdoc:ast:find:parent:export', findParentExport);

   eventbus.on('tjsdoc:ast:find:path:import:declaration', findPathInImportDeclaration);

   eventbus.on('tjsdoc:ast:find:variable:declaration', findVariableDeclarationNode);

   eventbus.on('tjsdoc:ast:find:variable:declaration:new:expression', findVariableDeclarationAndNewExpressionNode);

   eventbus.on('tjsdoc:ast:flatten:member:expression', flattenMemberExpression);

   eventbus.on('tjsdoc:ast:get:code:comment:and:first:line:from:node', getCodeCommentAndFirstLineFromNode);

   eventbus.on('tjsdoc:ast:get:method:params:from:node', getMethodParamsFromNode);

   eventbus.on('tjsdoc:ast:get:file:comment:and:first:line:from:node', getFileCommentAndFirstLineFromNode);

   eventbus.on('tjsdoc:ast:node:sanitize', sanitize);

   eventbus.on('tjsdoc:ast:node:sanitize:children', sanitizeChildren);

   /**
    * create VariableDeclaration node which has NewExpression.
    *
    * @param {string} name - variable name.
    * @param {string} className - class name.
    * @param {Object} loc - location.
    *
    * @returns {ASTNode} created node.
    */
   function createVariableDeclarationAndNewExpressionNode(name, className, loc)
   {
      const node = {
         type: 'VariableDeclaration',
         kind: 'let',
         loc,
         declarations:
         [
            {
               type: 'VariableDeclarator',
               id: { type: 'Identifier', name },
               init: { type: 'NewExpression', callee: { type: 'Identifier', name: className } }
            }
         ]
      };

      return node;
   }

   /**
    * find ClassDeclaration node.
    *
    * @param {string} name - class name.
    * @param {AST} ast - find in this ast.
    *
    * @returns {ASTNode|null} found ast node.
    */
   function findClassDeclarationNode(name, ast)
   {
      if (!name) { return null; }

      for (const node of ast.program.body)
      {
         if (node.type === 'ClassDeclaration' && node.id.name === name) { return node; }
      }

      return null;
   }

   /**
    * find FunctionDeclaration node.
    *
    * @param {string} name - function name.
    * @param {AST} ast - find in this ast.
    *
    * @returns {ASTNode|null} found ast node.
    */
   function findFunctionDeclarationNode(name, ast)
   {
      if (!name) { return null; }

      for (const node of ast.program.body)
      {
         if (node.type === 'FunctionDeclaration' && node.id.name === name) { return node; }
      }

      return null;
   }

   /**
    * Finds any attached decorators
    *
    * @param {ASTNode}  node - An AST node.
    *
    * @returns {Array<Decorator>|undefined}
    */
   function findDecorators(node)
   {
      if (!node.decorators) { return; }

      const decorators = [];

      for (const decorator of node.decorators)
      {
         const value = {};

         switch (decorator.expression.type)
         {
            case 'Identifier':
               value.name = decorator.expression.name;
               value.arguments = null;
               break;

            case 'CallExpression':
               value.name = decorator.expression.callee.name;
               value.arguments = babelGenerator(decorator.expression).code.replace(/^[^(]+/, '');
               break;

            default:
               throw new Error(`unknown decorator expression type: ${decorator.expression.type}`);
         }

         decorators.push(value);
      }

      return decorators;
   }

   /**
    * Finds the start line number for an AST node.
    *
    * @param {ASTNode}  node - An AST node.
    *
    * @returns {number|undefined}
    */
   function findLineNumberStart(node)
   {
      let number;

      if (node.loc) { number = node.loc.start.line; }

      return number;
   }

   /**
    * Determines the import style of the given node from it's parent node.
    *
    * @param {ASTNode}  node - An AST node.
    * @param {string}   name - Name of the doc tag.
    *
    * @returns {string|null}
    */
   function findImportStyle(node, name)
   {
      let parent = node.parent;

      let importStyle = null;

      while (parent)
      {
         if (parent.type === 'ExportDefaultDeclaration')
         {
            importStyle = name;

            break;
         }
         else if (parent.type === 'ExportNamedDeclaration')
         {
            importStyle = `{${name}}`;

            break;
         }
         parent = parent.parent;
      }

      return importStyle;
   }

   /**
    * Finds any parent export nodes.
    *
    * @param {ASTNode}  node - An AST node.
    *
    * @returns {boolean}
    */
   function findParentExport(node)
   {
      let parent = node.parent;

      let exported = false;

      while (parent)
      {
         if (parent.type === 'ExportDefaultDeclaration')
         {
            exported = true;
         }
         else if (parent.type === 'ExportNamedDeclaration')
         {
            exported = true;
         }

         parent = parent.parent;
      }

      return exported;
   }

   /**
    * find file path in import declaration by name.
    * e.g. can find ``./foo/bar.js`` from ``import Bar from './foo/bar.js'`` by ``Bar``.
    *
    * @param {AST} ast - target AST.
    * @param {string} name - identifier name.
    *
    * @returns {string|null} file path.
    */
   function findPathInImportDeclaration(ast, name)
   {
      let path = null;

      if (eventbus === null || typeof eventbus === 'undefined')
      {
         throw new ReferenceError('eventbus is currently not defined.');
      }

      eventbus.trigger('ast:walker:traverse', ast,
      {
         enterNode: (node) =>
         {
            if (node.type !== 'ImportDeclaration') { return; }

            for (const spec of node.specifiers)
            {
               const localName = spec.local.name;
               if (localName === name)
               {
                  path = node.source.value;
                  return null;  // Quit traversal
               }
            }
         }
      });

      return path;
   }

   /**
    * find VariableDeclaration node which has NewExpression.
    *
    * @param {string} name - variable name.
    * @param {AST} ast - find in this ast.
    *
    * @returns {ASTNode|null} found ast node.
    */
   function findVariableDeclarationAndNewExpressionNode(name, ast)
   {
      if (!name) { return null; }

      for (const node of ast.program.body)
      {
         if (node.type === 'VariableDeclaration' && node.declarations[0].init &&
          node.declarations[0].init.type === 'NewExpression' && node.declarations[0].id.name === name)
         {
            return node;
         }
      }

      return null;
   }

   /**
    * find VariableDeclaration node.
    *
    * @param {string} name - variable name.
    * @param {AST} ast - find in this ast.
    *
    * @returns {ASTNode|null} found ast node.
    */
   function findVariableDeclarationNode(name, ast)
   {
      if (!name) { return null; }

      for (const node of ast.program.body)
      {
         if (node.type === 'VariableDeclaration' && node.declarations[0].id.name === name) { return node; }
      }

      return null;
   }

   /**
    * flatten member expression property name.
    * if node structure is [foo [bar [baz [this] ] ] ], flatten is ``this.baz.bar.foo``
    *
    * @param {ASTNode} node - target member expression node.
    *
    * @returns {string} flatten property.
    */
   function flattenMemberExpression(node)
   {
      const results = [];
      let target = node;

      while (target)
      {
         if (target.type === 'ThisExpression')
         {
            results.push('this');
            break;
         }
         else if (target.type === 'Identifier')
         {
            results.push(target.name);
            break;
         }
         else
         {
            results.push(target.property.name);
            target = target.object;
         }
      }

      return results.reverse().join('.');
   }

   /**
    * Gets the last leading comment before a node including the first line of the node from in memory code returning
    * an object with keys: text, startLine, and endLine. If there is no leading comment the previous 10 lines from
    * the nodes first line is returned.
    *
    * @param {string}   code - In memory code.
    *
    * @param {ASTNode}  node - An AST node.

    * @param {ASTNode}  [allComments=false] - If true then all leading comments are included.
    *
    * @returns {{text: string, startLine: number, endLine: number }} The last comment & method signature w/
    *                                                                start & end line numbers.
    */
   function getCodeCommentAndFirstLineFromNode(code, node, allComments = false)
   {
      if (typeof code !== 'string') { throw new TypeError(`'code' is not a 'string'.`); }
      if (typeof node !== 'object') { throw new TypeError(`'node' is not an 'object'.`); }

      const lines = code.split('\n');
      const targetLines = [];

      // If the node has a leading comment then include the last one before the method signature.
      if (Array.isArray(node.leadingComments) && node.leadingComments.length > 0)
      {
         // If `allComments` is true then include all leading comments otherwise by default just the last one.
         const comment = node.leadingComments[allComments ? 0 : node.leadingComments.length - 1];

         const startLine = Math.max(0, comment.loc.start.line - 1);
         const endLine = node.loc.start.line;

         for (let cntr = startLine; cntr < endLine; cntr++)
         {
            targetLines.push(`${cntr + 1}| ${lines[cntr]}`);
         }

         return { text: targetLines.join('\n'), startLine, endLine };
      }
      else // Otherwise just return up to 10 lines before the first line of the node.
      {
         const endLine = node.loc.start.line;
         const startLine = Math.max(0, endLine - 10);

         for (let cntr = startLine; cntr < endLine; cntr++)
         {
            targetLines.push(`${cntr + 1}| ${lines[cntr]}`);
         }

         return { text: targetLines.join('\n'), startLine, endLine };
      }
   }

   /**
    * Gets the last leading comment before a node including the first line of the node from a file returning
    * an object with keys: text, startLine, and endLine. If there is no leading comment the previous 10 lines from
    * the nodes first line is returned.
    *
    * @param {string}   filePath - An absolute file path to read.
    *
    * @param {ASTNode}  node - An AST node.

    * @param {ASTNode}  [allComments=false] - If true then all leading comments are included.
    *
    * @returns {{text: string, startLine: number, endLine: number }} The last comment & method signature w/
    *                                                                start & end line numbers.
    */
   function getFileCommentAndFirstLineFromNode(filePath, node, allComments = false)
   {
      if (typeof filePath !== 'string') { throw new TypeError(`'filePath' is not a 'string'.`); }
      if (typeof node !== 'object') { throw new TypeError(`'node' is not an 'object'.`); }

      // If the node has a leading comment then include the last one before the method signature.
      if (Array.isArray(node.leadingComments) && node.leadingComments.length > 0)
      {
         // If `allComments` is true then include all leading comments otherwise by default just the last one.
         const comment = node.leadingComments[allComments ? 0 : node.leadingComments.length - 1];

         const startLine = comment.loc.start.line - 1;
         const endLine = node.loc.start.line;

         const targetLines = eventbus.triggerSync('typhonjs:util:file:read:lines', filePath, startLine, endLine);

         return { text: targetLines.join('\n'), startLine, endLine };
      }
      else // Otherwise just return up to 10 lines before the first line of the node.
      {
         const endLine = node.loc.start.line;
         const startLine = endLine - 10;

         const targetLines = eventbus.triggerSync('typhonjs:util:file:read:lines', filePath, startLine, endLine);

         return { text: targetLines.join('\n'), startLine, endLine };
      }
   }

   /**
    * Get variable names from method arguments.
    *
    * @param {ASTNode} node - target node.
    *
    * @returns {string[]} variable names.
    */
   function getMethodParamsFromNode(node)
   {
      let params;

      switch (node.type)
      {
         case 'FunctionExpression':
         case 'FunctionDeclaration':
            params = node.params || [];
            break;

         case 'ClassMethod':
            params = node.params || [];
            break;

         case 'ArrowFunctionExpression':
            params = node.params || [];
            break;

         default:
            throw new Error(`unknown node type. type = ${node.type}`);
      }

      const result = [];

      for (const param of params)
      {
         switch (param.type)
         {
            case 'Identifier':
               result.push(param.name);
               break;

            case 'AssignmentPattern':
               if (param.left.type === 'Identifier')
               {
                  result.push(param.left.name);
               }
               else if (param.left.type === 'ObjectPattern')
               {
                  result.push('*');
               }
               break;

            case 'RestElement':
               result.push(param.argument.name);
               break;

            case 'ObjectPattern':
               result.push('*');
               break;

            case 'ArrayPattern':
               result.push('*');
               break;

            default:
               throw new Error(`unknown param type: ${param.type}`);
         }
      }

      return result;
   }

   /**
    * sanitize node. change node type to `Identifier` and empty comment.
    *
    * @param {ASTNode} node - target node.
    */
   function sanitize(node)
   {
      if (!node) { return; }

      node.type = 'Identifier';
      node.name = '_';
      node.leadingComments = [];
      node.trailingComments = [];
   }

   /**
    * Removes all unnecessary children nodes leaving comments and range data.
    *
    * @param {ASTNode} node - target node.
    */
   function sanitizeChildren(node)
   {
      if (!node) { return; }

      for (const prop in node)
      {
         switch (prop)
         {
            case 'end':
            case 'leadingComments':
            case 'loc':
            case 'start':
            case 'trailingComments':
            case 'type':
               continue;

            default:
               delete node[prop];
         }
      }
   }
}
