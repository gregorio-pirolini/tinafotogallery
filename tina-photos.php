<?php
/**
 * Plugin Name: Tina Photos
 * Description: CPT + albums + shortcode gallery for Tina.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

define('TINA_PHOTOS_VER', '1.0.0');
define('TINA_PHOTOS_URL', plugin_dir_url(__FILE__));





$GLOBALS['tina_photos_assets_needed'] = false;

add_action('init', function () {

  // CPT: tina_photo
  register_post_type('tina_photo', [
    'labels' => [
      'name' => 'Tina Photos',
      'singular_name' => 'Tina Photo',
      'add_new_item' => 'Add New Tina Photo',
      'edit_item' => 'Edit Tina Photo',
    ],
    'public' => true,
    'menu_icon' => 'dashicons-format-image',
    'supports' => ['title', 'editor', 'thumbnail'],
    'has_archive' => false,
    'rewrite' => ['slug' => 'tina-photos'],
    'show_in_rest' => true,
  ]);

  // Taxonomy: tina_album
  register_taxonomy('tina_album', ['tina_photo'], [
    'labels' => [
      'name' => 'Albums',
      'singular_name' => 'Album',
    ],
    'public' => true,
    'hierarchical' => true,
    'show_in_rest' => true,
    'rewrite' => ['slug' => 'tina-album'],
  ]);
});

// Ensure featured images enabled
add_action('after_setup_theme', function () {
  add_theme_support('post-thumbnails');
}, 20);

add_shortcode('tina_gallery', function ($atts) {
  // Mark assets needed (so we only load CSS/JS when shortcode renders)
  $GLOBALS['tina_photos_assets_needed'] = true;

  $atts = shortcode_atts([
    'album' => '',       // album slug (optional)
    'per_page' => 60,
    'columns' => 4,
  ], $atts);

  $tax_query = [];
  if (!empty($atts['album'])) {
    $tax_query[] = [
      'taxonomy' => 'tina_album',
      'field'    => 'slug',
      'terms'    => sanitize_title($atts['album']),
    ];
  }

  $q = new WP_Query([
    'post_type'      => 'tina_photo',
    'posts_per_page' => intval($atts['per_page']),
    'tax_query'      => $tax_query,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'no_found_rows'  => true,
  ]);

  ob_start();

  $cols = max(2, min(6, intval($atts['columns'])));
  ?>
  <div class="tina-gallery" style="--tina-cols: <?php echo esc_attr($cols); ?>;">
    <?php while ($q->have_posts()): $q->the_post();
    $att_id = get_post_thumbnail_id(get_the_ID());
  $alt    = get_post_meta($att_id, '_wp_attachment_image_alt', true);
  $cap    = wp_get_attachment_caption($att_id);                 // caption
  $desc   = get_post_field('post_content', $att_id);            // description
      $thumb = get_the_post_thumbnail_url(get_the_ID(), 'large');
      $full  = get_the_post_thumbnail_url(get_the_ID(), 'full');
      if (!$thumb || !$full) continue;
      $title = get_the_title();
      ?>
      <a class="tina-gallery__item"
   href="<?php echo esc_url($full); ?>"
   data-tina-lightbox
   id="<?php echo esc_attr(get_the_ID()); ?>"
   data-tina-alt="<?php echo esc_attr($alt ?: $title); ?>"
   data-tina-caption="<?php echo esc_attr($cap); ?>"
   data-tina-desc="<?php echo esc_attr(wp_strip_all_tags($desc)); ?>">
  <img loading="lazy"
       src="<?php echo esc_url($thumb); ?>"
       alt="<?php echo esc_attr($alt ?: $title); ?>">
</a>
    <?php endwhile; wp_reset_postdata(); ?>
  </div>
  <?php

  return ob_get_clean();
});

add_action('wp_enqueue_scripts', function () {
  $base = plugin_dir_url(__FILE__);

  wp_enqueue_style('tina-photos', $base.'assets/pix.css', [], '1.0.0');
  wp_enqueue_script('tina-photos', $base.'assets/pix.js', [], '1.0.0', true);
});

// Add Albums column to Tina Photos list table
add_filter('manage_tina_photo_posts_columns', function ($columns) {
    $new = [];

    foreach ($columns as $key => $label) {
        $new[$key] = $label;

        // Insert Albums column after Title
        if ($key === 'title') {
            $new['tina_album'] = 'Albums';
        }
    }

    return $new;
});

// --- Admin columns: Thumbnail + Albums -----------------------------

add_filter('manage_tina_photo_posts_columns', function ($columns) {
  $new = [];

  foreach ($columns as $key => $label) {
    // Put Thumbnail first
    if ($key === 'cb') {
      $new[$key] = $label;
      $new['tina_thumb'] = 'Thumb';
      continue;
    }

    $new[$key] = $label;

    // Insert Albums right after Title
    if ($key === 'title') {
      $new['tina_album'] = 'Albums';
    }
  }

  return $new;
});

add_action('manage_tina_photo_posts_custom_column', function ($column, $post_id) {
  if ($column === 'tina_thumb') {
    $thumb = get_the_post_thumbnail($post_id, [60, 60], ['style' => 'width:60px;height:60px;object-fit:cover;border-radius:6px;']);
    echo $thumb ? $thumb : '—';
    return;
  }

  if ($column === 'tina_album') {
    $terms = get_the_terms($post_id, 'tina_album');
    if (!empty($terms) && !is_wp_error($terms)) {
      $names = wp_list_pluck($terms, 'name');
      echo esc_html(implode(', ', $names));
    } else {
      echo '—';
    }
    return;
  }
}, 10, 2);


// --- Sortable Albums column ---------------------------------------

add_filter('manage_edit-tina_photo_sortable_columns', function ($columns) {
  $columns['tina_album'] = 'tina_album';
  return $columns;
});

// Join term tables + order by album name
add_filter('posts_clauses', function ($clauses, $query) {
  global $wpdb;

  if (!is_admin() || !$query->is_main_query()) return $clauses;

  $screen = function_exists('get_current_screen') ? get_current_screen() : null;
  if (!$screen || $screen->post_type !== 'tina_photo') return $clauses;

  if ($query->get('orderby') !== 'tina_album') return $clauses;

  $clauses['join'] .= "
    LEFT JOIN {$wpdb->term_relationships} AS tr
      ON ({$wpdb->posts}.ID = tr.object_id)
    LEFT JOIN {$wpdb->term_taxonomy} AS tt
      ON (tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'tina_album')
    LEFT JOIN {$wpdb->terms} AS t
      ON (tt.term_id = t.term_id)
  ";

  // Sort by album name, then title (stable)
  $order = strtoupper($query->get('order')) === 'DESC' ? 'DESC' : 'ASC';
  $clauses['orderby'] = " t.name {$order}, {$wpdb->posts}.post_title {$order} ";

  // Avoid duplicates
  $clauses['groupby'] = "{$wpdb->posts}.ID";

  return $clauses;
}, 10, 2);

// --- Admin filter dropdown by Album -------------------------------

add_action('restrict_manage_posts', function () {
  $screen = function_exists('get_current_screen') ? get_current_screen() : null;
  if (!$screen || $screen->post_type !== 'tina_photo') return;

  $taxonomy = 'tina_album';
  $selected = isset($_GET[$taxonomy]) ? (string) $_GET[$taxonomy] : '';

  wp_dropdown_categories([
    'show_option_all' => 'All Albums',
    'taxonomy'        => $taxonomy,
    'name'            => $taxonomy,
    'orderby'         => 'name',
    'selected'        => $selected,
    'hierarchical'    => true,
    'hide_empty'      => false,
    'value_field'     => 'slug',
  ]);
});

// Apply the filter to the query
add_filter('parse_query', function ($query) {
  if (!is_admin() || !$query->is_main_query()) return;

  $screen = function_exists('get_current_screen') ? get_current_screen() : null;
  if (!$screen || $screen->post_type !== 'tina_photo') return;

  if (!empty($_GET['tina_album'])) {
    $query->set('tax_query', [[
      'taxonomy' => 'tina_album',
      'field'    => 'slug',
      'terms'    => sanitize_title((string) $_GET['tina_album']),
    ]]);
  }
});

// --- Quick/Bulk edit: Albums multi-select --------------------------

add_action('quick_edit_custom_box', function ($column_name, $post_type) {
  if ($post_type !== 'tina_photo' || $column_name !== 'tina_album') return;

  $terms = get_terms([
    'taxonomy'   => 'tina_album',
    'hide_empty' => false,
    'orderby'    => 'name',
  ]);

  ?>
  <fieldset class="inline-edit-col-right">
    <div class="inline-edit-col">
      <label class="alignleft">
        <span class="title">Albums</span>
        <select name="tina_album_terms[]" multiple style="width: 100%; max-width: 320px; height: 110px;">
          <?php foreach ($terms as $t): ?>
            <option value="<?php echo esc_attr($t->slug); ?>"><?php echo esc_html($t->name); ?></option>
          <?php endforeach; ?>
        </select>
        <span class="description">Hold Ctrl/Cmd to select multiple.</span>
      </label>
    </div>
  </fieldset>
  <?php
}, 10, 2);

add_action('bulk_edit_custom_box', function ($column_name, $post_type) {
  if ($post_type !== 'tina_photo' || $column_name !== 'tina_album') return;

  $terms = get_terms([
    'taxonomy'   => 'tina_album',
    'hide_empty' => false,
    'orderby'    => 'name',
  ]);

  ?>
  <fieldset class="inline-edit-col-right">
    <div class="inline-edit-col">
      <label class="alignleft">
        <span class="title">Albums (Bulk)</span>
        <select name="tina_album_terms[]" multiple style="width: 100%; max-width: 320px; height: 110px;">
          <?php foreach ($terms as $t): ?>
            <option value="<?php echo esc_attr($t->slug); ?>"><?php echo esc_html($t->name); ?></option>
          <?php endforeach; ?>
        </select>
        <span class="description">This will REPLACE albums for selected items.</span>
      </label>
    </div>
  </fieldset>
  <?php
}, 10, 2);

// Save from Quick Edit
add_action('save_post_tina_photo', function ($post_id) {
  if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
  if (!current_user_can('edit_post', $post_id)) return;

  if (!isset($_POST['tina_album_terms'])) return;

  $slugs = array_map('sanitize_title', (array) $_POST['tina_album_terms']);
  $slugs = array_values(array_filter(array_unique($slugs)));

  // Replace albums for this post
  wp_set_object_terms($post_id, $slugs, 'tina_album', false);
});

 // Save from Bulk Edit (AJAX)
add_action('wp_ajax_tina_photos_bulk_set_albums', function () {
  if (!current_user_can('edit_posts')) wp_send_json_error('forbidden');

  $post_ids = isset($_POST['post_ids']) ? (array) $_POST['post_ids'] : [];
  $slugs    = isset($_POST['slugs']) ? (array) $_POST['slugs'] : [];

  $post_ids = array_map('intval', $post_ids);
  $slugs    = array_values(array_filter(array_unique(array_map('sanitize_title', $slugs))));

  foreach ($post_ids as $pid) {
    if ($pid > 0) {
      wp_set_object_terms($pid, $slugs, 'tina_album', false);
    }
  }

  wp_send_json_success();
});

add_action('admin_enqueue_scripts', function ($hook) {
  // Only load on Tina Photos list page
  $screen = function_exists('get_current_screen') ? get_current_screen() : null;
  if (!$screen || $screen->post_type !== 'tina_photo' || $screen->base !== 'edit') return;

  wp_enqueue_script(
    'tina-photos-admin',
    TINA_PHOTOS_URL . 'assets/admin.js',
    [],
    TINA_PHOTOS_VER,
    true
  );
});