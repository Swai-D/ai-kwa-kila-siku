// Settings page: rich editors for the About pages and image pickers.
(function () {
  'use strict';
  var editors = {};
  AdminEditor.initEditors().then(function (e) { editors = e; });
  document.getElementById('settings-form').addEventListener('submit', function () {
    Object.keys(editors).forEach(function (id) { editors[id].updateSourceElement(); });
  });

  document.querySelectorAll('.js-image-field').forEach(function (box) {
    var file = box.querySelector('.js-image-file');
    var value = box.querySelector('.js-image-value');
    var img = box.querySelector('.js-image-preview');
    var status = box.querySelector('.js-image-status');
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      status.textContent = 'Uploading…';
      AdminEditor.upload(file.files[0]).then(function (url) {
        value.value = url; img.src = url; status.textContent = 'Uploaded. Save settings to apply.';
      }).catch(function (err) { status.textContent = err.message; })
        .then(function () { file.value = ''; });
    });
  });
})();
