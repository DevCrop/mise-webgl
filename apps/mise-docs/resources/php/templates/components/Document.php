<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<!doctype html>
<html lang="<?= $escape->attribute($props->string('locale')) ?>" data-mise-controller="theme">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $escape->text($props->string('title')) ?></title>
  <link rel="icon" href="<?= $escape->attribute($url->validate($props->string('favicon'))) ?>" type="image/svg+xml">
  <link rel="stylesheet" href="<?= $escape->attribute($url->validate($props->string('webglStylesheet'))) ?>">
  <link rel="stylesheet" href="<?= $escape->attribute($url->validate($props->string('stylesheet'))) ?>">
</head>
<body class="mise-l-docs">
  <?= $renderSlot($slots['body'] ?? new \Mise\Php\Slot()) ?>
  <script type="importmap"><?= $escape->json(['imports' => [
    'mise-ui' => $url->validate($props->string('uiModule')),
    'mise-webgl' => $url->validate($props->string('webglModule')),
    'mise-webgl/three' => $url->validate($props->string('webglThreeModule')),
    'three' => $url->validate($props->string('threeModule')),
  ]]) ?></script>
  <script type="module" src="<?= $escape->attribute($url->validate($props->string('script'))) ?>"></script>
</body>
</html>
