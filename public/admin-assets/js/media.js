// Media library: multi-file upload and "copy URL" buttons.
(function () {
  'use strict';
  var input = document.getElementById('media-files');
  var status = document.getElementById('media-status');
  input.addEventListener('change', function () {
    var files = [].slice.call(input.files);
    if (!files.length) return;
    var done = 0, failed = [];
    status.textContent = 'Uploading 0/' + files.length + '…';
    files.reduce(function (chain, f) {
      return chain.then(function () {
        return AdminEditor.upload(f).catch(function (e) { failed.push(f.name + ': ' + e.message); })
          .then(function () { status.textContent = 'Uploading ' + (++done) + '/' + files.length + '…'; });
      });
    }, Promise.resolve()).then(function () {
      if (failed.length) { status.textContent = failed.join(' | '); input.value = ''; if (failed.length < files.length) setTimeout(function () { location.reload(); }, 2500); }
      else location.reload();
    });
  });

  document.querySelectorAll('.js-copy-url').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = location.origin + btn.dataset.url;
      var done = function () { var t = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = t; }, 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this URL', url); });
      else window.prompt('Copy this URL', url);
    });
  });
})();
