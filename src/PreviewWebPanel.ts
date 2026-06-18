import * as vscode from 'vscode';
import { basename, dirname } from './pathUtils';

let position : {x:0,y:0} = {
  x: 0,
  y: 0
};

export function previewAsyncAPI(context: vscode.ExtensionContext) {
 return async (uri: vscode.Uri) => {
    uri = uri || (await promptForAsyncapiFile()) as vscode.Uri;
    if (uri) {
      console.log('Opening asyncapi file', uri.fsPath);
      openAsyncAPI(context, uri);
    }
  };
}

export const openAsyncapiFiles: { [id: string]: vscode.WebviewPanel } = {}; // vscode.Uri.fsPath => vscode.WebviewPanel

export function isAsyncAPIFile(document?: vscode.TextDocument) {
  if (!document) {
    return false;
  }
  if (document.languageId === 'json') {
    try {
      const json = JSON.parse(document.getText());
      return json.asyncapi;
    } catch (e) {
      return false;
    }
  }
  if (document.languageId === 'yml' || document.languageId === 'yaml') {
    return document.getText().match('^asyncapi:') !== null;
  }
  return false;
}

export function openAsyncAPI(context: vscode.ExtensionContext, uri: vscode.Uri) {
  const localResourceRoots = [
    vscode.Uri.file(dirname(uri.fsPath)),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone'),
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles'),
  ];
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach(folder => {
      localResourceRoots.push(folder.uri);
    });
  }
  const panel: vscode.WebviewPanel =
    openAsyncapiFiles[uri.fsPath] ||
    vscode.window.createWebviewPanel('asyncapi-preview', '', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableFindWidget: true,
      localResourceRoots,
    });

  panel.title = basename(uri.fsPath);
  panel.webview.html = getWebviewContent(context, panel.webview, uri, position);
  panel.reveal();

  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.type) {
        case 'position':{
          position = {
            x: message.scrollX,
            y: message.scrollY
          };
          break;

        }
        case 'ready': {
          panel.reveal();
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    delete openAsyncapiFiles[uri.fsPath];
  });
  openAsyncapiFiles[uri.fsPath] = panel;
}

