// core/monaco-loader.js
// Monaco dynamic loader (from make_site.js)

function loadMonaco(callback) {
  if (monacoReady) { callback(); return; }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
  script.onload = function () {
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monacoReady = true;
      callback();
    });
  };
  document.head.appendChild(script);
}
