<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<section class="mise-c-copy" data-mise-component="code-block" data-mise-controller="copy">
  <button class="mise-c-button mise-c-button--quiet mise-c-js-control" type="button" data-mise-copy-button>
    <span data-mise-copy-default>복사</span>
    <span data-mise-copy-success>복사됨</span>
  </button>
  <pre class="mise-c-code-block"><code data-mise-copy-source><?= $escape->text($props->string('code')) ?></code></pre>
</section>
