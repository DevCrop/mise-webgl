<?php

declare(strict_types=1);

namespace Mise\Docs;

use Mise\Php\Component;
use Mise\Php\GenericComponent;
use Mise\Php\Props;
use Mise\Php\Slot;

final class DocsView
{
    public function __construct(private readonly DocumentComponentFactory $documents)
    {
    }

    public function component(DocsPageModel $model): Component
    {
        /** @var array<string, Slot> $navigationBySection */
        $navigationBySection = [];
        $searchResults = new Slot();
        foreach ($model->navigation as $item) {
            $section = $navigationBySection[$item->section] ?? new Slot();
            $navigationBySection[$item->section] = $section->component(new GenericComponent(
                'NavLink',
                new Props([
                    'label' => $item->label,
                    'href' => $item->href,
                    'current' => $item->current,
                ]),
            ));
            $searchResults = $searchResults->component(new GenericComponent(
                'SearchResult',
                new Props([
                    'label' => $item->label,
                    'href' => $item->href,
                    'searchText' => $item->label,
                ]),
            ));
        }
        $navigation = new Slot();
        foreach ($navigationBySection as $section => $items) {
            $navigation = $navigation->component(new GenericComponent(
                'NavigationSection',
                new Props(['label' => $this->sectionLabel($section)]),
                ['items' => $items],
            ));
        }
        foreach ($model->prompts as $prompt) {
            $searchResults = $searchResults->component(new GenericComponent(
                'SearchResult',
                new Props([
                    'label' => $prompt->title,
                    'href' => $this->promptUrl($model, $prompt),
                    'searchText' => $prompt->title . ' ' . $prompt->summary . ' ' . implode(' ', $prompt->tags),
                ]),
            ));
        }
        $controls = (new Slot())
            ->component(new GenericComponent('SearchDialog', new Props(), [
                'results' => $searchResults,
            ]))
            ->component(new GenericComponent('ThemeSwitch'));
        $header = new GenericComponent('SiteHeader', new Props([
            'brand' => 'MISE',
            'homeUrl' => $model->homeUrl,
            'componentsUrl' => $model->homeUrl . '/components',
        ]), ['controls' => $controls]);
        $sidebar = new GenericComponent(
            'PrimarySidebar',
            new Props(['label' => '문서 탐색']),
            ['items' => $navigation],
        );
        $article = new GenericComponent('ArticleDocument', new Props([
            'title' => $model->title,
            'summary' => $model->summary,
            'status' => $model->status === 200 ? 'Documentation' : 'Error',
        ]), [
            'content' => $this->articleContent($model),
        ]);
        $tocItems = new Slot();
        foreach ($model->tableOfContents as $item) {
            $tocItems = $tocItems->component(new GenericComponent('TocLink', new Props([
                'href' => '#' . $item->id,
                'label' => $item->label,
                'nested' => $item->level === 3,
            ])));
        }
        $toc = new GenericComponent('OnPageToc', new Props([
            'label' => '이 페이지의 내용',
            'heading' => $model->title,
        ]), ['items' => $tocItems]);
        $shell = new GenericComponent('DocsShell', new Props(), [
            'header' => (new Slot())->component($header),
            'sidebar' => (new Slot())->component($sidebar),
            'article' => (new Slot())->component($article),
            'toc' => (new Slot())->component($toc),
        ]);

        return new GenericComponent('Document', new Props([
            'locale' => $model->locale,
            'title' => $model->title,
            'stylesheet' => $model->stylesheetUrl,
            'script' => $model->scriptUrl,
            'uiModule' => $model->uiModuleUrl,
            'webglModule' => $model->webglModuleUrl,
            'webglThreeModule' => $model->webglThreeModuleUrl,
            'threeModule' => $model->threeModuleUrl,
            'webglStylesheet' => $model->webglStylesheetUrl,
            'favicon' => $model->faviconUrl,
        ]), ['body' => (new Slot())->component($shell)]);
    }

    private function articleContent(DocsPageModel $model): Slot
    {
        $content = $this->documents->slot($model->content, $model->homeUrl);
        if ($model->documentId === 'mise.docs.webgl-api') {
            $surface = new GenericComponent('WebglSurface', new Props([
                'fallback' => 'WebGL을 사용할 수 없습니다. HTML 문서와 탐색은 계속 사용할 수 있습니다.',
            ]));
            $content = $content->component(new GenericComponent('WebglExample', new Props([
                'title' => 'WebGL lifecycle example',
                'description' => '이 예제는 현재 public API와 동일한 Surface, Scene, FrameLoop와 ResourceScope를 사용합니다.',
            ]), [
                'surface' => (new Slot())->component($surface),
            ]));
        }
        if ($model->documentId !== 'mise.docs.prompt-catalog') {
            return $content;
        }
        $items = new Slot();
        foreach ($model->prompts as $prompt) {
            $items = $items->component(new GenericComponent('PromptCard', new Props([
                'id' => 'prompt-' . $prompt->id,
                'title' => $prompt->title,
                'summary' => $prompt->summary,
                'status' => $prompt->status,
                'version' => (string) $prompt->version,
                'evidence' => $prompt->lastVerified,
            ]), [
                'copy' => (new Slot())->component(new GenericComponent('CodeBlock', new Props([
                    'code' => $prompt->copyText,
                ]))),
            ]));
        }

        return $content->component(new GenericComponent('PromptCatalog', new Props([
            'title' => 'Public Prompt',
        ]), ['items' => $items]));
    }

    private function promptUrl(DocsPageModel $model, PromptRecord $prompt): string
    {
        return rtrim($model->homeUrl, '/') . substr($prompt->route, strlen('/ko'));
    }

    private function sectionLabel(string $section): string
    {
        return match ($section) {
            'foundation' => 'Foundation',
            'webgl' => 'WebGL',
            'prompts' => 'Prompt',
            'reference' => 'Reference',
            'guides' => 'Guides',
            default => 'Documentation',
        };
    }
}
