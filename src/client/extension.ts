import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
let client: LanguageClient;

export function activate(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };
    // 确保正确匹配.文言文件
    const clientOptions: LanguageClientOptions = {
        // 同时匹配wenyan语言ID和.文言文件扩展名
        documentSelector: [
            { scheme: 'file', language: 'wenyan' },
            { scheme: 'file', pattern: '**/*.文言' }
        ],
        // 正确配置文件同步
        synchronize: {
            // 监听所有文件变化
            fileEvents: [
                workspace.createFileSystemWatcher('**/*.文言'),
                workspace.createFileSystemWatcher('**/*.wenyan')
            ]
        },
        // 启用详细日志记录
        initializationOptions: {
            logLevel: 'verbose'
        }
    };
    client = new LanguageClient(
        'wenyan-lsp',
        '文言语言服务器',
        serverOptions,
        clientOptions
    );
    client.start();
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
