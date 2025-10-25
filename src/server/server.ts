import { createConnection, ProposedFeatures, InitializeParams, TextDocumentSyncKind, Diagnostic, DiagnosticSeverity, TextDocumentPositionParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Lexer, Parser, WenyanError } from 'tgkw';

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
            // 处理引擎特定的错误
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: {
                        line: error.line - 1 || 0,
                        character: error.column - 1 || 0
                    },
                    end: {
                        line: error.line - 1 || 0,
                        character: (error.column || 0) + 1
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
connection.onCompletion((params: TextDocumentPositionParams) => {
    // 简单的补全实现，可以扩展为更复杂的补全逻辑
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    
    const line = document.getText({ start: { line: params.position.line, character: 0 }, end: params.position });
    
    // 关键词补全示例
    const keywords = ['夫', '且', '或', '若', '否则', '为是', '循环', '复行', '止', '返', '注：'];
    
    return keywords
        .filter(kw => kw.startsWith(line.trim()))
        .map(kw => ({
            label: kw,
            kind: 13, // 关键词类型
            insertText: kw,
            insertTextFormat: 1
        }));
});

// 启动连接
connection.listen();