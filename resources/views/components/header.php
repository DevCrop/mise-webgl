<header class="site-header" data-header>
    <a class="site-brand" href="#top" aria-label="포트폴리오 홈">
        <span>Personal</span><span>Portfolio</span>
    </a>
    <nav class="site-nav" aria-label="주요 메뉴">
        <a href="#top" aria-current="page">Index</a>
        <a href="#featured-work">Selected work</a>
        <a href="#contact">Contact</a>
    </nav>
    <span class="site-status"><i aria-hidden="true"></i><?= escape((string) ($profile['availability'] ?? 'Available')) ?></span>
</header>
