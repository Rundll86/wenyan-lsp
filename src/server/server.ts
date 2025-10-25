import { createConnection, ProposedFeatures, InitializeParams, TextDocumentSyncKind, Diagnostic, DiagnosticSeverity, TextDocumentPositionParams, CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Lexer, Parser } from '../engine/src';
import { WenyanError } from '../engine/src/engine/common/exceptions';

const connection = createConnection(ProposedFeatures.all);
const documents = new Map<string, TextDocument>();
connection.onInitialize((params: InitializeParams) => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            publishDiagnostics: {
                relatedInformation: true
            },
            completionProvider: {
                resolveProvider: true
            },
            definitionProvider: true,
            hoverProvider: true
        }
    };
});
connection.onDidOpenTextDocument((params) => {
    const document = TextDocument.create(
        params.textDocument.uri,
        params.textDocument.languageId,
        params.textDocument.version,
        params.textDocument.text
    );
    documents.set(document.uri, document);
    validateDocument(document);
});
connection.onDidChangeTextDocument((params) => {
    const uri = params.textDocument.uri;
    const document = documents.get(uri);
    if (document) {
        const newDocument = TextDocument.update(
            document,
            params.contentChanges,
            params.textDocument.version
        );
        documents.set(uri, newDocument);
        validateDocument(newDocument);
    }
});
connection.onDidCloseTextDocument((params) => {
    documents.delete(params.textDocument.uri);
    connection.sendDiagnostics({
        uri: params.textDocument.uri,
        diagnostics: []
    });
});
function validateDocument(document: TextDocument): void {
    const text = document.getText();
    const diagnostics: Diagnostic[] = [];
    try {
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();
    } catch (error: any) {
        if (error instanceof WenyanError) {
            const lineMatch = error.message.match(/第(\d+)行/);
            const columnMatch = error.message.match(/第(\d+)列/);
            const line = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
            const column = columnMatch ? parseInt(columnMatch[1]) - 1 : 0;
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: {
                        line: line,
                        character: column
                    },
                    end: {
                        line: line,
                        character: column + 1
                    }
                },
                message: error.message,
                source: 'wenyan-lsp'
            };
            diagnostics.push(diagnostic);
        } else {
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 1 }
                },
                message: error.message || '未知错误',
                source: 'wenyan-lsp'
            };
            diagnostics.push(diagnostic);
        }
    }
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
}
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return [];
    }
    const line = document.getText({
        start: { line: textDocumentPosition.position.line, character: 0 },
        end: { line: textDocumentPosition.position.line, character: textDocumentPosition.position.character }
    });
    const keywords: CompletionItem[] = [
        { label: '涵义', kind: CompletionItemKind.Keyword, detail: '函数定义', documentation: '定义函数' },
        { label: '需知', kind: CompletionItemKind.Keyword, detail: '参数定义', documentation: '声明函数参数' },
        { label: '求', kind: CompletionItemKind.Keyword, detail: '返回语句', documentation: '函数返回值' },
        { label: '已知', kind: CompletionItemKind.Keyword, detail: '函数调用参数', documentation: '调用函数时提供的参数，对应函数定义中的需知' },
        { label: '为', kind: CompletionItemKind.Keyword, detail: '作为', documentation: '指定用途或类型' },
        { label: '令', kind: CompletionItemKind.Keyword, detail: '变量声明', documentation: '声明变量' },
        { label: '倘若', kind: CompletionItemKind.Keyword, detail: '条件判断', documentation: '条件判断的开始' },
        { label: '再若', kind: CompletionItemKind.Keyword, detail: '否则如果', documentation: '条件判断的分支' },
        { label: '再则', kind: CompletionItemKind.Keyword, detail: '否则如果', documentation: '条件判断的分支' },
        { label: '否则', kind: CompletionItemKind.Keyword, detail: '否则', documentation: '条件判断的默认分支' },
        { label: '当', kind: CompletionItemKind.Keyword, detail: '当条件', documentation: '条件触发' },
        { label: '时复行', kind: CompletionItemKind.Keyword, detail: '当循环', documentation: '当条件满足时循环' },
        { label: '复行', kind: CompletionItemKind.Keyword, detail: '重复执行', documentation: '重复执行代码块' },
        { label: '次', kind: CompletionItemKind.Keyword, detail: '次数', documentation: '指定循环次数' },
        { label: '以', kind: CompletionItemKind.Keyword, detail: '使用', documentation: '使用变量或值' },
        { label: '是', kind: CompletionItemKind.Operator, detail: '等于', documentation: '相等比较运算符' },
        { label: '不是', kind: CompletionItemKind.Operator, detail: '不等于', documentation: '不等比较运算符' },
        { label: '胜于', kind: CompletionItemKind.Operator, detail: '大于等于', documentation: '大于等于比较运算符' },
        { label: '不及', kind: CompletionItemKind.Operator, detail: '小于等于', documentation: '小于等于比较运算符' },
        { label: '且', kind: CompletionItemKind.Operator, detail: '逻辑与', documentation: '逻辑与运算符' },
        { label: '并且', kind: CompletionItemKind.Operator, detail: '逻辑与', documentation: '逻辑与运算符（完整版）' },
        { label: '或', kind: CompletionItemKind.Operator, detail: '逻辑或', documentation: '逻辑或运算符' },
        { label: '或者', kind: CompletionItemKind.Operator, detail: '逻辑或', documentation: '逻辑或运算符（完整版）' },
    ];
    const filteredKeywords = keywords.filter(keyword => {
        return line.trim() === '' || keyword.label.startsWith(line.trim());
    });
    return filteredKeywords;
});
connection.onCompletionResolve(item => {
    return item;
});
connection.onDefinition((textDocumentPosition: TextDocumentPositionParams) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }
    return {
        uri: textDocumentPosition.textDocument.uri,
        range: {
            start: { line: textDocumentPosition.position.line, character: 0 },
            end: { line: textDocumentPosition.position.line, character: 10 }
        }
    };
});
connection.onHover((textDocumentPosition: TextDocumentPositionParams) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }
    const line = document.getText({
        start: { line: textDocumentPosition.position.line, character: 0 },
        end: { line: textDocumentPosition.position.line + 1, character: 0 }
    });
    return {
        contents: {
            kind: 'markdown',
            value: `**当前行内容**\n\n${line.trim()}`
        }
    };
});

connection.listen();
