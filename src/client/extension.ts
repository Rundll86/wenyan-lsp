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
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'wenyan' }],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher('**/.文言')
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
