// Small blog behaviours: "copy link" share button.
(function () {
	'use strict';
	document.querySelectorAll('.js-copy-link').forEach(function (btn) {
		btn.addEventListener('click', function () {
			var url = btn.dataset.url, label = btn.textContent;
			function done() {
				btn.textContent = btn.dataset.done;
				setTimeout(function () { btn.textContent = label; }, 1500);
			}
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(url).then(done, function () { window.prompt('', url); });
			} else {
				window.prompt('', url);
			}
		});
	});
})();
