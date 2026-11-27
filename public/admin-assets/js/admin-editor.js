// Shared by the post editor, settings and media pages: image upload + CKEditor setup.
window.AdminEditor = (function () {
  'use strict';
  var csrf = document.querySelector('meta[name="csrf-token"]').content;

  function upload(file) {
    var data = new FormData();
    data.append('file', file);
    return fetch('/admin/media/upload', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: data,
      credentials: 'same-origin',
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) throw new Error(json.error || 'Upload failed.');
        return json.url;
      });
    });
  }

  function UploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = function (loader) {
      return {
        upload: function () {
          return loader.file.then(function (file) {
            return upload(file).then(function (url) { return { default: url }; });
          });
        },
        abort: function () {},
      };
    };
  }

  // Turns every textarea.js-editor into a rich editor. Resolves with { textareaId: editor }.
  function initEditors() {
    var editors = {};
    var jobs = [].map.call(document.querySelectorAll('textarea.js-editor'), function (el) {
      return ClassicEditor.create(el, {
        extraPlugins: [UploadAdapterPlugin],
        toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
          'blockQuote', 'insertTable', 'uploadImage', '|', 'undo', 'redo'],
      }).then(function (ed) { editors[el.id] = ed; })
        .catch(function (err) { console.error(err); });
    });
    return Promise.all(jobs).then(function () { return editors; });
  }

  return { upload: upload, initEditors: initEditors };
})();