export async function promptForAsyncapiFile() {
  if (isAsyncAPIFile(vscode.window.activeTextEditor?.document)) {
    return vscode.window.activeTextEditor?.document.uri;
  }
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Open AsyncAPI file',
    filters: {
      asyncAPI: ['yml', 'yaml', 'json'],
    },
  });
  return uris?.[0];
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, asyncapiFile: vscode.Uri, position: {x:0,y:0}) {
  const asyncapiComponentJs = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/browser/standalone/index.js')
  );
  const asyncapiComponentCss = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist/node_modules/@asyncapi/react-component/styles/default.min.css')
  );
  const asyncapiWebviewUri = webview.asWebviewUri(asyncapiFile);
  const asyncapiBasePath = asyncapiWebviewUri.toString().replace('%2B', '+'); // this is loaded by a different library so it requires unescaping the + character

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="${asyncapiComponentCss}">
      <style>
      html{
        scroll-behavior: smooth;
      }
      body {
        color: #d4d4d4;
        background-color: #1e1e1e;
        word-wrap: break-word;
      }
      h1 {
        color: #e0e0e0;
      }

      .aui-root {
        --aui-bg: #1e1e1e;
        --aui-text: #d4d4d4;
        --aui-border: #404040;
        --aui-heading: #e0e0e0;
        --aui-heading-link: #569cd6;
        --aui-muted: #808080;
        --aui-code-bg: #2d2d2d;
        --aui-sidebar-bg: #000000;
        --aui-hover: #2a2d2e;
        --aui-card-bg: #000000;
        --aui-input-bg: #3c3c3c;
        --aui-accent: #264f78;
      }

      .aui-root,
      .aui-root .prose {
        background-color: var(--aui-bg);
        color: var(--aui-text);
      }

      .aui-root .prose h1,
      .aui-root .prose h2,
      .aui-root .prose h3,
      .aui-root .prose h4,
      .aui-root .prose h5,
      .aui-root .prose h6 {
        color: var(--aui-heading);
      }

      .aui-root .prose a {
        color: var(--aui-heading-link);
      }

      .aui-root .prose strong {
        color: var(--aui-heading);
      }

      .aui-root .prose code {
        color: #ce9178;
        background-color: var(--aui-code-bg);
      }

      .aui-root .prose pre {
        color: #d4d4d4;
        background-color: var(--aui-code-bg);
      }

      .aui-root .prose blockquote {
        color: #9cdcfe;
        border-left-color: var(--aui-border);
      }

      .aui-root .prose thead {
        color: var(--aui-heading);
        border-bottom-color: var(--aui-border);
      }

      .aui-root .prose tbody tr {
        border-bottom-color: var(--aui-border);
      }

      .aui-root .prose table,
      .aui-root .prose td,
      .aui-root .prose th,
      .aui-root .prose hr {
        border-color: var(--aui-border);
      }

      .aui-root .prose hr {
        border-top-color: var(--aui-border);
      }

      .aui-root .bg-gray-100 { background-color: var(--aui-card-bg); }
      .aui-root .bg-gray-200 { background-color: #333; }
      .aui-root .bg-gray-400 { background-color: #555; }
      .aui-root .bg-gray-600 { background-color: #666; }
      .aui-root .bg-gray-800 { background-color: #1a1a1a; }
      .aui-root .bg-blue-100 { background-color: #1e3a5f; }
      .aui-root .bg-blue-400 { background-color: var(--aui-accent); }
      .aui-root .bg-blue-500 { background-color: var(--aui-accent); }
      .aui-root .bg-blue-600 { background-color: #1e3a5f; }
      .aui-root .bg-green-600 { background-color: #1b4a1b; }
      .aui-root .bg-orange-50 { background-color: #4a2e00; }
      .aui-root .bg-orange-600 { background-color: #6b3a00; }
      .aui-root .bg-red-600 { background-color: #5a1d1d; }
      .aui-root .bg-teal-500 { background-color: #0d5e6e; }
      .aui-root .bg-yellow-600 { background-color: #5a4a00; }
      .aui-root .bg-white { background-color: var(--aui-card-bg); }

      .aui-root .text-gray-200 { color: #808080; }
      .aui-root .text-gray-700 { color: var(--aui-text); }
      .aui-root .text-gray-800 { color: var(--aui-text); }
      .aui-root .text-blue-500 { color: var(--aui-heading-link); }
      .aui-root .text-teal-500 { color: #4ec9b0; }
      .aui-root .text-orange-500 { color: #d19a66; }
      .aui-root .text-orange-600 { color: #d19a66; }
      .aui-root .text-orange-700 { color: #d19a66; }
      .aui-root .text-white { color: var(--aui-text); }

      .aui-root .border { border-color: var(--aui-border); }
      .aui-root .border-blue-300 { border-color: #1e3a5f; }
      .aui-root .border-orange-300 { border-color: #6b3a00; }
      .aui-root .border-purple-300 { border-color: #4a2e6b; }
      .aui-root .border-gray-300 { border-color: var(--aui-border); }
      .aui-root .border-solid { border-style: solid; }

      .aui-root .hover\\:bg-blue-300:hover { background-color: var(--aui-accent); }
      .aui-root .hover\\:bg-orange-300:hover { background-color: #6b3a00; }
      .aui-root .hover\\:bg-purple-300:hover { background-color: #4a2e6b; }
      .aui-root .hover\\:text-blue-600:hover { color: #569cd6; }
      .aui-root .hover\\:text-orange-600:hover { color: #d19a66; }
      .aui-root .hover\\:text-purple-600:hover { color: #c586c0; }
      .aui-root .hover\\:text-gray-900:hover { color: var(--aui-heading); }

      .aui-root .fill-current { fill: currentColor; }

      .aui-root input,
      .aui-root select,
      .aui-root textarea {
        background-color: var(--aui-input-bg);
        color: var(--aui-text);
        border-color: var(--aui-border);
      }

      .aui-root a {
        color: var(--aui-heading-link);
      }
      </style>
    </head>
    <body x-timestamp="${Date.now()}">

      <div id="asyncapi"></div>

      <script src="${asyncapiComponentJs}"></script>
      <script>
        const vscode = acquireVsCodeApi();
        AsyncApiStandalone.render({
          schema:  {
            url: '${asyncapiWebviewUri}',
            options: { method: "GET", mode: "cors" },
          },
          config: {
            show: {
              sidebar: true,
              errors: true,
            },
            parserOptions: { path: '${asyncapiBasePath}' }
          },
        }, document.getElementById('asyncapi'));

        window.addEventListener('scrollend', event => {
                vscode.postMessage({
                  type: 'position',
                  scrollX: window.scrollX || 0,
                  scrollY: window.scrollY || 0
                });
        });

        window.addEventListener("load", (event) => {
          vscode.postMessage({ type: 'ready' });
          setTimeout(()=>{
            window.focus();
            window.scrollBy('${position.x}','${position.y}')
          },1000)
        });

      </script>

    </body>
  </html>
    `;
  return html;
}
