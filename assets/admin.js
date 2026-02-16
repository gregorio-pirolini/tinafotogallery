(function () {
  // Bulk Edit: grab selected post IDs and album selections, send via AJAX
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("#bulk_edit");
    if (!btn) return;

    const bulkRow = document.querySelector("#bulk-edit");
    if (!bulkRow) return;

    const select = bulkRow.querySelector('select[name="tina_album_terms[]"]');
    if (!select) return;

    const slugs = Array.from(select.selectedOptions).map(o => o.value);

    // Selected post IDs are stored in hidden inputs in the bulk edit row
    const ids = Array.from(bulkRow.querySelectorAll('input[name="post[]"]')).map(i => i.value);

    if (!ids.length) return;

    const data = new FormData();
    data.append("action", "tina_photos_bulk_set_albums");
    ids.forEach(id => data.append("post_ids[]", id));
    slugs.forEach(s => data.append("slugs[]", s));

    fetch(ajaxurl, { method: "POST", body: data })
      .then(r => r.json())
      .then(() => {
        // reload to show updated column
        window.location.reload();
      })
      .catch(() => window.location.reload());
  });
})();
