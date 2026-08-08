import {
  printComments,
  printLeadingComments,
} from "../../main/comments/print.js";
import { locEndWithFullText } from "../location/index.js";
import {
  isSingleHtmlEventHandlerExpressionStatement,
  isSingleJsxExpressionStatementInMarkdown,
  isSingleVueEventBindingExpressionStatement,
  shouldExpressionStatementPrintLeadingSemicolon,
} from "../semicolon/semicolon.js";
import { isBlockComment } from "../utilities/comment-types.js";
import { CommentCheckFlags, getComments } from "../utilities/comments.js";
import { shouldExpressionStatementPrintOwnComments } from "../utilities/should-expression-statement-print-own-comments.js";
import {
  isVueEventBindingFunctionExpression,
  isVueEventBindingMemberExpression,
  unwrapVueEventBindingTsNode,
} from "../utilities/vue-event-binding.js";

/**
@import {Doc} from "../../document/index.js"
*/

function shouldPrintSemicolon(path, options) {
  if (isSingleVueEventBindingExpressionStatement(path, options)) {
    const expression = unwrapVueEventBindingTsNode(path.node.expression);
    return (
      isVueEventBindingFunctionExpression(expression) ||
      isVueEventBindingMemberExpression(expression)
    );
  }

  if (!options.semi) {
    return false;
  }

  if (
    // Do not append semicolon after the only JSX element in a program
    isSingleJsxExpressionStatementInMarkdown(path, options) ||
    // Do not append semicolon after the only HTML event binding expression in a program
    isSingleHtmlEventHandlerExpressionStatement(path, options)
  ) {
    return false;
  }

  return true;
}

function printExpressionStatement(path, options, print) {
  /** @type {Doc[]} */
  const parts = [print("expression")];

  if (shouldExpressionStatementPrintLeadingSemicolon(path, options)) {
    if (shouldExpressionStatementPrintOwnComments(path, options)) {
      const { node } = path;
      const typeCastComment = getComments(node, CommentCheckFlags.Leading).at(
        -1,
      );

      // Print the type cast comment separately and print `;` before it
      const typeCastCommentDoc = printLeadingComments(path, options, {
        filter: (comment) => comment === typeCastComment,
      });

      return printComments(path, [";", typeCastCommentDoc, ...parts], options, {
        filter: (comment) => comment !== typeCastComment,
      });
    }

    parts.unshift(";");
  } else if (shouldPrintSemicolon(path, options)) {
    const { node } = path;
    const statementEnd = locEndWithFullText(node) - 1;

    // Print block comments that were located between the expression and the
    // terminating `;` before the semicolon. They would otherwise be moved to
    // after the `;` since #18736 stopped including the semicolon in the
    // statement's range.
    const comments = getComments(node);
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      if (
        comment.trailing &&
        isBlockComment(comment) &&
        locEndWithFullText(comment) <= statementEnd
      ) {
        const commentDoc = path.call(
          () => options.printer.printComment(path, options),
          "comments",
          i,
        );
        parts.push(" ", commentDoc);
        comment.printed = true;
        options[Symbol.for("printedComments")]?.add(comment);
      }
    }

    parts.push(";");
  }

  return parts;
}

export { printExpressionStatement };
