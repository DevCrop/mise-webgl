<?php /** @var list<array<string, mixed>> $works */ ?>
<section class="home-hero" data-page-content data-scene-palette="#090b18,#304d8f,#8ef0ff">
    <p class="eyebrow" data-reveal>
        <?= escape((string) ($profile['role'] ?? 'Creative Developer')) ?>
        · <?= escape((string) ($profile['location'] ?? 'Seoul, KR')) ?>
    </p>
    <h1 class="home-hero__title" data-reveal>
        <span>Digital</span>
        <span>experiences</span>
        <span>with gravity.</span>
    </h1>
    <div class="home-hero__meta" data-reveal>
        <p><?= escape((string) ($profile['introduction'] ?? 'Selected projects and experiments.')) ?></p>
        <a href="#featured-work">Explore selected work <span aria-hidden="true">↓</span></a>
    </div>
</section>

<section id="featured-work" class="work-index" aria-labelledby="work-index-title">
    <header class="section-heading" data-reveal>
        <p class="eyebrow">Selected work</p>
        <h2 id="work-index-title">Built to be felt,<br>not just viewed.</h2>
    </header>
    <div class="work-carousel swiper" data-project-carousel>
        <ol class="work-list swiper-wrapper">
        <?php foreach ($works as $index => $work): ?>
            <li class="work-card swiper-slide" data-reveal>
                <article>
                    <span class="work-card__number"><?= str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) ?></span>
                    <h3 class="work-card__title"><?= escape((string) ($work['title'] ?? 'Untitled')) ?></h3>
                    <p class="work-card__meta">
                        <?= escape((string) ($work['category'] ?? 'Project')) ?>
                        · <?= escape((string) ($work['year'] ?? '')) ?>
                    </p>
                    <p class="work-card__summary"><?= escape((string) ($work['summary'] ?? '')) ?></p>
                </article>
            </li>
        <?php endforeach; ?>
        </ol>
        <div class="work-carousel__controls">
            <button type="button" data-swiper-prev aria-label="이전 프로젝트">←</button>
            <div data-swiper-pagination></div>
            <button type="button" data-swiper-next aria-label="다음 프로젝트">→</button>
        </div>
    </div>
</section>

<section id="contact" class="contact-section" aria-labelledby="contact-title">
    <p class="eyebrow">Contact</p>
    <h2 id="contact-title">Let’s make<br>something memorable.</h2>
    <a href="mailto:<?= escape((string) ($profile['email'] ?? 'hello@example.com')) ?>">
        <?= escape((string) ($profile['email'] ?? 'hello@example.com')) ?>
    </a>
</section>
