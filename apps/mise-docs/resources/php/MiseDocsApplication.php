<?php

declare(strict_types=1);

namespace Mise\Docs;

use Mise\Php\ComponentRenderer;
use Mise\Php\RenderContext;

final readonly class MiseDocsApplication
{
    public function __construct(
        private Router $router,
        private DocsController $controller,
        private DocsView $view,
        private ComponentRenderer $renderer,
        private string $basePath = '/',
    ) {
    }

    public function handle(string $requestUri): RenderedResponse
    {
        $route = $this->router->match($requestUri);
        $model = $this->controller->model($route);
        $component = $this->view->component($model);
        $body = $this->renderer->render(
            $component,
            new RenderContext($model->locale, $this->basePath),
        );

        return new RenderedResponse($model->status, $body);
    }
}
