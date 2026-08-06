<?php

declare(strict_types=1);

use Mise\Docs\DocsController;
use Mise\Docs\DocsView;
use Mise\Docs\DocumentCatalog;
use Mise\Docs\DocumentComponentFactory;
use Mise\Docs\MiseDocsApplication;
use Mise\Docs\PublicPromptCatalog;
use Mise\Docs\Router;
use Mise\Php\PhpComponentRenderer;
use Mise\Php\TemplateRegistry;

require_once dirname(__DIR__) . '/vendor/mise-php/bootstrap.php';
require_once __DIR__ . '/Route.php';
require_once __DIR__ . '/Router.php';
require_once __DIR__ . '/DocumentRecord.php';
require_once __DIR__ . '/DocumentCatalog.php';
require_once __DIR__ . '/PromptRecord.php';
require_once __DIR__ . '/PublicPromptCatalog.php';
require_once __DIR__ . '/NavigationItem.php';
require_once __DIR__ . '/TableOfContentsItem.php';
require_once __DIR__ . '/TabItem.php';
require_once __DIR__ . '/DocsPageModel.php';
require_once __DIR__ . '/DocumentComponentFactory.php';
require_once __DIR__ . '/RenderedResponse.php';
require_once __DIR__ . '/DocsController.php';
require_once __DIR__ . '/DocsView.php';
require_once __DIR__ . '/MiseDocsApplication.php';

function createMiseDocsApplication(string $basePath = '/'): MiseDocsApplication
{
    $templates = new TemplateRegistry(__DIR__ . '/templates/components', [
        'ArticleDocument' => 'ArticleDocument.php',
        'CodeBlock' => 'CodeBlock.php',
        'DocumentCallout' => 'DocumentCallout.php',
        'DocumentHeading' => 'DocumentHeading.php',
        'DocumentList' => 'DocumentList.php',
        'DocumentListItem' => 'DocumentListItem.php',
        'DocumentParagraph' => 'DocumentParagraph.php',
        'DocumentTable' => 'DocumentTable.php',
        'DocumentTableCell' => 'DocumentTableCell.php',
        'DocumentTableRow' => 'DocumentTableRow.php',
        'DocsShell' => 'DocsShell.php',
        'Document' => 'Document.php',
        'InlineCode' => 'InlineCode.php',
        'InlineLink' => 'InlineLink.php',
        'InlineText' => 'InlineText.php',
        'NavLink' => 'NavLink.php',
        'NavigationSection' => 'NavigationSection.php',
        'OnPageToc' => 'OnPageToc.php',
        'PrimarySidebar' => 'PrimarySidebar.php',
        'PromptCard' => 'PromptCard.php',
        'PromptCatalog' => 'PromptCatalog.php',
        'SearchDialog' => 'SearchDialog.php',
        'SearchResult' => 'SearchResult.php',
        'SiteHeader' => 'SiteHeader.php',
        'Tabs' => 'Tabs.php',
        'ThemeSwitch' => 'ThemeSwitch.php',
        'TocLink' => 'TocLink.php',
        'WebglExample' => 'WebglExample.php',
        'WebglSurface' => 'WebglSurface.php',
    ]);

    return new MiseDocsApplication(
        new Router($basePath),
        new DocsController(
            new DocumentCatalog(dirname(__DIR__) . '/data'),
            new PublicPromptCatalog(dirname(__DIR__) . '/data'),
            $basePath,
        ),
        new DocsView(new DocumentComponentFactory()),
        new PhpComponentRenderer($templates),
        $basePath,
    );
}
