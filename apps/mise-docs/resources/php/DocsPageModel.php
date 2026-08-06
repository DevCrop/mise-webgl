<?php

declare(strict_types=1);

namespace Mise\Docs;

final readonly class DocsPageModel
{
    /** @param list<NavigationItem> $navigation */
    /** @param list<PromptRecord> $prompts */
    /** @param list<array<string, mixed>> $content */
    /** @param list<TableOfContentsItem> $tableOfContents */
    public function __construct(
        public string $documentId,
        public string $locale,
        public string $title,
        public string $summary,
        public int $status,
        public array $navigation,
        public array $prompts,
        public array $content,
        public array $tableOfContents,
        public string $homeUrl,
        public string $stylesheetUrl,
        public string $scriptUrl,
        public string $uiModuleUrl,
        public string $webglModuleUrl,
        public string $webglThreeModuleUrl,
        public string $threeModuleUrl,
        public string $webglStylesheetUrl,
        public string $faviconUrl,
    ) {
    }
}
