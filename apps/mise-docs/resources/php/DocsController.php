<?php

declare(strict_types=1);

namespace Mise\Docs;

final class DocsController
{
    public function __construct(
        private readonly DocumentCatalog $catalog,
        private readonly PublicPromptCatalog $prompts,
        private readonly string $basePath = '/',
    )
    {
    }

    public function model(Route $route): DocsPageModel
    {
        $record = $route->name === 'document'
            ? $this->catalog->findByRoute($route->path)
            : null;
        $navigation = [];
        foreach ($this->catalog->records() as $item) {
            $navigation[] = new NavigationItem(
                $item->title,
                $this->url($item->route),
                $item->section,
                $record?->id === $item->id,
            );
        }
        if ($record !== null) {
            return new DocsPageModel(
                $record->id,
                $record->locale,
                $record->title,
                $record->description,
                $route->status,
                $navigation,
                $this->prompts->records(),
                $record->content,
                $record->tableOfContents,
                $this->url('/ko'),
                $this->url('/assets/MiseUi.css'),
                $this->url('/assets/DocsClient.js'),
                $this->url('/assets/mise-ui/Index.js'),
                $this->url('/assets/mise-webgl/Index.js'),
                $this->url('/assets/mise-webgl/Three.js'),
                $this->url('/assets/vendor/three.module.js'),
                $this->url('/assets/mise-webgl/Mise.css'),
                $this->url('/assets/favicon.svg'),
            );
        }
        if ($route->name === 'error') {
            return new DocsPageModel(
                'mise.docs.error',
                $route->locale,
                '잘못된 요청',
                '요청 경로를 처리할 수 없습니다.',
                $route->status,
                $navigation,
                $this->prompts->records(),
                [],
                [],
                $this->url('/ko'),
                $this->url('/assets/MiseUi.css'),
                $this->url('/assets/DocsClient.js'),
                $this->url('/assets/mise-ui/Index.js'),
                $this->url('/assets/mise-webgl/Index.js'),
                $this->url('/assets/mise-webgl/Three.js'),
                $this->url('/assets/vendor/three.module.js'),
                $this->url('/assets/mise-webgl/Mise.css'),
                $this->url('/assets/favicon.svg'),
            );
        }

        return new DocsPageModel(
            'mise.docs.not-found',
            $route->locale,
            '문서를 찾을 수 없습니다',
            '요청한 문서가 아직 생성되지 않았습니다.',
            404,
            $navigation,
            $this->prompts->records(),
            [],
            [],
            $this->url('/ko'),
            $this->url('/assets/MiseUi.css'),
            $this->url('/assets/DocsClient.js'),
            $this->url('/assets/mise-ui/Index.js'),
            $this->url('/assets/mise-webgl/Index.js'),
            $this->url('/assets/mise-webgl/Three.js'),
            $this->url('/assets/vendor/three.module.js'),
            $this->url('/assets/mise-webgl/Mise.css'),
            $this->url('/assets/favicon.svg'),
        );
    }

    private function url(string $path): string
    {
        $base = rtrim($this->basePath, '/');

        return ($base === '' ? '' : $base) . $path;
    }
}
