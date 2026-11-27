// Post editor: editors per language, tags select, cover upload, slug helper.
(function () {
  'use strict';
  var editors = {};
  AdminEditor.initEditors().then(function (e) { editors = e; });

  // Keep the textareas in sync before submitting.
  document.getElementById('post-form').addEventListener('submit', function () {
    Object.keys(editors).forEach(function (id) { editors[id].updateSourceElement(); });
  });

  // --- tags ---
  if (window.jQuery && jQuery.fn.select2) {
    jQuery('#tags').select2({ placeholder: 'Choose tags', closeOnSelect: false });
  }

  // --- language badges and slug auto-fill ---
  function slugify(s) {
    return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }
  document.querySelectorAll('.js-title').forEach(function (input) {
    var lang = input.dataset.lang;
    var slug = document.getElementById(lang + '_slug');
    var touched = slug.value !== '';
    slug.addEventListener('input', function () { touched = slug.value !== ''; });
    input.addEventListener('input', function () {
      if (!touched) slug.value = slugify(input.value);
      var badge = document.querySelector('.js-lang-badge[data-lang="' + lang + '"]');
      var ready = input.value.trim() !== '';
      badge.textContent = ready ? 'ready' : 'empty';
      badge.className = 'badge ms-1 js-lang-badge bg-' + (ready ? 'success' : 'secondary') + '-subtle text-' + (ready ? 'success' : 'secondary');
    });
  });

  // --- cover image ---
  var fileInput = document.getElementById('cover-file');
  var hidden = document.getElementById('cover-image-input');
  var preview = document.getElementById('cover-preview');
  var previewImg = document.getElementById('cover-preview-img');
  var status = document.getElementById('cover-status');
  function showCover(url) {
    hidden.value = url || '';
    if (url) { previewImg.src = url; preview.classList.remove('d-none'); }
    else { previewImg.removeAttribute('src'); preview.classList.add('d-none'); }
  }
  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;
    status.textContent = 'Uploading…';
    AdminEditor.upload(file).then(function (url) {
      showCover(url);
      status.textContent = 'Uploaded.';
    }).catch(function (err) {
      status.textContent = err.message;
    }).then(function () { fileInput.value = ''; });
  });
  document.getElementById('cover-remove').addEventListener('click', function () { showCover(''); });
})();
