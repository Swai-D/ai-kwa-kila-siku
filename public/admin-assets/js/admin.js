// Shared admin behaviour: confirm-before-delete forms and the posts table.
(function () {
  'use strict';

  function confirmDelete(title, what, note) {
    what = what || 'post';
    return Swal.fire({
      title: 'Delete this ' + what + '?',
      text: (title ? '“' + title + '” will be removed. ' : '') + (note ? note + ' ' : '') + 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      confirmButtonColor: '#dc3545',
    }).then(function (r) { return r.isConfirmed; });
  }

  document.querySelectorAll('form.js-confirm-delete').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (form.dataset.confirmed) return;
      e.preventDefault();
      confirmDelete(form.dataset.title, form.dataset.what, form.dataset.note).then(function (ok) {
        if (ok) { form.dataset.confirmed = '1'; form.submit(); }
      });
    });
  });

  var del = document.getElementById('delete-post-btn');
  if (del) {
    del.addEventListener('click', function () {
      confirmDelete(del.dataset.title, 'post', 'Both language versions will be removed.').then(function (ok) {
        if (ok) document.getElementById('delete-post-form').submit();
      });
    });
  }

  // Taxonomy form: fill the slug from the name until the user edits it.
  var tax = document.querySelector('form.js-tax-form');
  if (tax) {
    var slug = tax.querySelector('[name=slug]');
    var touched = slug.value !== '';
    var make = function (s) {
      return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    };
    slug.addEventListener('input', function () { touched = slug.value !== ''; });
    ['name_en', 'name_sw'].forEach(function (n) {
      tax.querySelector('[name=' + n + ']').addEventListener('input', function () {
        if (touched) return;
        slug.value = make(tax.querySelector('[name=name_en]').value || tax.querySelector('[name=name_sw]').value);
      });
    });
  }

  var table = document.getElementById('posts-table');
  if (table && window.jQuery && jQuery.fn.DataTable) {
    jQuery(table).DataTable({
      order: [[4, 'desc']],
      pageLength: 25,
      columnDefs: [{ targets: 'no-sort', orderable: false }],
    });
  }
})();
