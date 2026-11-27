// Shared admin behaviour: confirm-before-delete forms and the posts table.
(function () {
  'use strict';

  function confirmDelete(title) {
    return Swal.fire({
      title: 'Delete this post?',
      text: title ? '“' + title + '” will be removed in both languages. This cannot be undone.' : 'This cannot be undone.',
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
      confirmDelete(form.dataset.title).then(function (ok) {
        if (ok) { form.dataset.confirmed = '1'; form.submit(); }
      });
    });
  });

  var del = document.getElementById('delete-post-btn');
  if (del) {
    del.addEventListener('click', function () {
      confirmDelete(del.dataset.title).then(function (ok) {
        if (ok) document.getElementById('delete-post-form').submit();
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
