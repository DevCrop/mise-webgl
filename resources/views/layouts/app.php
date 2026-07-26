<?php
/** @var array{scripts: list<string>, styles: list<string>} $assets */
/** @var array<string, mixed> $profile */
/** @var list<array<string, mixed>> $works */
?>
<!doctype html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#070910">
    <meta name="description" content="WebGL과 모션으로 작업과 실험을 보여주는 개인 포트폴리오.">
    <meta name="app-log-level" content="warning">
    <link rel="icon" href="data:,">
    <title><?= $title ?></title>
    <?php foreach ($assets['styles'] as $styleUrl): ?>
        <link rel="stylesheet" href="<?= escape($styleUrl) ?>">
    <?php endforeach; ?>
</head>
<body>
    <canvas id="webgl-canvas" class="webgl-canvas" aria-hidden="true"></canvas>
    <div data-barba="wrapper">
        <div class="site-shell" data-barba="container" data-barba-namespace="home">
            <?php require PROJECT_ROOT . '/resources/views/components/header.php'; ?>
            <main id="top" class="site-main" data-page="<?= escape($pageId) ?>">
                <?php require PROJECT_ROOT . '/resources/views/pages/home.php'; ?>
            </main>
        </div>
    </div>
    <p class="webgl-fallback" role="status">그래픽 가속을 사용할 수 없어 정적 화면으로 표시합니다.</p>
    <?php foreach ($assets['scripts'] as $scriptUrl): ?>
        <script type="module" src="<?= escape($scriptUrl) ?>"></script>
    <?php endforeach; ?>
</body>
</html>
