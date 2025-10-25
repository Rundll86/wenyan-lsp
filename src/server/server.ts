import { createConnection, ProposedFeatures, InitializeParams, TextDocumentSyncKind, Diagnostic, DiagnosticSeverity, TextDocumentPositionParams, CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Lexer, Parser } from '../engine/src';
import { WenyanError } from '../engine/src/engine/common/exceptions';

// 创建连接
const connection = createConnection(ProposedFeatures.all);

// 用于存储文档
const documents = new Map<string, TextDocument>();

connection.onInitialize((params: InitializeParams) => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // 错误诊断
            publishDiagnostics: {
                relatedInformation: true
            },
            // 代码补全
            completionProvider: {
                resolveProvider: true
            },
            // 跳转到定义
            definitionProvider: true,
            // 悬停提示
            hoverProvider: true
        }
    };
});

// 处理文档打开
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

// 处理文档变更
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

// 处理文档关闭
connection.onDidCloseTextDocument((params) => {
    documents.delete(params.textDocument.uri);
    connection.sendDiagnostics({
        uri: params.textDocument.uri,
        diagnostics: []
    });
});

// 验证文档并发布诊断
function validateDocument(document: TextDocument): void {
    const text = document.getText();
    const diagnostics: Diagnostic[] = [];

    try {
        // 使用引擎的词法分析器
        const lexer = new Lexer(text);
        const tokens = lexer.tokenize();

        // 使用引擎的语法分析器
        const parser = new Parser(tokens);
        parser.parse();
    } catch (error: any) {
        if (error instanceof WenyanError) {
            // 从错误消息中提取位置信息或使用默认位置

            // 尝试从错误消息中匹配行号和列号
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
            // 处理其他错误
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

    // 发送诊断结果
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
}

// 处理代码补全请求
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return [];
    }

    // 获取当前行的文本，用于上下文感知的补全
    const line = document.getText({
        start: { line: textDocumentPosition.position.line, character: 0 },
        end: { line: textDocumentPosition.position.line, character: textDocumentPosition.position.character }
    });

    // 文言关键词补全列表（基于engine目录中的实际实现）
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

// 处理代码补全详情请求
connection.onCompletionResolve(item => {
    // 可以在这里提供更详细的补全信息
    return item;
});

// 处理跳转定义请求
connection.onDefinition((textDocumentPosition: TextDocumentPositionParams) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }

    // 这里可以实现变量定义的查找逻辑
    // 简单示例：返回当前位置作为定义位置
    return {
        uri: textDocumentPosition.textDocument.uri,
        range: {
            start: { line: textDocumentPosition.position.line, character: 0 },
            end: { line: textDocumentPosition.position.line, character: 10 }
        }
    };
});

// 处理悬停提示请求
connection.onHover((textDocumentPosition: TextDocumentPositionParams) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }

    // 简单示例：返回当前行的文本作为悬停提示
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

// 启动连接
connection.listen();